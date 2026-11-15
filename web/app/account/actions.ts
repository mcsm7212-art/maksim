'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

const s = (f: FormData, k: string) => String(f.get(k) ?? '');
async function need() { const me = await getMe(); if (!me) redirect('/login?next=/account'); return { me, sb: await supabaseServer() }; }

export async function answerSwap(f: FormData) {
  const { sb } = await need();
  await sb.rpc('answer_swap', { b_id: s(f, 'id'), accept: s(f, 'accept') === '1' });
  revalidatePath('/account');
}
export async function setStatus(f: FormData) {
  const { sb } = await need();
  await sb.rpc('set_booking_status', { b_id: s(f, 'id'), new_status: s(f, 'status') });
  revalidatePath('/account'); revalidatePath('/business');
}
export async function setOnline(f: FormData) {
  const { sb } = await need();
  await sb.rpc('set_online', { hours: Number(s(f, 'hours')) || 0 });
  revalidatePath('/account');
}
export async function markRead() {
  const { me, sb } = await need();
  await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', me.id).is('read_at', null);
  revalidatePath('/account');
}
export async function submitReview(f: FormData) {
  const { me, sb } = await need();
  const { data: b } = await sb.from('bookings').select('id, pro_id, company_id, service_id, tier').eq('id', s(f, 'id')).maybeSingle();
  if (!b?.pro_id) return;
  const score = (k: string) => Math.min(5, Math.max(1, Number(s(f, k)) || 5));
  const parts = (me.name || 'Client').trim().split(/\s+/);
  const author = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
  const { data: r, error } = await sb.from('reviews').insert({
    booking_id: b.id, client_id: me.id, pro_id: b.pro_id, company_id: b.company_id, service_id: b.service_id, tier: b.tier, author_name: author,
    punctuality: score('punctuality'), workmanship: score('workmanship'), cleanliness: score('cleanliness'), communication: score('communication'), pricing: score('pricing'),
    body: s(f, 'body').slice(0, 2000) || null,
  }).select('id').single();
  if (!error && r) await sb.from('review_private').insert({ review_id: r.id, would_hire_again: s(f, 'again') !== '0' });
  revalidatePath('/account');
}
