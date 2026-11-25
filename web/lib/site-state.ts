import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { isLive, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase/config';

/**
 * When a section appears in the menu. An empty section tells a visitor "nobody is here", so each one
 * shows up only when there is something in it. The pages themselves always open by their address.
 * Change the numbers here, in one place.
 */
export const THRESHOLDS = {
  questionsMenu: 5, // verified pros ready to answer
  feedMenu: 20,     // posts in "Work & tips"
  onlineMenu: 1,    // pros online right now
};

export type SiteState = { pros: number; posts: number; online: number; show: { questions: boolean; feed: boolean; online: boolean } };

const load = unstable_cache(async (): Promise<Omit<SiteState, 'show'>> => {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const head = { count: 'exact' as const, head: true };
  const [a, b, c] = await Promise.all([
    sb.from('pros').select('id', head).eq('status', 'verified').eq('is_demo', false),
    sb.from('posts').select('id', head).eq('audience', 'public'),
    sb.from('pros').select('id', head).eq('status', 'verified').eq('is_demo', false).gt('online_until', new Date().toISOString()),
  ]);
  return { pros: a.count ?? 0, posts: b.count ?? 0, online: c.count ?? 0 };
}, ['site-state'], { revalidate: 60 });

/** Public counts for the menu (refreshed about once a minute). In demo mode everything is shown. */
export async function siteState(): Promise<SiteState> {
  if (!isLive()) return { pros: 99, posts: 99, online: 9, show: { questions: true, feed: true, online: true } };
  let s = { pros: 0, posts: 0, online: 0 };
  try { s = await load(); } catch { /* counts are a nicety: on an error keep the menu short */ }
  return { ...s, show: { questions: s.pros >= THRESHOLDS.questionsMenu, feed: s.posts >= THRESHOLDS.feedMenu, online: s.online >= THRESHOLDS.onlineMenu } };
}
