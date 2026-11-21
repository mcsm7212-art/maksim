'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { ownPhotoUrl } from '@/lib/photos';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

type St = { error?: string; ok?: string } | undefined;

/** A client shares finished work and tags the pro; it goes public after the pro confirms. */
export async function createProject(_p: St, f: FormData): Promise<St> {
  if (!isLive()) return { error: 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.' };
  const me = await getMe(); if (!me) redirect('/login?next=/projects/new');
  if (me.pro) return { error: 'Projects are for clients. Pros share work in their posts.' };
  const pro = String(f.get('pro') ?? '');
  const body = String(f.get('body') ?? '').trim().slice(0, 1000);
  const photos = f.getAll('photo_url').map(String).filter((u) => ownPhotoUrl(u, me.id)).slice(0, 6);
  if (!/^[0-9a-f-]{36}$/.test(pro)) return { error: 'Choose the pro who did the work.' };
  if (!photos.length) return { error: 'Add at least one photo of the finished work.' };
  const { error } = await (await supabaseServer()).from('client_projects').insert({ client_id: me.id, pro_id: pro, body, photos });
  if (error) return { error: error.message.startsWith('project limit') ? 'You can share up to 3 projects a day.' : error.message.startsWith('pick a verified') ? 'Choose a verified pro.' : error.message };
  redirect(`/client/${me.id}?sent=1`);
}

async function decide(f: FormData, ok: boolean) {
  const me = await getMe(); if (!me?.pro) redirect('/');
  await (await supabaseServer()).rpc('decide_project', { pid: String(f.get('id') ?? ''), ok });
  revalidatePath('/account/projects'); revalidatePath(`/${me.pro.slug}`);
}
// One action per button: a form does not reliably tell the server which button was pressed.
export async function confirmProject(f: FormData) { await decide(f, true); }
export async function declineProject(f: FormData) { await decide(f, false); }

export async function deleteProject(f: FormData) {
  const me = await getMe(); if (!me) redirect('/');
  await (await supabaseServer()).from('client_projects').delete().eq('id', String(f.get('id') ?? '')).eq('client_id', me.id);
  revalidatePath(`/client/${me.id}`);
}
