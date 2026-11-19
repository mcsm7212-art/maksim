'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

const s = (f: FormData, k: string) => String(f.get(k) ?? '');
async function admin() {
  const me = await getMe();
  if (me?.role !== 'admin') redirect('/');
  return await supabaseServer();
}

async function reviewPro(f: FormData, ok: boolean) {
  const sb = await admin();
  await sb.from('pros').update(ok
    ? { status: 'verified', license_status: f.get('license_ok') ? 'verified' : 'none', id_verified: Boolean(f.get('id_ok')), insured: Boolean(f.get('insured_ok')), license_checked_at: new Date().toISOString() }
    : { status: 'suspended' }).eq('id', s(f, 'id'));
  await sb.rpc('admin_notify', { uid: s(f, 'id'), msg: ok ? 'Your profile is verified and now public on NovaFides.' : `Your profile was not approved: ${s(f, 'reason') || 'please contact support'}.` });
  revalidatePath('/admin');
}
async function reviewCompany(f: FormData, ok: boolean) {
  const sb = await admin();
  await sb.from('companies').update({ status: ok ? 'verified' : 'suspended' }).eq('id', s(f, 'id'));
  await sb.rpc('admin_notify', { uid: s(f, 'owner'), msg: ok ? 'Your company is verified and now public on NovaFides.' : `Your company was not approved: ${s(f, 'reason') || 'please contact support'}.` });
  revalidatePath('/admin');
}
async function decideReport(f: FormData, uphold: boolean) {
  const sb = await admin();
  await sb.from('review_reports').update({ status: uphold ? 'upheld' : 'rejected' }).eq('id', s(f, 'id'));
  if (uphold) await sb.from('reviews').update({ hidden: true }).eq('id', s(f, 'review'));
  revalidatePath('/admin');
}

// One action per button: a form does not tell the server which button was pressed.
export async function approvePro(f: FormData) { await reviewPro(f, true); }
export async function rejectPro(f: FormData) { await reviewPro(f, false); }
export async function approveCompany(f: FormData) { await reviewCompany(f, true); }
export async function rejectCompany(f: FormData) { await reviewCompany(f, false); }
export async function hideReview(f: FormData) { await decideReport(f, true); }
export async function keepReview(f: FormData) { await decideReport(f, false); }

// Suspicious-pattern queue: count in full, keep the reduced weight, or hide (only when a rule is broken).
export async function countFlagged(f: FormData) { const sb = await admin(); await sb.rpc('admin_review_decide', { rid: s(f, 'review'), decision: 'count' }); revalidatePath('/admin'); }
export async function keepFlagged(f: FormData) { const sb = await admin(); await sb.rpc('admin_review_decide', { rid: s(f, 'review'), decision: 'keep' }); revalidatePath('/admin'); }
export async function hideFlagged(f: FormData) {
  const sb = await admin();
  await sb.rpc('admin_review_decide', { rid: s(f, 'review'), decision: 'keep' });
  await sb.from('reviews').update({ hidden: true }).eq('id', s(f, 'review'));
  revalidatePath('/admin');
}
