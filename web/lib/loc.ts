import { cookies } from 'next/headers';
import { placeOf } from './geo';

/** Where the visitor is looking for a pro: what they typed by the search (city or ZIP), remembered in a cookie. */
export async function getLoc(override?: string | null): Promise<{ text: string; city: string | null; zip: string | null; pt: { lat: number; lng: number } | null }> {
  const text = (override ?? (await cookies()).get('nf_loc')?.value ?? '').slice(0, 40);
  let t = text; try { t = decodeURIComponent(text); } catch { /* keep raw */ }
  const p = placeOf(t);
  return { text: t, city: p?.name ?? null, zip: t.match(/\b(9\d{4})\b/)?.[1] ?? null, pt: p ? { lat: p.lat, lng: p.lng } : null };
}
