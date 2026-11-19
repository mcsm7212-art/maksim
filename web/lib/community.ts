import 'server-only';
import { getMe } from './auth';
import { isLive } from './supabase/config';
import { supabaseServer } from './supabase/server';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type QuestionRow = { id: string; userId: string; name: string; trade: string | null; city: string | null; title: string; body: string; photos: string[]; bestId: number | null; createdAt: string; answers: number };
export type AnswerView = { id: number; proId: string; name: string; slug: string | null; photoUrl: string | null; accent: string; trade: string | null; body: string; createdAt: string; votes: number; voted: boolean };
export type LoungePost = { id: string; proId: string; name: string; slug: string | null; kind: 'talk' | 'help' | 'handoff'; trade: string | null; city: string | null; body: string; photos: string[]; createdAt: string;
  replies: { id: number; proId: string; name: string; slug: string | null; body: string; createdAt: string }[] };

const mapQ = (r: any): QuestionRow => ({ id: r.id, userId: r.user_id, name: r.author_name, trade: r.trade, city: r.city, title: r.title, body: r.body, photos: r.photos ?? [],
  bestId: r.best_answer_id, createdAt: r.created_at, answers: Array.isArray(r.answers) ? (r.answers[0]?.count ?? r.answers.length) : 0 });

export async function listQuestions(opts: { trade?: string | null; mine?: boolean; unanswered?: boolean } = {}, limit = 40): Promise<QuestionRow[]> {
  if (!isLive()) return [];
  const sb = await supabaseServer();
  let q = sb.from('questions').select('*, answers(count)').order('created_at', { ascending: false }).limit(limit);
  if (opts.trade) q = q.eq('trade', opts.trade);
  if (opts.mine) { const me = await getMe(); if (!me) return []; q = q.eq('user_id', me.id); }
  const rows = ((await q).data ?? []).map(mapQ);
  return opts.unanswered ? rows.filter((r) => r.answers === 0) : rows;
}

export async function getQuestion(id: string): Promise<{ q: QuestionRow; answers: AnswerView[] } | null> {
  if (!isLive() || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const sb = await supabaseServer(); const me = await getMe();
  const { data } = await sb.from('questions').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const { data: ans } = await sb.from('answers').select('*, pro:pros(slug, photo_url, accent, trade, figure_url), answer_votes(user_id)').eq('question_id', id);
  const q = mapQ({ ...data, answers: ans ?? [] });
  const answers: AnswerView[] = (ans ?? []).map((a: any) => ({ id: a.id, proId: a.pro_id, name: a.author_name, slug: a.pro?.slug ?? null, photoUrl: a.pro?.photo_url ?? null,
    accent: a.pro?.accent ?? '#B57A50', trade: a.pro?.trade ?? null, body: a.body, createdAt: a.created_at,
    votes: (a.answer_votes ?? []).length, voted: Boolean(me && (a.answer_votes ?? []).some((v: any) => v.user_id === me.id)) }))
    .sort((x: AnswerView, y: AnswerView) => Number(y.id === q.bestId) - Number(x.id === q.bestId) || y.votes - x.votes || x.createdAt.localeCompare(y.createdAt));
  return { q, answers };
}

export async function loungeFeed(kind?: string | null, limit = 40): Promise<LoungePost[]> {
  if (!isLive()) return [];
  const sb = await supabaseServer();
  let q = sb.from('lounge_posts').select('*, lounge_replies(id, pro_id, author_name, author_slug, body, created_at)').order('created_at', { ascending: false }).limit(limit);
  if (kind && ['talk', 'help', 'handoff'].includes(kind)) q = q.eq('kind', kind);
  return ((await q).data ?? []).map((r: any) => ({ id: r.id, proId: r.pro_id, name: r.author_name, slug: r.author_slug, kind: r.kind, trade: r.trade, city: r.city, body: r.body, photos: r.photos ?? [], createdAt: r.created_at,
    replies: (r.lounge_replies ?? []).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)).map((x: any) => ({ id: x.id, proId: x.pro_id, name: x.author_name, slug: x.author_slug, body: x.body, createdAt: x.created_at })) }));
}
