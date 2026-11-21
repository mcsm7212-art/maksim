import type { Trade } from './catalog';

/** What usually changes the price, by trade (general guidance, shown on service pages). */
export const PRICE_FACTORS: Record<Trade, string[]> = {
  plumbing: ['How easy it is to reach the pipes (open cabinet, wall, floor or crawl space)', 'Parts: who supplies them and which brand', 'Age and material of the old pipes', 'Same-day, evening or weekend visits', 'Permit and inspection, when the city requires them'],
  electrical: ['Distance from the panel and how the wires can be run (attic, wall, crawl space)', 'Whether the panel has room and enough capacity', 'Permit and inspection, when the city requires them', 'Fixtures or devices supplied by you or by the pro', 'Wall and ceiling repair after the work'],
  handyman: ['Time on site and number of items', 'Wall type and height (drywall, plaster, brick, tall ceilings)', 'Materials and hardware', 'Haul-away of old items', 'Larger jobs ($1,000+ or with a permit) need a licensed contractor'],
  construction: ['Size, layout and finishes you choose', 'Plans, engineering and permits', 'Structural changes (walls, beams, foundation)', 'Site access and haul-away', 'Schedule and how many trades are involved'],
};
export const TRADE_LICENSE_NOTE: Record<Trade, string> = {
  plumbing: 'In California, plumbing work over $1,000 (labor and materials) needs a CSLB C-36 license.',
  electrical: 'In California, electrical work over $1,000 (labor and materials) needs a CSLB C-10 license.',
  handyman: 'Without a contractor license, a person may only take jobs under $1,000 total, with no building permit and no hired workers.',
  construction: 'In California, building work over $1,000 needs a CSLB license (usually B, general building).',
};
