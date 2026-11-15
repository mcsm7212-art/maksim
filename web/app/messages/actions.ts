'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

const NIL = '00000000-0000-0000-0000-000000000000';

/** Opens (or reuses) the chat between the signed-in client and a pro or a company office. */
export async function startChat(f: FormData) {
  const pro = String(f.get('pro') ?? ''), company = String(f.get('company') ?? '');
  const back = pro ? `/pro/${pro}` : `/company/${company}`;
  if (!isLive()) redirect(`${back}?chat=demo`);
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(back)}`);
  const sb = await supabaseServer();
  const target = pro
    ? (await sb.from('pros').select('id').eq('slug', pro).maybeSingle()).data
    : (await sb.from('companies').select('id').eq('slug', company).maybeSingle()).data;
  if (!target) redirect(back);
  if (target.id === me.id) redirect('/messages');
  const col = pro ? 'pro_id' : 'company_id';
  const { data: found } = await sb.from('conversations').select('id').eq('client_id', me.id).eq(col, target.id).is(pro ? 'company_id' : 'pro_id', null).maybeSingle();
  if (found) redirect(`/messages/${found.id}`);
  const { data, error } = await sb.from('conversations').insert({ client_id: me.id, [col]: target.id }).select('id').single();
  if (error) redirect(`${back}?chat=error`);
  void NIL;
  redirect(`/messages/${data.id}`);
}

export async function sendMessage(f: FormData) {
  const me = await getMe(); if (!me) redirect('/login?next=/messages');
  const id = String(f.get('id') ?? ''), body = String(f.get('body') ?? '').trim().slice(0, 4000);
  const { ownPhotoUrl } = await import('@/lib/photos');
  const photos = f.getAll('photo_url').map(String).filter((u) => ownPhotoUrl(u, me.id)).slice(0, 6);
  if (!body && !photos.length) return;
  const sb = await supabaseServer();
  // Each photo is its own message; the text goes with the first one.
  const rows = photos.length ? photos.map((photo_url, i) => ({ conversation_id: id, sender_id: me.id, body: i === 0 ? body : '', photo_url })) : [{ conversation_id: id, sender_id: me.id, body }];
  await sb.from('messages').insert(rows);
  revalidatePath(`/messages/${id}`);
}
