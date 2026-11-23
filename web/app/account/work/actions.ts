'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { EXT_SITES } from '@/lib/ext-sites';

type S = { error?: string; ok?: string } | undefined;
const DEMO = 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.';
async function pro() {
  const me = await getMe(); if (!me) redirect('/login?next=/account/work');
  if (!me.pro) redirect('/join/pro');
  return { me, sb: await supabaseServer() };
}
const refreshPro = (slug: string) => { revalidatePath('/account/work'); revalidatePath('/account'); revalidatePath(`/pro/${slug}`); revalidatePath(`/${slug}`); revalidatePath('/search'); };

/** Taking jobs, or a pause (optionally until a date). */
export async function setAccepting(f: FormData) {
  if (!isLive()) return;
  const { me, sb } = await pro();
  const take = f.get('take') === '1';
  const until = String(f.get('until') ?? '');
  await sb.rpc('set_accepting', { take, until: !take && /^\d{4}-\d{2}-\d{2}$/.test(until) ? until : null });
  refreshPro(me.pro!.slug);
}

/** Working days with their own hours. */
export async function saveSchedule(_p: S, f: FormData): Promise<S> {
  if (!isLive()) return { error: DEMO };
  const { me, sb } = await pro();
  const rows: { pro_id: string; weekday: number; start_time: string; end_time: string }[] = [];
  for (let d = 0; d < 7; d++) {
    if (!f.get(`on_${d}`)) continue;
    const a = String(f.get(`start_${d}`) ?? ''), b = String(f.get(`end_${d}`) ?? '');
    if (!/^\d{2}:\d{2}$/.test(a) || !/^\d{2}:\d{2}$/.test(b) || b <= a) return { error: 'Check the hours: the end must be after the start.' };
    rows.push({ pro_id: me.id, weekday: d, start_time: a, end_time: b });
  }
  if (!rows.length) return { error: 'Choose at least one working day, or pause new jobs instead.' };
  await sb.from('availability_rules').delete().eq('pro_id', me.id);
  const { error } = await sb.from('availability_rules').insert(rows);
  if (error) return { error: error.message };
  refreshPro(me.pro!.slug);
  return { ok: 'Schedule saved.' };
}

/** Who may message me: all pros, only my colleagues, or nobody. */
export async function setColleagueChat(f: FormData) {
  if (!isLive()) return;
  const { me, sb } = await pro();
  const v = String(f.get('mode'));
  if (['all', 'contacts', 'off'].includes(v)) await sb.from('pros').update({ colleague_chat: v }).eq('id', me.id);
  revalidatePath('/account/work');
}

export async function toggleColleague(f: FormData) {
  if (!isLive()) return;
  const { me, sb } = await pro();
  const id = String(f.get('id'));
  if (f.get('on') === '1') await sb.from('pro_contacts').insert({ pro_id: me.id, colleague_id: id });
  else await sb.from('pro_contacts').delete().eq('pro_id', me.id).eq('colleague_id', id);
  revalidatePath('/account/work'); revalidatePath(String(f.get('path') ?? '/account/work'));
}

// Phone and call hours shown on the pro's page (optional; empty = hidden).
export async function saveContact(f: FormData) {
  const me = await getMe(); if (!me?.pro) redirect('/account');
  const phone = String(f.get('phone') ?? '').trim().slice(0, 30);
  const hours = String(f.get('hours') ?? '').trim().slice(0, 80);
  const ok = phone.replace(/\D/g, '').length >= 10;
  await (await supabaseServer()).from('pros').update({ public_phone: ok ? phone : null, call_hours: ok && hours ? hours : null }).eq('id', me.id);
  revalidatePath('/account/work'); revalidatePath(`/${me.pro.slug}`);
}

/** Links to the pro's profiles on other review sites (checked by an admin before they get the "checked" mark). */
export async function saveExtLinks(_p: S, f: FormData): Promise<S> {
  if (!isLive()) return { error: DEMO };
  const { me, sb } = await pro();
  const links: Record<string, string> = {};
  for (const site of EXT_SITES) {
    const v = String(f.get(site.key) ?? '').trim().split('?')[0].slice(0, 400);
    if (!v) continue;
    if (!site.re.test(v)) return { error: `This does not look like a ${site.name} profile link. Open your profile on ${site.name} and copy the address from the browser.` };
    links[site.key] = v;
  }
  const { error } = await sb.from('pros').update({ ext_links: links }).eq('id', me.id);
  if (error) return { error: 'Could not save. Check the links.' };
  refreshPro(me.pro!.slug);
  return { ok: 'Saved. NovaFides will check that these profiles are yours.' };
}
