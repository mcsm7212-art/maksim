import 'server-only';
import { cache } from 'react';
import { getMe } from './auth';
import { isLive } from './supabase/config';
import { supabaseServer } from './supabase/server';

export type CommentView = { id: number; userId: string; name: string; slug: string | null; body: string; createdAt: string };
export type PostTag = 'work' | 'tip' | 'question' | 'partner';
export const POST_TAGS: Record<PostTag, string> = { work: 'Finished work', tip: 'Tip', question: 'Question', partner: 'Looking for a partner' };
export type PostView = { id: string; body: string; photos: string[]; createdAt: string; likes: number; liked: boolean; comments: CommentView[]; tag: PostTag; pinned: boolean; audience: 'public' | 'friends';
  pro: { id: string; slug: string; name: string; photoUrl: string | null; accent: string; trade: string; license: string | null } };
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
const POST_SELECT = 'id, body, photos, created_at, tag, pinned, audience, pro:pros(id, slug, display_name, photo_url, accent, trade, license_no, license_status, company:companies(license_no, status)), post_likes(user_id), post_comments(id, user_id, author_name, author_slug, body, created_at)';
function mapPosts(rows: any[], meId: string | null): PostView[] {
  return rows.filter((r) => r.pro).map((r) => ({
    id: r.id, body: r.body, photos: r.photos ?? [], createdAt: r.created_at, tag: (r.tag ?? 'work') as PostTag, pinned: Boolean(r.pinned), audience: r.audience === 'friends' ? 'friends' : 'public',
    likes: (r.post_likes ?? []).length, liked: Boolean(meId && (r.post_likes ?? []).some((l: any) => l.user_id === meId)),
    comments: (r.post_comments ?? []).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)).map((c: any) => ({ id: c.id, userId: c.user_id, name: c.author_name, slug: c.author_slug, body: c.body, createdAt: c.created_at })),
    pro: { id: r.pro.id, slug: r.pro.slug, name: r.pro.display_name, photoUrl: r.pro.photo_url, accent: r.pro.accent ?? '#B57A50', trade: r.pro.trade,
      license: r.pro.license_status === 'verified' && r.pro.license_no ? r.pro.license_no : r.pro.company?.status === 'verified' ? r.pro.company.license_no ?? null : null },
  }));
}

export async function postsOf(proId: string, limit = 6): Promise<PostView[]> {
  if (!isLive()) return [];
  const me = await getMe();
  const { data } = await (await supabaseServer()).from('posts').select(POST_SELECT).eq('pro_id', proId).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  return mapPosts(data ?? [], me?.id ?? null);
}

/** Feed: posts from pros the user saved (following), or the newest posts from everyone (discover). */
export async function feed(kind: 'following' | 'discover', limit = 30, tag?: string | null): Promise<PostView[]> {
  if (!isLive()) return [];
  const me = await getMe();
  const sb = await supabaseServer();
  let q = sb.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(limit);
  if (tag && tag in POST_TAGS) q = q.eq('tag', tag);
  if (kind === 'following') {
    const ids = [...(await mySaves()).entries()].filter(([, s]) => s === 'saved').map(([id]) => id);
    if (!ids.length) return [];
    q = q.in('pro_id', ids);
  }
  const { data } = await q;
  return mapPosts(data ?? [], me?.id ?? null);
}

export async function postById(id: string): Promise<PostView | null> {
  if (!isLive() || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const me = await getMe();
  const { data } = await (await supabaseServer()).from('posts').select(POST_SELECT).eq('id', id).maybeSingle();
  return data ? mapPosts([data], me?.id ?? null)[0] ?? null : null;
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

export type Friend = { id: string; slug: string; name: string; trade: string; customTrade: string | null; photoUrl: string | null; accent: string; area: string | null; online: boolean; kind: 'friend' | 'incoming' | 'outgoing' };
/** My pro friends (mutual), requests to me, and my requests that are not answered yet. */
export async function myFriends(): Promise<Friend[]> {
  if (!isLive()) return [];
  const sb = await supabaseServer();
  const { data: rel } = await sb.rpc('my_friends');
  const kinds = new Map<string, Friend['kind']>(((rel ?? []) as any[]).map((r) => [r.pro_id, r.kind]));
  if (!kinds.size) return [];
  const { data } = await sb.from('pros').select('id, slug, display_name, trade, custom_trade, photo_url, accent, area, online_until').in('id', [...kinds.keys()]);
  return (data ?? []).map((p: any) => ({ id: p.id, slug: p.slug, name: p.display_name, trade: p.trade, customTrade: p.custom_trade ?? null, photoUrl: p.photo_url, accent: p.accent ?? '#B57A50', area: p.area ?? null,
    online: Boolean(p.online_until && new Date(p.online_until) > new Date()), kind: kinds.get(p.id)! }))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
}
/** The friends feed: my posts and my friends' posts (public and friends-only; the database hides what I may not see). */
export async function friendsFeed(ids: string[], limit = 40): Promise<PostView[]> {
  if (!isLive() || !ids.length) return [];
  const me = await getMe();
  const { data } = await (await supabaseServer()).from('posts').select(POST_SELECT).in('pro_id', ids).order('created_at', { ascending: false }).limit(limit);
  return mapPosts(data ?? [], me?.id ?? null);
}
