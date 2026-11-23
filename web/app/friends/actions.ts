'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { badText, notEnglish } from '@/lib/clean-words';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

async function pro() {
  const me = await getMe(); if (!me?.pro) redirect('/account');
  return { me, sb: await supabaseServer() };
}

// "Pros I need": my private list of pros from any trade. Only I see it.
export async function addHelper(f: FormData) {
  if (!isLive()) return; const { me, sb } = await pro();
  const id = String(f.get('id')); if (id === me.id) return;
  await sb.from('pro_helpers').upsert({ pro_id: me.id, helper_id: id }, { onConflict: 'pro_id,helper_id', ignoreDuplicates: true });
  revalidatePath('/friends'); redirect('/friends?tab=helpers');
}
export async function removeHelper(f: FormData) {
  if (!isLive()) return; const { me, sb } = await pro();
  await sb.from('pro_helpers').delete().eq('pro_id', me.id).eq('helper_id', String(f.get('id')));
  revalidatePath('/friends');
}
export async function saveHelperNote(f: FormData) {
  if (!isLive()) return; const { me, sb } = await pro();
  await sb.from('pro_helpers').update({ note: String(f.get('note') ?? '').trim().slice(0, 200) }).eq('pro_id', me.id).eq('helper_id', String(f.get('id')));
  revalidatePath('/friends');
}

// Useful stores and tools: advice for pros of my trade.
export async function addTip(f: FormData) {
  if (!isLive()) return; const { sb } = await pro();
  const kind = f.get('kind') === 'tool' ? 'tool' : 'store'; const back = `/friends?tab=${kind}s`;
  const name = String(f.get('name') ?? '').trim().slice(0, 80), place = String(f.get('place') ?? '').trim().slice(0, 60), note = String(f.get('note') ?? '').trim().slice(0, 300);
  let url: string | null = String(f.get('url') ?? '').trim().slice(0, 300) || null;
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (url) url = url.replace(/^http:\/\//i, 'https://');
  const all = `${name} ${place} ${note}`;
  const err = name.length < 2 ? 'name' : badText(all) ? 'words' : notEnglish(all) ? 'english' : url && /\s/.test(url) ? 'url' : null;
  if (err) redirect(`${back}&err=${err}`);
  const { error } = await sb.from('pro_tips').insert({ kind, name, place, note, url });
  if (error) redirect(`${back}&err=${/limit/.test(error.message) ? 'limit' : /verified/.test(error.message) ? 'verified' : /english/.test(error.message) ? 'english' : /words/.test(error.message) ? 'words' : 'save'}`);
  revalidatePath('/friends'); redirect(back);
}
export async function deleteTip(f: FormData) {
  if (!isLive()) return; const { me, sb } = await pro();
  await sb.from('pro_tips').delete().eq('id', Number(f.get('id'))).eq('pro_id', me.id);
  revalidatePath('/friends');
}
export async function voteTip(f: FormData) {
  if (!isLive()) return; const { me, sb } = await pro();
  const id = Number(f.get('id'));
  if (f.get('on') === '1') await sb.from('pro_tip_votes').insert({ tip_id: id });
  else await sb.from('pro_tip_votes').delete().eq('tip_id', id).eq('user_id', me.id);
  revalidatePath('/friends');
}
