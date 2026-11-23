'use server';
import { licenseNeeded, serviceById } from '@/lib/catalog';
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
  const sb = await admin(); const id = s(f, 'id');
  const licOk = Boolean(f.get('license_ok'));
  const { data: cur } = await sb.from('pros').select('license_no, company_id').eq('id', id).single();
  const badLicense = ok && !licOk && Boolean(cur?.license_no) && !cur?.company_id;
  await sb.from('pros').update(ok
    ? { status: 'verified', license_status: licOk ? 'verified' : 'none', id_verified: Boolean(f.get('id_ok')), insured: Boolean(f.get('insured_ok')), license_checked_at: new Date().toISOString(),
        // the number was not confirmed by CSLB: it is removed, the pro works as unlicensed (jobs under $1,000, no permit)
        ...(badLicense ? { license_no: null } : {}) }
    : { status: 'suspended' }).eq('id', id);
  if (badLicense) {
    const { data: svcs } = await sb.from('pro_services').select('service_id, price').eq('pro_id', id).eq('active', true);
    const off = (svcs ?? []).filter((x) => { const sv = serviceById(x.service_id); return sv && licenseNeeded(sv, x.price != null ? Number(x.price) : null); }).map((x) => x.service_id);
    if (off.length) await sb.from('pro_services').update({ active: false }).eq('pro_id', id).in('service_id', off);
    await sb.from('pro_custom_services').delete().eq('pro_id', id).gte('price', 1000);
  }
  await sb.rpc('admin_notify', { uid: id, msg: !ok ? `Your profile was not approved: ${s(f, 'reason') || 'please contact support'}.`
    : badLicense ? 'Your profile is public, but we could not confirm your CSLB license number, so it was removed. For now you take jobs under $1,000 without a permit. Send us the right number to add it back.'
    : 'Your profile is verified and now public on NovaFides.' });
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
