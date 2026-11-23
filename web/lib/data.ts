// Read model for public pages. Uses Supabase when keys are set, otherwise the demo data.
import 'server-only';
import { cache } from 'react';
import { showDemo } from './demo-view';
import { serviceById, type Tier, type Trade } from './catalog';
import { atPacific, pacificParts } from './time';
import { accentFromUniform, baseFor } from './colors';
import { DEMO_COMPANIES, DEMO_PROS } from './demo';
import { isLive } from './supabase/config';
import { supabaseServer } from './supabase/server';
import type { Base, Company, Pro, Review } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function mapCompany(c: Row): Company {
  return {
    id: c.id, slug: c.slug, name: c.name, trade: c.trade, accent: c.accent, base: c.base_theme as Base,
    city: c.city ?? '', license: c.license_no, since: c.since_year, warrantyMonths: c.warranty_months ?? 0,
    about: c.about ?? '', logoUrl: c.logo_url, rating: null, reviewCount: 0,
  };
}

const PRO_SELECT = `*, company:companies(*), pro_photos(id, url, caption, kind, created_at, public), pro_services(service_id, price, jobs_count, active), availability_rules(weekday, start_time, end_time),
  reviews(id, author_name, created_at, service_id, tier, punctuality, workmanship, cleanliness, communication, pricing, body, resolved, weight, weight_reason, helpful_count, review_replies(body))`;

function mapPro(p: Row, stats?: Row): Pro {
  const company = p.company ? mapCompany(p.company) : null;
  const accent = company ? company.accent : p.accent || accentFromUniform(p.uniform_color);
  const reviews: Review[] = (p.reviews ?? []).map((r: Row) => ({
    id: r.id, who: r.author_name, date: r.created_at, service: serviceById(r.service_id)?.name ?? 'Service', tier: r.tier as Tier,
    scores: { punctuality: r.punctuality, workmanship: r.workmanship, cleanliness: r.cleanliness, communication: r.communication, pricing: r.pricing },
    text: r.body ?? '', reply: (Array.isArray(r.review_replies) ? r.review_replies[0]?.body : r.review_replies?.body) ?? null, resolved: r.resolved,
    weight: r.weight != null ? Number(r.weight) : 1, why: r.weight_reason ?? null, helpful: Number(r.helpful_count ?? 0),
  })).sort((a: Review, b: Review) => b.date.localeCompare(a.date));
  const s = stats;
  return {
    id: p.id, slug: p.slug, name: p.display_name, company, trade: p.trade as Trade, customTrade: p.custom_trade ?? null, tiers: p.tiers, years: p.years_exp ?? 0,
    area: p.area ?? '', bio: p.bio ?? '', experience: p.experience ?? '', skillTags: p.skills ?? [],
    photos: (p.pro_photos ?? []).filter((x: Row) => x.kind === 'portfolio' || x.public).sort((a: Row, b: Row) => b.created_at.localeCompare(a.created_at)).map((x: Row) => ({ id: x.id, url: x.url, caption: x.caption })), languages: p.languages ?? [], license: company?.license ?? p.license_no,
    verified: { license: p.license_status === 'verified', id: p.id_verified, insured: p.insured },
    checkedAt: { license: p.license_checked_at ?? null, id: p.id_checked_at ?? null, insured: p.insurance_checked_at ?? null },
    photoUrl: p.photo_url, figureUrl: p.figure_url ?? null, uniform: p.uniform_color, accent, base: company ? company.base : baseFor(accent),
    online: Boolean(!p.is_demo && p.online_until && new Date(p.online_until) > new Date()), onlineArea: p.online_area ?? null,
    isDemo: Boolean(p.is_demo),
    accepting: !p.is_demo && ((p.accepting !== false) || Boolean(p.paused_until && p.paused_until <= new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }))), pausedUntil: p.paused_until ?? null,
    urgent: Boolean(!p.is_demo && p.urgent_ok && (p.accepting !== false) && p.online_until && new Date(p.online_until) > new Date()), urgentFee: p.urgent_fee != null ? Number(p.urgent_fee) : null, founding: p.founding_pro !== false, responseMin: p.response_minutes, tripFee: Number(p.trip_fee ?? 95), publicPhone: p.public_phone ?? null, callHours: p.call_hours ?? null,
    serviceArea: p.base_lat != null && p.base_lng != null ? { lat: Number(p.base_lat), lng: Number(p.base_lng), radius: Number(p.service_radius_mi ?? 15), polygon: Array.isArray(p.service_polygon) ? p.service_polygon : null } : null,
    rating: s?.rating != null ? Number(s.rating) : null, reviewCount: Number(s?.reviews ?? 0), rankScore: s?.rank_score != null ? Number(s.rank_score) : null, jobs: Number(s?.jobs ?? 0),
    skills: s?.rating != null ? {
      punctuality: s.punctuality / 20, workmanship: s.workmanship / 20, cleanliness: s.cleanliness / 20, communication: s.communication / 20, pricing: s.pricing / 20,
    } : null,
    services: (p.pro_services ?? []).filter((x: Row) => x.active !== false).map((x: Row) => ({ id: x.service_id, jobs: x.jobs_count, price: x.price != null ? Number(x.price) : null }))
      .sort((a: { jobs: number }, b: { jobs: number }) => b.jobs - a.jobs),
    reviews,
    availability: (p.availability_rules ?? []).map((a: Row) => ({ weekday: a.weekday, start: a.start_time.slice(0, 5), end: a.end_time.slice(0, 5) })),
    busy: [],
  };
}

