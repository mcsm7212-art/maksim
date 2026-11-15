'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { atPacific } from '@/lib/time';

// datetime-local value "2026-11-16T14:00" is Bay Area wall-clock time
const fromLocal = (v: string) => { const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? atPacific(+m[1], +m[2], +m[3], +m[4], +m[5]).toISOString() : null; };

const s = (f: FormData, k: string) => String(f.get(k) ?? '');
async function need() { const me = await getMe(); if (!me) redirect('/login?next=/business'); return await supabaseServer(); }

export async function assign(f: FormData) {
  const sb = await need();
  const t = s(f, 'time');
  const { error } = await sb.rpc('office_assign', { b_id: s(f, 'id'), new_pro: s(f, 'pro'), new_start: t ? fromLocal(t) : null });
  if (error) redirect(`/business?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/business');
}
async function createInvite(f: FormData, role: 'technician' | 'manager') {
  const sb = await need();
  await sb.from('company_invites').insert({ company_id: s(f, 'company'), role });
  revalidatePath('/business');
}
export async function inviteTechnician(f: FormData) { await createInvite(f, 'technician'); }
export async function inviteManager(f: FormData) { await createInvite(f, 'manager'); }
