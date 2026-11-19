'use server';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { getLang } from '@/lib/i18n';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { recognizePhoto, visionEnabled } from '@/lib/vision';
import { affiliateOn, identifyPart, shopLinks, type Candidate } from '@/lib/parts';
import { listPros } from '@/lib/data';

export type PhotoSearchState = { error?: string; services?: string[]; summary?: string; urgent?: boolean; safety?: string } | undefined;

const okPhoto = (b64: unknown) => typeof b64 === 'string' && b64.length >= 1000 && b64.length <= 1_600_000 && /^[A-Za-z0-9+/=]+$/.test(b64);
async function quotaOk() {
  if (!isLive()) return true;
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
  const who = createHash('sha256').update(`nf-photo:${ip}`).digest('hex').slice(0, 32);
  const { data: ok } = await (await supabaseServer()).rpc('photo_search_quota', { who, per_day: 30 });
  return ok !== false;
}

/** The browser sends the photo already shrunk to a small JPEG (base64). It is not stored anywhere. */
export async function searchByPhoto(jpegBase64: string): Promise<PhotoSearchState> {
  if (!visionEnabled()) return { error: 'Photo search is not switched on yet. Describe the problem in words instead.' };
  if (!okPhoto(jpegBase64)) return { error: 'Could not read this photo. Try another one.' };
  if (!(await quotaOk())) return { error: 'You reached today’s limit. Try again tomorrow.' };
  const r = await recognizePhoto(jpegBase64, await getLang());
  if (!r) return { error: 'Photo search is busy right now. Describe the problem in words instead.' };
  if (r.kind !== 'home_job' || !r.services.length) return { error: r.kind === 'unclear' ? 'We could not tell what this is. Try a closer, brighter photo, or describe it in words.' : 'This does not look like a home repair. Try another photo.' };
  return { services: r.services, summary: r.summary, urgent: r.urgent, safety: r.safety };
}

type ProLite = { slug: string; name: string; photoUrl: string | null; accent: string; trade: string };
export type PartSearchState = {
  error?: string; summary?: string; partType?: string; brand?: string; markings?: string[]; tip?: string; candidates?: Candidate[];
  links?: { query: string; shops: { name: string; url: string; sponsored: boolean }[] }[]; affiliate?: boolean;
  installers?: (ProLite & { times: number; partNo: string | null; partName: string; photo: string | null; exact: boolean })[];
  servicePros?: (ProLite & { jobs: number })[];
} | undefined;

/** "Find this part": identify the part, find exact part numbers, shopping links, and pros who installed it. */
export async function findPart(jpegBase64: string): Promise<PartSearchState> {
  if (!visionEnabled()) return { error: 'Photo search is not switched on yet. Describe the problem in words instead.' };
  if (!okPhoto(jpegBase64)) return { error: 'Could not read this photo. Try another one.' };
  if (!(await quotaOk())) return { error: 'You reached today’s limit. Try again tomorrow.' };
  const r = await identifyPart(jpegBase64, await getLang());
  if (!r) return { error: 'Photo search is busy right now. Describe the problem in words instead.' };
  if (!r.is_part) return { error: 'We could not tell what this is. Try a closer, brighter photo, or describe it in words.' };
  const queries = [...new Set([...r.candidates.map((c) => `${r.brand} ${c.partNo} ${c.name}`.trim()), ...r.queries])].slice(0, 3);
  const pros = await listPros();
  const lite = (p: (typeof pros)[number]): ProLite => ({ slug: p.slug, name: p.name, photoUrl: p.photoUrl, accent: p.accent, trade: p.trade });
  let installers: NonNullable<PartSearchState>['installers'] = [];
  if (isLive()) {
    const { data } = await (await supabaseServer()).rpc('parts_lookup', { part_nos: [...r.candidates.map((c) => c.partNo), ...r.markings], brand: r.brand || null, words: r.part_type });
    installers = (data ?? []).flatMap((x: { pro_id: string; times: number; part_no: string | null; name: string; photo_url: string | null; exact: boolean }) => {
      const p = pros.find((q) => q.id === x.pro_id); return p ? [{ ...lite(p), times: Number(x.times), partNo: x.part_no, partName: x.name, photo: x.photo_url, exact: x.exact }] : [];
    });
  }
  const servicePros = pros.filter((p) => p.accepting && !installers!.some((i) => i.slug === p.slug) && p.services.some((s) => r.services.includes(s.id)))
    .map((p) => ({ ...lite(p), jobs: p.services.filter((s) => r.services.includes(s.id)).reduce((n, s) => n + s.jobs, 0) }))
    .sort((a, b) => b.jobs - a.jobs).slice(0, 8);
  return { summary: r.summary, partType: r.part_type, brand: r.brand, markings: r.markings, tip: r.tip, candidates: r.candidates,
    links: queries.map((q) => ({ query: q, shops: shopLinks(q) })), affiliate: affiliateOn(), installers, servicePros };
}
