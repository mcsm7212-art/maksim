import 'server-only';
import { cache } from 'react';
import { getMe } from './auth';
import { isLive } from './supabase/config';
import { supabaseServer } from './supabase/server';

export type PostView = { id: string; body: string; photos: string[]; createdAt: string; likes: number; liked: boolean;
  pro: { id: string; slug: string; name: string; photoUrl: string | null; accent: string; trade: string } };
export type Colleague = { id: string; slug: string; name: string; trade: string; photoUrl: string | null; accent: string; note: string | null };

/** The signed-in user's saved / hidden pros: pro_id → status. */
export const mySaves = cache(async (): Promise<Map<string, 'saved' | 'hidden'>> => {
  if (!isLive()) return new Map();
  const me = await getMe(); if (!me) return new Map();
  const { data } = await (await supabaseServer()).from('pro_saves').select('pro_id, status').eq('user_id', me.id);
  return new Map((data ?? []).map((r) => [r.pro_id as string, r.status as 'saved' | 'hidden']));
});

export async function saveCount(proId: string): Promise<number> {
  if (!isLive()) return 0;
  const { data } = await (await supabaseServer()).rpc('save_counts', { ids: [proId] });
  return Number(data?.[0]?.saves ?? 0);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const POST_SELECT = 'id, body, photos, created_at, pro:pros(id, slug, display_name, photo_url, accent, trade), post_likes(user_id)';
function mapPosts(rows: any[], meId: string | null): PostView[] {
  return rows.filter((r) => r.pro).map((r) => ({
    id: r.id, body: r.body, photos: r.photos ?? [], createdAt: r.created_at,
    likes: (r.post_likes ?? []).length, liked: Boolean(meId && (r.post_likes ?? []).some((l: any) => l.user_id === meId)),
    pro: { id: r.pro.id, slug: r.pro.slug, name: r.pro.display_name, photoUrl: r.pro.photo_url, accent: r.pro.accent ?? '#B57A50', trade: r.pro.trade },
  }));
}

export async function postsOf(proId: string, limit = 6): Promise<PostView[]> {
  if (!isLive()) return [];
  const me = await getMe();
  const { data } = await (await supabaseServer()).from('posts').select(POST_SELECT).eq('pro_id', proId).order('created_at', { ascending: false }).limit(limit);
  return mapPosts(data ?? [], me?.id ?? null);
}

/** Feed: posts from pros the user saved (following), or the newest posts from everyone (discover). */
export async function feed(kind: 'following' | 'discover', limit = 30): Promise<PostView[]> {
  if (!isLive()) return [];
  const me = await getMe();
  const sb = await supabaseServer();
  let q = sb.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(limit);
  if (kind === 'following') {
    const ids = [...(await mySaves()).entries()].filter(([, s]) => s === 'saved').map(([id]) => id);
    if (!ids.length) return [];
    q = q.in('pro_id', ids);
  }
  const { data } = await q;
  return mapPosts(data ?? [], me?.id ?? null);
}

export async function colleaguesOf(proId: string): Promise<Colleague[]> {
  if (!isLive()) return [];
  const { data } = await (await supabaseServer()).from('pro_recommendations')
    .select('note, colleague:pros!pro_recommendations_colleague_id_fkey(id, slug, display_name, trade, photo_url, accent, status)')
    .eq('pro_id', proId).order('created_at');
  return (data ?? []).filter((r: any) => r.colleague && r.colleague.status === 'verified').map((r: any) => ({
    id: r.colleague.id, slug: r.colleague.slug, name: r.colleague.display_name, trade: r.colleague.trade,
    photoUrl: r.colleague.photo_url, accent: r.colleague.accent ?? '#B57A50', note: r.note,
  }));
}

export async function popularIds(lim = 6): Promise<string[]> {
  if (!isLive()) return [];
  const { data } = await (await supabaseServer()).rpc('popular_pros', { lim });
  return (data ?? []).map((r: any) => r.pro_id);
}
