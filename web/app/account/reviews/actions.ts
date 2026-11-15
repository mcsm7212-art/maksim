'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { toneCheck } from '@/lib/tone';

export type ReplyState = { error?: string; ok?: string } | undefined;
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export async function replyToReview(_p: ReplyState, f: FormData): Promise<ReplyState> {
  const me = await getMe(); if (!me) redirect('/login?next=/account/reviews');
  const body = s(f, 'body');
  const tone = toneCheck(body); if (tone) return { error: tone };
  const sb = await supabaseServer();
  const { error } = await sb.from('review_replies').insert({ review_id: s(f, 'review'), author_id: me.id, body });
  if (error) return { error: error.message.startsWith('cool-off') ? 'Take a breath: you can reply 1 hour after a low rating.' : error.code === '23505' ? 'You already replied to this review.' : error.message };
  revalidatePath('/account/reviews');
  return { ok: 'Reply posted.' };
}

export async function reportReview(_p: ReplyState, f: FormData): Promise<ReplyState> {
  const me = await getMe(); if (!me) redirect('/login?next=/account/reviews');
  const reason = s(f, 'reason');
  if (!['not_a_customer', 'extortion', 'abuse', 'personal_data', 'competitor', 'other'].includes(reason)) return { error: 'Choose a reason.' };
  const sb = await supabaseServer();
  const { error } = await sb.from('review_reports').insert({ review_id: s(f, 'review'), reporter_id: me.id, reason, details: s(f, 'details').slice(0, 1000) || null });
  return error ? { error: error.message } : { ok: 'Sent to a moderator. The review stays up while it is checked.' };
}

export async function rateClient(f: FormData) {
  const me = await getMe(); if (!me) redirect('/login?next=/account');
  const n = (k: string) => Math.min(5, Math.max(1, Number(s(f, k)) || 5));
  const sb = await supabaseServer();
  await sb.from('client_ratings').insert({ booking_id: s(f, 'booking'), pro_id: me.id, client_id: s(f, 'client'), agreements: n('agreements'), access: n('access'), payment: n('payment') });
  revalidatePath('/account');
}
