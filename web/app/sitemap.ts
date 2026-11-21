import type { MetadataRoute } from 'next';
import { CITIES } from '@/lib/areas';
import { SERVICES } from '@/lib/catalog';
import { citySlug, SITE } from '@/lib/seo';
import { isLive, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

/** Every public page for Google: main pages, services, cities, verified pros (not demo), questions. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: 'daily', priority: 1 },
    ...['/search', '/services', '/questions', '/feed', '/companies', '/online', '/rules', '/join', '/terms', '/privacy'].map((p) => ({ url: SITE + p, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...SERVICES.map((s) => ({ url: `${SITE}/services/${s.id}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...CITIES.map((c) => ({ url: `${SITE}/near/${citySlug(c.name)}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 })),
  ];
  if (isLive()) {
    // Public data only, read as an anonymous visitor (no cookies at build time).
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const [{ data: pros }, { data: qs }] = await Promise.all([
      sb.from('pros').select('slug, created_at').eq('status', 'verified').eq('is_demo', false).limit(5000),
      sb.from('questions').select('id, created_at').order('created_at', { ascending: false }).limit(1000),
    ]);
    for (const p of pros ?? []) out.push({ url: `${SITE}/${p.slug}`, lastModified: new Date(p.created_at), changeFrequency: 'weekly', priority: 0.8 });
    for (const q of qs ?? []) out.push({ url: `${SITE}/questions/${q.id}`, lastModified: new Date(q.created_at), changeFrequency: 'monthly', priority: 0.5 });
  }
  return out;
}
