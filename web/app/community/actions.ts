'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { ownPhotoUrl } from '@/lib/photos';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

type S = { error?: string; ok?: string } | undefined;
const DEMO = 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.';
const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
const TRADES = ['plumbing', 'electrical', 'handyman'];
async function who(next: string) { if (!isLive()) return null; const me = await getMe(); if (!me) redirect(`/login?next=${encodeURIComponent(next)}`); return me; }
const limitMsg = (m: string) => (/limit/.test(m) ? 'You reached today’s limit. Try again tomorrow.' : m);

export async function askQuestion(_p: S, f: FormData): Promise<S> {
  const me = await who('/questions'); if (!me) return { error: DEMO };
  const title = str(f, 'title', 140), body = str(f, 'body');
  if (title.length < 5) return { error: 'Write your question in a few words.' };
  const trade = TRADES.includes(str(f, 'trade')) ? str(f, 'trade') : null;
  const photos = f.getAll('q_photo').map(String).filter((u) => ownPhotoUrl(u, me.id)).slice(0, 4);
  const { data, error } = await (await supabaseServer()).from('questions').insert({ user_id: me.id, title, body, trade, city: str(f, 'city', 60) || null, photos }).select('id').single();
  if (error) return { error: limitMsg(error.message) };
  revalidatePath('/questions');
  redirect(`/questions/${data.id}`);
}

export async function deleteQuestion(f: FormData) {
  const me = await who('/questions'); if (!me) return;
  await (await supabaseServer()).from('questions').delete().eq('id', str(f, 'id'));
  revalidatePath('/questions'); redirect('/questions');
}

export async function answerQuestion(_p: S, f: FormData): Promise<S> {
  const q = str(f, 'question');
  const me = await who(`/questions/${q}`); if (!me) return { error: DEMO };
  if (!me.pro || me.pro.status !== 'verified') return { error: 'Only verified pros can answer.' };
  const body = str(f, 'body');
  if (body.length < 2) return { error: 'Write your answer first.' };
  const { error } = await (await supabaseServer()).from('answers').insert({ question_id: q, pro_id: me.id, body });
  if (error) return { error: error.code === '23505' ? 'You already answered this question.' : limitMsg(error.message) };
  revalidatePath(`/questions/${q}`); revalidatePath('/questions');
  return { ok: 'ok' };
}

export async function deleteAnswer(f: FormData) {
  const me = await who('/questions'); if (!me) return;
  await (await supabaseServer()).from('answers').delete().eq('id', Number(f.get('id')));
  revalidatePath(`/questions/${str(f, 'question')}`);
}

export async function voteAnswer(f: FormData) {
  const q = str(f, 'question');
  const me = await who(`/questions/${q}`); if (!me) return;
  const sb = await supabaseServer(); const id = Number(f.get('id'));
  if (f.get('on') === '1') await sb.from('answer_votes').insert({ answer_id: id, user_id: me.id });
  else await sb.from('answer_votes').delete().eq('answer_id', id).eq('user_id', me.id);
  revalidatePath(`/questions/${q}`);
}

export async function markBest(f: FormData) {
  const q = str(f, 'question');
  const me = await who(`/questions/${q}`); if (!me) return;
  const a = str(f, 'id');
  await (await supabaseServer()).rpc('mark_best', { q, a: a ? Number(a) : null });
  revalidatePath(`/questions/${q}`);
}

export async function loungePost(_p: S, f: FormData): Promise<S> {
  const me = await who('/lounge'); if (!me) return { error: DEMO };
  if (!me.pro || me.pro.status !== 'verified') return { error: 'The Lounge is for verified pros.' };
  const body = str(f, 'body', 1500);
  if (body.length < 2) return { error: 'Write a few words first.' };
  const kind = ['talk', 'help', 'handoff'].includes(str(f, 'kind')) ? str(f, 'kind') : 'talk';
  const photos = f.getAll('l_photo').map(String).filter((u) => ownPhotoUrl(u, me.id)).slice(0, 4);
  const trade = TRADES.includes(str(f, 'trade')) ? str(f, 'trade') : null;
  const { error } = await (await supabaseServer()).from('lounge_posts').insert({ pro_id: me.id, kind, body, photos, trade, city: str(f, 'city', 60) || null });
  if (error) return { error: limitMsg(error.message) };
  revalidatePath('/lounge');
  return { ok: 'Posted.' };
}

export async function loungeReply(_p: S, f: FormData): Promise<S> {
  const me = await who('/lounge'); if (!me) return { error: DEMO };
  if (!me.pro || me.pro.status !== 'verified') return { error: 'The Lounge is for verified pros.' };
  const body = str(f, 'body', 1000);
  if (!body) return { error: 'Write a few words first.' };
  const { error } = await (await supabaseServer()).from('lounge_replies').insert({ post_id: str(f, 'post'), pro_id: me.id, body });
  if (error) return { error: limitMsg(error.message) };
  revalidatePath('/lounge');
  return { ok: 'ok' };
}

export async function loungeDelete(f: FormData) {
  const me = await who('/lounge'); if (!me) return;
  const sb = await supabaseServer();
  if (f.get('reply')) await sb.from('lounge_replies').delete().eq('id', Number(f.get('reply')));
  else await sb.from('lounge_posts').delete().eq('id', str(f, 'id'));
  revalidatePath('/lounge');
}
