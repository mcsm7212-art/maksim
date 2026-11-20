import { cookies } from 'next/headers';
import { locCity } from './areas';

/** Where the visitor is looking for a pro: what they typed by the search (city or ZIP), remembered in a cookie. */
export async function getLoc(override?: string | null): Promise<{ text: string; city: string | null; zip: string | null }> {
  const text = (override ?? (await cookies()).get('nf_loc')?.value ?? '').slice(0, 40);
  let t = text; try { t = decodeURIComponent(text); } catch { /* keep raw */ }
  return { text: t, city: locCity(t), zip: t.match(/\b(9[45]\d{3})\b/)?.[1] ?? null };
}
