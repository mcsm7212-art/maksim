// Review sites a pro can link to. Links only: NovaFides never copies ratings or reviews from these sites.
export const EXT_SITES = [
  { key: 'yelp', name: 'Yelp', re: /^https:\/\/(www\.|m\.)?yelp\.com\/biz\/\S+$/i, hint: 'https://www.yelp.com/biz/your-business' },
  { key: 'google', name: 'Google', re: /^https:\/\/(www\.google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl|g\.page|g\.co|share\.google)\/\S+$/i, hint: 'https://maps.app.goo.gl/…' },
  { key: 'thumbtack', name: 'Thumbtack', re: /^https:\/\/(www\.)?thumbtack\.com\/\S+$/i, hint: 'https://www.thumbtack.com/ca/…/service/…' },
  { key: 'nextdoor', name: 'Nextdoor', re: /^https:\/\/(www\.)?nextdoor\.com\/pages\/\S+$/i, hint: 'https://nextdoor.com/pages/your-business' },
  { key: 'angi', name: 'Angi', re: /^https:\/\/(www\.)?angi\.com\/\S+$/i, hint: 'https://www.angi.com/companylist/…' },
] as const;
/** Reads the review-site links from a form (fields named prefix + site key). Returns the links or which site has a wrong link. */
export function readExtLinks(f: FormData, prefix = ''): { links: Record<string, string>; bad?: string } {
  const links: Record<string, string> = {};
  for (const site of EXT_SITES) {
    const v = String(f.get(prefix + site.key) ?? '').trim().split('?')[0].slice(0, 400);
    if (!v) continue;
    if (!site.re.test(v)) return { links, bad: site.name };
    links[site.key] = v;
  }
  return { links };
}
export type ExtLinks = Partial<Record<(typeof EXT_SITES)[number]['key'], string>>;
export const extList = (l: ExtLinks | null | undefined) => EXT_SITES.filter((s) => l?.[s.key]).map((s) => ({ ...s, url: l![s.key]! }));
