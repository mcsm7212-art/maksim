// Service catalog, shared by the server and the browser. Source: data/services.json (copied by scripts/sync-catalog.mjs).
import raw from './services.json';
import esRaw from './services-es.json';
import { rank } from './search';

export type Trade = 'plumbing' | 'electrical' | 'handyman' | 'construction';
export type Tier = 'economy' | 'standard' | 'premium';

export interface Service {
  id: string; trade: Trade; group: string; groupRu: string; groupEs: string; name: string; ru: string; es: string;
  lo: number; hi: number; unit: string; permit: boolean; emergency: boolean; handymanOk: boolean;
}

type Item = [string, string, number, number, string?, string?];
interface Raw {
  meta: { tiers: Record<Tier, { name: string; ru: string; multiplier: number }> };
  trades: { id: Trade; name: string; ru: string; license: string; groups: { name: string; ru: string; items: Item[] }[] }[];
}
const CAT = raw as unknown as Raw;
const ES = esRaw as { groups: Record<string, string>; services: Record<string, string> };

// Must match scripts/gen-seed.mjs so ids line up with the database.
export const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const SERVICES: Service[] = [];
{
  const seen = new Set<string>();
  for (const t of CAT.trades) for (const g of t.groups) for (const [name, ru, lo, hi, unit, flags = ''] of g.items) {
    let id = slugify(name); if (seen.has(id)) id = `${t.id}-${id}`; seen.add(id);
    SERVICES.push({ id, trade: t.id, group: g.name, groupRu: g.ru, groupEs: ES.groups[g.name] ?? g.name, name, ru, es: ES.services[name] ?? name, lo, hi, unit: unit || 'job',
      permit: flags.includes('P'), emergency: flags.includes('E'), handymanOk: flags.includes('H') });
  }
}
export const serviceById = (id: string) => SERVICES.find((s) => s.id === id);
export const GROUPS = CAT.trades.map((t) => ({ trade: t.id, groups: t.groups.map((g) => g.name) }));

export const TIERS: Record<Tier, { name: string; multiplier: number; blurb: string }> = {
  economy: { name: 'Economy', multiplier: CAT.meta.tiers.economy.multiplier, blurb: 'Newer licensed pro, solid work, best price.' },
  standard: { name: 'Standard', multiplier: CAT.meta.tiers.standard.multiplier, blurb: 'Experienced pro, shoe covers, tidy cleanup.' },
  premium: { name: 'Premium', multiplier: CAT.meta.tiers.premium.multiplier, blurb: 'Top-rated pro, clean uniform, floor protection, full cleanup, photo report.' },
};
export const TIER_KEYS: Tier[] = ['economy', 'standard', 'premium'];

export const TRADES: Record<Trade, { name: string; license: string; icon: string; blurb: string }> = {
  plumbing: { name: 'Plumbing', license: 'C-36', icon: 'drop', blurb: 'Leaks, drains, water heaters, toilets, gas lines.' },
  electrical: { name: 'Electrical', license: 'C-10', icon: 'bolt', blurb: 'Outlets, panels, lighting, EV chargers.' },
  handyman: { name: 'Handyman', license: '', icon: 'tool', blurb: 'Mounting, assembly, drywall, doors. Jobs under $1,000.' },
  construction: { name: 'Construction', license: 'B', icon: 'build', blurb: 'Remodels, additions, ADUs, decks, foundations.' },
};

export const roundPrice = (n: number) => (n < 200 ? Math.round(n / 5) * 5 : n < 2000 ? Math.round(n / 10) * 10 : Math.round(n / 50) * 50);
export const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
export const marketMid = (s: Service) => (s.lo + s.hi) / 2;
/** California: a CSLB license is needed when the job (labor + materials) is $1,000 or more, or needs a permit. Uses the pro's own price; the market average if none is set. */
export const licenseNeeded = (s: Service, price?: number | null) => s.permit || (price && price > 0 ? price : marketMid(s)) >= 1000;


export function searchServices(query: string, trade?: Trade | null, limit = 8): Service[] {
  return rank(SERVICES.filter((s) => !trade || s.trade === trade), query).slice(0, limit).map((h) => h.s);
}
export function searchRanked(query: string, trade?: Trade | null, limit = 8) {
  return rank(SERVICES.filter((s) => !trade || s.trade === trade), query).slice(0, limit);
}
