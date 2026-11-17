import 'server-only';
import { headers } from 'next/headers';

/** Public address of the site, e.g. https://novafides.vercel.app */
export async function siteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const h = await headers();
  return `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
}
/** Short address shown on cards: host + handle, without https:// */
export const shortLabel = (site: string, handle: string) => `${site.replace(/^https?:\/\//, '')}/${handle}`;
