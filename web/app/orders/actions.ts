'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { LINE_KINDS, PROBLEM_KINDS, type QuoteLine } from '@/lib/orders';

type S = { error?: string; ok?: string } | undefined;
const DEMO = 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.';
const str = (f: FormData, k: string, max = 1000) => String(f.get(k) ?? '').trim().slice(0, max);
async function who(next: string) { const me = await getMe(); if (!me) redirect(`/login?next=${encodeURIComponent(next)}`); return { me, sb: await supabaseServer() }; }
const nice = (m: string) => {
  if (m.includes('not picked a time')) return 'The client has not picked a time yet.';
  if (m.includes('no longer open')) return 'This quote is no longer open.';
  if (m.includes('expired')) return 'This quote has expired. Ask the pro for a new one.';
  if (m.includes('bookings_no_double')) return 'That time was just taken. Please pick another.';
  if (m.includes('pro not accepting')) return 'This pro is not taking new jobs right now.';
  if (m.includes('address')) return 'Please enter the job address.';
  if (m.includes('problem limit')) return 'You reached today’s limit. Try again tomorrow.';
  return 'Something went wrong. Please try again.';
};

/** Pro sends a quote in a chat (or a new version for an existing job). */
export async function sendQuote(_p: S, f: FormData): Promise<S> {
  if (!isLive()) return { error: DEMO };
  const conv = str(f, 'conv');
  const { sb } = await who(`/messages/${conv}`);
  const kinds = f.getAll('kind').map(String), labels = f.getAll('label').map(String), amounts = f.getAll('amount').map(String);
  const lines: QuoteLine[] = kinds.map((k, i) => ({ kind: (k in LINE_KINDS ? k : 'other') as QuoteLine['kind'], label: (labels[i] ?? '').trim().slice(0, 80), amount: Math.round(Number(String(amounts[i] ?? '').replace(/[^\d.]/g, '')) * 100) / 100 }))
    .filter((l) => l.label && l.amount >= 0 && Number.isFinite(l.amount));
  if (!lines.length) return { error: 'Add at least one line with a price.' };
  const title = str(f, 'title', 120);
  if (title.length < 3) return { error: 'Name the job in a few words.' };
  const until = str(f, 'valid_until');
  const { data: qid, error } = await sb.rpc('send_quote', { conv, title, lines, includes: str(f, 'includes') || null, notes: str(f, 'notes') || null,
    valid_until: /^\d{4}-\d{2}-\d{2}$/.test(until) ? until : null, service: str(f, 'service') || null, booking: str(f, 'booking') || null });
  if (error) return { error: error.message.includes('total below zero') ? 'The discount is bigger than the total.' : error.message.includes('license needed') ? 'Without a CSLB license you can only quote jobs under $1,000 in total (labor and materials). Lower the total or add your license in “Edit profile”.' : nice(error.message) };
  const dur = str(f, 'duration', 60);
  if (qid && dur) { const { error: e2 } = await sb.rpc('set_quote_duration', { q_id: qid, d: dur }); if (e2) return { error: 'Quote sent, but the time was not saved: write it in English, please.' }; }
  revalidatePath(`/messages/${conv}`); if (str(f, 'booking')) revalidatePath(`/orders/${str(f, 'booking')}`);
  return { ok: 'Quote sent.' };
}

export async function acceptQuote(f: FormData) {
  const { sb } = await who('/messages');
  const { data, error } = await sb.rpc('accept_quote', { q_id: str(f, 'id') });
  if (error) redirect(`/messages/${str(f, 'conv')}?q=${encodeURIComponent(nice(error.message))}`);
  revalidatePath('/orders'); revalidatePath('/account');
  redirect(`/orders/${data}`);
}
export async function declineQuote(f: FormData) {
  const { sb } = await who('/messages');
  await sb.rpc('decline_quote', { q_id: str(f, 'id') });
  revalidatePath(`/messages/${str(f, 'conv')}`);
}
export async function withdrawQuote(f: FormData) {
  const { sb } = await who('/messages');
  await sb.rpc('withdraw_quote', { q_id: str(f, 'id') });
  revalidatePath(`/messages/${str(f, 'conv')}`);
}

export async function pickTime(_p: S, f: FormData): Promise<S> {
  if (!isLive()) return { error: DEMO };
  const id = str(f, 'id');
  const { sb } = await who(`/orders/${id}`);
  const t = str(f, 't');
  if (!t) return { error: 'Please pick a time.' };
  const { error } = await sb.rpc('set_booking_time', { b_id: id, starts: t, addr: str(f, 'address', 200) });
  if (error) return { error: nice(error.message) };
  revalidatePath(`/orders/${id}`); revalidatePath('/orders'); revalidatePath('/account');
  return { ok: 'Time sent to the pro.' };
}

export async function orderStatus(f: FormData) {
  const id = str(f, 'id');
  const { sb } = await who(`/orders/${id}`);
  await sb.rpc('set_booking_status', { b_id: id, new_status: str(f, 'status') });
  revalidatePath(`/orders/${id}`); revalidatePath('/orders'); revalidatePath('/account');
}

export async function confirmDone(f: FormData) {
  const id = str(f, 'id');
  const { sb } = await who(`/orders/${id}`);
  await sb.rpc('confirm_done', { b_id: id });
  revalidatePath(`/orders/${id}`); revalidatePath('/orders'); revalidatePath('/account');
}

export async function reportProblem(_p: S, f: FormData): Promise<S> {
  if (!isLive()) return { error: DEMO };
  const id = str(f, 'id');
  const { me, sb } = await who(`/orders/${id}`);
  const kind = str(f, 'kind'); const body = str(f, 'body', 2000);
  if (!(kind in PROBLEM_KINDS)) return { error: 'Choose what happened.' };
  if (body.length < 5) return { error: 'Describe what happened in a few words.' };
  const { error } = await sb.from('problems').insert({ booking_id: id, reporter_id: me.id, kind, body });
  if (error) return { error: nice(error.message) };
  revalidatePath(`/orders/${id}`);
  return { ok: 'Sent. The NovaFides team will look at it and reply here.' };
}

export async function resolveProblem(f: FormData) {
  const { me, sb } = await who('/admin');
  if (me.role !== 'admin') return;
  await sb.from('problems').update({ status: 'resolved', resolution: str(f, 'resolution') || null }).eq('id', str(f, 'id'));
  revalidatePath('/admin');
}