async function statsFor(ids: string[]) {
  if (!ids.length) return new Map<string, Row>();
  const sb = await supabaseServer();
  const { data } = await sb.from('pro_stats').select('*').in('pro_id', ids);
  return new Map((data ?? []).map((r) => [r.pro_id as string, r]));
}

export const listPros = cache(async (opts: { trade?: Trade | null; serviceId?: string | null; tier?: Tier | null; companySlug?: string } = {}): Promise<Pro[]> => {
  let pros: Pro[];
  if (!isLive()) pros = DEMO_PROS;
  else {
    const sb = await supabaseServer();
    let q = sb.from('pros').select(PRO_SELECT).eq('status', 'verified');
    if (opts.trade) q = q.eq('trade', opts.trade);
    const { data, error } = await q.limit(200);
    if (error) throw error;
    const stats = await statsFor((data ?? []).map((p) => p.id));
    pros = (data ?? []).map((p) => mapPro(p, stats.get(p.id)));
    if (!(await showDemo())) pros = pros.filter((p) => !p.isDemo);
  }
  return pros.filter((p) =>
    (!opts.trade || p.trade === opts.trade) &&
    (!opts.serviceId || p.services.some((s) => s.id === opts.serviceId)) &&
    (!opts.tier || p.tiers.includes(opts.tier)) &&
    (!opts.companySlug || p.company?.slug === opts.companySlug));
});

/** Short address → current handle of the pro (old handles still resolve), or null. */
export const resolveHandle = cache(async (handle: string): Promise<string | null> => {
  const h = handle.toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(h)) return null;
  if (!isLive()) return DEMO_PROS.some((p) => p.slug === h) ? h : null;
  const sb = await supabaseServer();
  const { data: cur } = await sb.from('pros').select('slug').eq('slug', h).maybeSingle();
  if (cur) return cur.slug;
  const { data: old } = await sb.from('pro_handles').select('pro:pros(slug)').eq('handle', h).maybeSingle();
  return (old as { pro?: { slug?: string } } | null)?.pro?.slug ?? null;
});

export const getPro = cache(async (slug: string): Promise<Pro | null> => {
  if (!isLive()) return DEMO_PROS.find((p) => p.slug === slug) ?? null;
  const sb = await supabaseServer();
  const { data } = await sb.from('pros').select(PRO_SELECT).eq('slug', slug).maybeSingle();
  if (!data) return null;
  const stats = await statsFor([data.id]);
  const pro = mapPro(data, stats.get(data.id));
  const { data: busy } = await sb.rpc('pro_busy_ranges', { p_id: data.id });
  pro.busy = (busy ?? []).map((b: Row) => ({ start: b.starts_at, end: b.ends_at }));
  return pro;
});

export const listCompanies = cache(async (): Promise<Company[]> => {
  if (!isLive()) return DEMO_COMPANIES;
  const sb = await supabaseServer();
  const { data } = await sb.from('companies').select('*').eq('status', 'verified');
  return (data ?? []).map(mapCompany);
});

export const getCompany = cache(async (slug: string): Promise<Company | null> => {
  if (!isLive()) return DEMO_COMPANIES.find((c) => c.slug === slug) ?? null;
  const sb = await supabaseServer();
  const { data } = await sb.from('companies').select('*').eq('slug', slug).maybeSingle();
  if (!data) return null;
  const c = mapCompany(data);
  const team = await listPros({ companySlug: slug });
  const rated = team.filter((t) => t.rating != null);
  c.reviewCount = rated.reduce((n, t) => n + t.reviewCount, 0);
  c.rating = c.reviewCount ? Math.round((rated.reduce((n, t) => n + (t.rating ?? 0) * t.reviewCount, 0) / c.reviewCount) * 100) / 100 : null;
  return c;
});

/** Open 2-hour slots for the next 7 days (Pacific time), minus booked times. */
export function openSlots(pro: Pro, days = 7): string[] {
  const out: string[] = [];
  if (!pro.accepting) return out; // paused: no open times
  const now = Date.now();
  const busy = pro.busy.map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()] as const);
  const taken = (s: number) => busy.some(([a, z]) => s < z && s + 2 * 36e5 > a); // 2-hour visit overlaps a busy range
  const seed = pro.slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const today = pacificParts(new Date());
  for (let d = 0; d < days; d++) {
    const noon = atPacific(today.y, today.m, today.d + d, 12);
    const wd = pacificParts(noon).weekday;
    for (const rule of pro.availability.filter((a) => a.weekday === wd)) {
      const sh = Number(rule.start.slice(0, 2)); const eh = Number(rule.end.slice(0, 2));
      for (let h = sh; h + 2 <= eh; h += 2) {
        const ms = atPacific(today.y, today.m, today.d + d, h).getTime();
        if (ms < now + 36e5 || taken(ms)) continue;
        if (!isLive() && (seed + d * 7 + h) % 5 < 2) continue; // demo: make schedules look real
        out.push(new Date(ms).toISOString());
      }
    }
  }
  return out;
}
