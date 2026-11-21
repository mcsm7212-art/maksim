'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { ownPhotoUrl } from '@/lib/photos';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export type SocialState = { error?: string; ok?: string } | undefined;
async function signedIn(next = '/') {
  if (!isLive()) return null;
  const me = await getMe(); if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  return me;
}
const refresh = (...paths: string[]) => paths.forEach((p) => revalidatePath(p));

/** Save a pro to "My pros", hide them, or clear (status = ''). */
export async function setSave(proId: string, status: 'saved' | 'hidden' | '', path = '/'): Promise<SocialState> {
  const me = await signedIn(path); if (!me) return { error: 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.' };
  const sb = await supabaseServer();
  const { error } = status
    ? await sb.from('pro_saves').upsert({ user_id: me.id, pro_id: proId, status }, { onConflict: 'user_id,pro_id' })
    : await sb.from('pro_saves').delete().eq('user_id', me.id).eq('pro_id', proId);
  refresh(path, '/my-pros', '/feed', '/search');
  return error ? { error: error.message } : { ok: 'ok' };
}

export async function toggleLike(postId: string, like: boolean): Promise<SocialState> {
  const me = await signedIn('/feed'); if (!me) return { error: 'demo' };
  const sb = await supabaseServer();
  const { error } = like ? await sb.from('post_likes').insert({ post_id: postId, user_id: me.id }) : await sb.from('post_likes').delete().eq('post_id', postId).eq('user_id', me.id);
  return error && error.code !== '23505' ? { error: error.message } : { ok: 'ok' };
}

export async function toggleHelpful(reviewId: string, on: boolean, back: string): Promise<SocialState> {
  const me = await signedIn(back); if (!me) return { error: 'demo' };
  const sb = await supabaseServer();
  const { error } = on ? await sb.from('review_helpful').insert({ review_id: reviewId, user_id: me.id }) : await sb.from('review_helpful').delete().eq('review_id', reviewId).eq('user_id', me.id);
  return error && error.code !== '23505' ? { error: error.message } : { ok: 'ok' };
}

export async function createPost(_p: SocialState, f: FormData): Promise<SocialState> {
  const me = await signedIn('/feed'); if (!me) return { error: 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.' };
  if (!me.pro) return { error: 'Only pros can post.' };
  const body = String(f.get('body') ?? '').trim().slice(0, 1000);
  const photos = f.getAll('work_url').map(String).filter((u) => ownPhotoUrl(u, me.id)).slice(0, 6);
  if (!body && !photos.length) return { error: 'Add a photo or a few words about the job.' };
  const sb = await supabaseServer();
  const tag = ['work', 'tip', 'question', 'partner'].includes(String(f.get('tag'))) ? String(f.get('tag')) : 'work';
  const { error } = await sb.from('posts').insert({ pro_id: me.id, body, photos, tag });
  if (error) return { error: error.message.startsWith('post limit') ? 'You can post up to 3 times a day.' : error.message };
  refresh('/feed', `/pro/${me.pro.slug}`, `/${me.pro.slug}`);
  return { ok: 'Posted.' };
}

export async function deletePost(f: FormData) {
  const me = await signedIn('/feed'); if (!me) return;
  await (await supabaseServer()).from('posts').delete().eq('id', String(f.get('id')));
  refresh('/feed', me.pro ? `/pro/${me.pro.slug}` : '/feed');
}

export async function recommendPro(f: FormData) {
  const me = await signedIn('/'); if (!me?.pro) return;
  const sb = await supabaseServer();
  await sb.from('pro_recommendations').insert({ pro_id: me.id, colleague_id: String(f.get('colleague')), note: String(f.get('note') ?? '').trim().slice(0, 140) || null });
  refresh(String(f.get('path') ?? '/'), `/pro/${me.pro.slug}`, `/${me.pro.slug}`);
}
export async function unrecommendPro(f: FormData) {
  const me = await signedIn('/'); if (!me?.pro) return;
  await (await supabaseServer()).from('pro_recommendations').delete().eq('pro_id', me.id).eq('colleague_id', String(f.get('colleague')));
  refresh(String(f.get('path') ?? '/'), `/pro/${me.pro.slug}`, `/${me.pro.slug}`);
}

export async function addComment(_p: SocialState, f: FormData): Promise<SocialState> {
  const path = String(f.get('path') ?? '/feed');
  const me = await signedIn(path); if (!me) return { error: 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.' };
  const body = String(f.get('body') ?? '').trim().slice(0, 500);
  if (!body) return { error: 'Write a comment first.' };
  const { error } = await (await supabaseServer()).from('post_comments').insert({ post_id: String(f.get('post')), user_id: me.id, body });
  if (error) return { error: error.message.startsWith('comment limit') ? 'Too many comments today. Try again tomorrow.' : error.message };
  refresh(path, '/feed');
  return { ok: 'ok' };
}
export async function deleteComment(f: FormData) {
  const me = await signedIn('/feed'); if (!me) return;
  await (await supabaseServer()).from('post_comments').delete().eq('id', Number(f.get('id')));
  refresh(String(f.get('path') ?? '/feed'), '/feed');
}

export async function togglePin(f: FormData) {
  const me = await signedIn('/feed'); if (!me?.pro) return;
  const { error } = await (await supabaseServer()).from('posts').update({ pinned: f.get('on') === '1' }).eq('id', String(f.get('id'))).eq('pro_id', me.id);
  refresh('/feed', `/pro/${me.pro.slug}`, `/${me.pro.slug}`);
  if (error?.message.includes('pin limit')) redirect(`/pro/${me.pro.slug}?pin=limit`);
}

// "Tell me when a new verified pro joins" for a trade and city.
export async function saveSearch(f: FormData) {
  const back = String(f.get('back') ?? '/search'); const me = await signedIn(back); if (!me) return;
  const trade = String(f.get('trade') ?? '') || null; const city = String(f.get('city') ?? '').slice(0, 60) || null;
  await (await supabaseServer()).from('saved_searches').insert({ user_id: me.id, trade, city });
  revalidatePath('/search');
}
export async function unsaveSearch(f: FormData) {
  const back = String(f.get('back') ?? '/search'); const me = await signedIn(back); if (!me) return;
  const trade = String(f.get('trade') ?? '') || null; const city = String(f.get('city') ?? '').slice(0, 60) || null;
  let q = (await supabaseServer()).from('saved_searches').delete().eq('user_id', me.id);
  q = trade ? q.eq('trade', trade) : q.is('trade', null); q = city ? q.eq('city', city) : q.is('city', null);
  await q; revalidatePath('/search');
}
