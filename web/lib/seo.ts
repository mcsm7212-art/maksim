import { CITIES } from './areas';

/** Public address used in links for Google and social previews. */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://novafides.pro').replace(/\/$/, '');
export const citySlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const cityBySlug = (slug: string) => CITIES.find((c) => citySlug(c.name) === slug) ?? null;
/** Pages that are private or personal: never in Google. */
export const PRIVATE = ['/account', '/admin', '/messages', '/orders', '/book', '/my-home', '/my-pros', '/api', '/invoice', '/business',
  '/login', '/auth', '/demo', '/compare', '/projects/new', '/lounge', '/neighbors', '/invite', '/lang', '/social'];
