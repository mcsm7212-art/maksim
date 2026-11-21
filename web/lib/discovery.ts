import { isLive } from './supabase/config';
import { supabaseServer } from './supabase/server';

/** Pros that clients with picks like mine also like: pro id → number of such clients (3+ only). */
export async function similarPicks(trade?: string | null, lim = 12): Promise<Map<string, number>> {
  if (!isLive()) return new Map();
  const { data } = await (await supabaseServer()).rpc('similar_picks', { t: trade ?? null, lim });
  return new Map(((data ?? []) as { pro_id: string; n: number }[]).map((r) => [r.pro_id, Number(r.n)]));
}
/** On a pro's page: other pros that the same clients chose (3+ clients). */
export async function alsoChosen(proId: string, lim = 6): Promise<Map<string, number>> {
  if (!isLive()) return new Map();
  const { data } = await (await supabaseServer()).rpc('also_chosen', { p: proId, lim });
  return new Map(((data ?? []) as { pro_id: string; n: number }[]).map((r) => [r.pro_id, Number(r.n)]));
}

export const SORTS = ['best', 'rating', 'near', 'similar', 'soon', 'price', 'fast', 'jobs'] as const;
export type Sort = (typeof SORTS)[number];
export const FILTERS = ['today', 'tomorrow', 'weekend', 'urgent', 'lic', 'id', 'ins', 'solo', 'co', 'r45', 'photos', 'mine'] as const;
export type Filter = (typeof FILTERS)[number];
