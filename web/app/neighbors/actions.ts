'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { CITIES } from '@/lib/areas';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

type S = { error?: string; ok?: string } | undefined;
async function who() { const me = await getMe(); if (!me) redirect('/login?next=/neighbors'); return { me, sb: await supabaseServer() }; }

export async function saveNeighbor(_p: S, f: FormData): Promise<S> {
  if (!isLive()) return { error: 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.' };
  const { me, sb } = await who();
  const open = f.get('open') === '1';
  const city = String(f.get('city') ?? '');
  const scope = ['street', 'city', 'bayarea'].includes(String(f.get('scope'))) ? String(f.get('scope')) : 'city';
  const street = String(f.get('street') ?? '').replace(/^\s*\d+[a-z]?\s+/i, '').trim().slice(0, 80) || null; // never store a house number
  if (open && !CITIES.some((c) => c.name === city)) return { error: 'Choose your city.' };
  if (open && scope === 'street' && !street) return { error: 'Enter your street name (no house number) to talk with neighbors on your street.' };
  const interests = f.getAll('interest').map(String).filter((x) => ['plumbing', 'electrical', 'handyman', 'construction'].includes(x));
  const { error } = await sb.from('neighbor_settings').upsert({ user_id: me.id, open, city: city || null, street, scope, interests,
    about: String(f.get('about') ?? '').trim().slice(0, 200) || null, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath('/neighbors');
  return { ok: open ? 'Saved. Neighbors who match your settings are below.' : 'Saved. Neighbors can no longer see or message you.' };
}

export async function blockNeighbor(f: FormData) {
  if (!isLive()) return;
  const { me, sb } = await who();
  await sb.from('neighbor_blocks').insert({ user_id: me.id, blocked_id: String(f.get('id')) });
  revalidatePath('/neighbors'); revalidatePath('/messages');
}

export async function unblockNeighbor(f: FormData) {
  if (!isLive()) return;
  const { me, sb } = await who();
  await sb.from('neighbor_blocks').delete().eq('user_id', me.id).eq('blocked_id', String(f.get('id')));
  revalidatePath('/neighbors');
}

export async function messageNeighbor(f: FormData) {
  if (!isLive()) redirect('/neighbors');
  const { me, sb } = await who();
  const peer = String(f.get('id'));
  const { data: found } = await sb.from('conversations').select('id').or(`and(client_id.eq.${me.id},peer_id.eq.${peer}),and(client_id.eq.${peer},peer_id.eq.${me.id})`).maybeSingle();
  if (found) redirect(`/messages/${found.id}`);
  const { data, error } = await sb.from('conversations').insert({ client_id: me.id, peer_id: peer }).select('id').single();
  if (error) redirect('/neighbors?err=closed');
  redirect(`/messages/${data.id}`);
}
