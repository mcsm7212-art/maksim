'use server';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { getLang } from '@/lib/i18n';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { recognizePhoto, visionEnabled } from '@/lib/vision';

export type PhotoSearchState = { error?: string; services?: string[]; summary?: string; urgent?: boolean; safety?: string } | undefined;

/** The browser sends the photo already shrunk to a small JPEG (base64). It is not stored anywhere. */
export async function searchByPhoto(jpegBase64: string): Promise<PhotoSearchState> {
  if (!visionEnabled()) return { error: 'Photo search is not switched on yet. Describe the problem in words instead.' };
  if (typeof jpegBase64 !== 'string' || jpegBase64.length < 1000 || jpegBase64.length > 1_600_000 || !/^[A-Za-z0-9+/=]+$/.test(jpegBase64))
    return { error: 'Could not read this photo. Try another one.' };
  if (isLive()) {
    const h = await headers();
    const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
    const who = createHash('sha256').update(`nf-photo:${ip}`).digest('hex').slice(0, 32);
    const { data: ok } = await (await supabaseServer()).rpc('photo_search_quota', { who, per_day: 30 });
    if (ok === false) return { error: 'You reached today’s limit. Try again tomorrow.' };
  }
  const r = await recognizePhoto(jpegBase64, await getLang());
  if (!r) return { error: 'Photo search is busy right now. Describe the problem in words instead.' };
  if (r.kind !== 'home_job' || !r.services.length) return { error: r.kind === 'unclear' ? 'We could not tell what this is. Try a closer, brighter photo, or describe it in words.' : 'This does not look like a home repair. Try another photo.' };
  return { services: r.services, summary: r.summary, urgent: r.urgent, safety: r.safety };
}
