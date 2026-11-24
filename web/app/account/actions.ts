'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { namesMatch } from '@/lib/names';
import { supabaseServer } from '@/lib/supabase/server';
import { isLive } from '@/lib/supabase/config';
import { ownPhotoUrl } from '@/lib/photos';
import { isHex } from '@/lib/colors';
import { CITIES } from '@/lib/areas';
import { miles, nameAt } from '@/lib/geo';

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
  revalidatePath('/account'); revalidatePath('/business'); revalidatePath('/business/board');
}
export async function setOnline(f: FormData) {
  const { sb } = await need();
  const hours = Number(s(f, 'hours')) || 0;
  if (hours > 0) await sb.rpc('set_online', { hours, area: s(f, 'area').slice(0, 60) || null });
  else await sb.rpc('set_online_spot', { hours: 0 }); // going offline also clears the place
  revalidatePath('/account'); revalidatePath('/online');
}
/** Nearest city of the "Online now" map (within 15 miles), else the town name. */
function cityNear(lat: number, lng: number): string | null {
  const best = CITIES.map((c) => ({ c, d: miles({ lat, lng }, { lat: c.lat, lng: c.lon }) })).sort((a, b) => a.d - b.d)[0];
  return best && best.d <= 15 ? best.c.name : nameAt(lat, lng);
}
/** Go online with a place and a radius. The place is rounded (about 1 km) in the browser and again in the database. */
export async function goOnline(o: { hours: number; lat: number; lng: number; radius: number; live: boolean; city: string | null }) {
  const { sb } = await need();
  const lat = Number(o.lat), lng = Number(o.lng); if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const area = o.city && CITIES.some((c) => c.name === o.city) ? o.city : cityNear(lat, lng);
  await sb.rpc('set_online_spot', { hours: Math.min(12, Math.max(1, Math.round(Number(o.hours) || 4))), lat, lng, radius: Math.round(Number(o.radius) || 10), live: Boolean(o.live), area });
  revalidatePath('/account'); revalidatePath('/online'); revalidatePath('/');
}
export async function moveOnline(lat: number, lng: number) {
  const { sb } = await need();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  await sb.rpc('move_online_spot', { lat, lng, area: cityNear(lat, lng) });
}
export async function setUrgent(f: FormData) {
  const { sb } = await need();
  const take = s(f, 'take') === '1';
  const raw = s(f, 'fee').replace(/[^\d.]/g, ''); const fee = raw ? Math.min(500, Math.max(0, Math.round(Number(raw)))) : null;
  await sb.rpc('set_urgent', { take, fee });
  revalidatePath('/account'); revalidatePath('/'); revalidatePath('/online');
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
  revalidatePath('/account'); revalidatePath(`/orders/${b.id}`);
}

export async function addPhotos(f: FormData) {
  const { me, sb } = await need();
  const { ownPhotoUrl } = await import('@/lib/photos');
  const urls = f.getAll('work_url').map(String).filter((u) => ownPhotoUrl(u, me.id)).slice(0, 24);
  const booking = s(f, 'booking') || null;
  const kind = ['before', 'after'].includes(s(f, 'kind')) ? s(f, 'kind') : 'portfolio';
  const { serviceById } = await import('@/lib/catalog');
  const service = kind === 'portfolio' && serviceById(s(f, 'service')) ? s(f, 'service') : null;
  if (urls.length) await sb.from('pro_photos').insert(urls.map((url) => ({ pro_id: me.id, url, kind, booking_id: kind === 'portfolio' ? null : booking, ...(service ? { service_id: service } : {}) })));
  revalidatePath('/account');
}
export async function deletePhoto(f: FormData) {
  const { sb } = await need();
  await sb.from('pro_photos').delete().eq('id', s(f, 'id'));
  revalidatePath('/account');
}

/** Full-height cutout for the pro page and its glow colour (picked from the clothes). Empty url removes the figure. */
export async function saveFigure(f: FormData): Promise<{ error?: string; ok?: string }> {
  if (!isLive()) return { error: 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.' };
  const { me, sb } = await need();
  if (!me.pro) return { error: 'Only pros can do this.' };
  const url = s(f, 'figure_url').slice(0, 500);
  if (url && !ownPhotoUrl(url, me.id)) return { error: 'Upload the photo again.' };
  const accent = isHex(f.get('accent')) ? String(f.get('accent')) : null;
  const { error } = await sb.from('pros').update(url ? { figure_url: url, ...(accent ? { accent } : {}) } : { figure_url: null }).eq('id', me.id);
  if (error) return { error: error.message };
  revalidatePath('/account/profile'); revalidatePath(`/pro/${me.pro.slug}`);
  return { ok: url ? 'Saved. This is how clients see you now.' : 'Removed.' };
}

/** Pro shows (or hides) a job's before/after photos on their public page. */
export async function publishJobPhotos(f: FormData) {
  const { me, sb } = await need();
  await sb.from('pro_photos').update({ public: f.get('on') === '1' }).eq('pro_id', me.id).eq('booking_id', s(f, 'booking'));
  revalidatePath('/account'); if (me.pro) { revalidatePath(`/pro/${me.pro.slug}`); revalidatePath(`/${me.pro.slug}`); }
}
/** The client of a job keeps its photos private for good. */
export async function hideJobPhotos(f: FormData) {
  const { sb } = await need();
  await sb.rpc('hide_job_photos', { b_id: s(f, 'booking') });
  revalidatePath('/account');
}

/** Pro records a part installed on a job (builds NovaFides' parts database). */
export async function addJobPart(f: FormData) {
  const { me, sb } = await need();
  const name = s(f, 'name').trim().slice(0, 120);
  if (name.length < 2) return;
  const photo = s(f, 'part_photo');
  await sb.from('job_parts').insert({ booking_id: s(f, 'booking'), pro_id: me.id, brand: s(f, 'brand').trim().slice(0, 40) || null,
    part_no: s(f, 'part_no').trim().slice(0, 40) || null, name, photo_url: photo && ownPhotoUrl(photo, me.id) ? photo : null });
  revalidatePath('/account');
}
export async function deleteJobPart(f: FormData) {
  const { sb } = await need();
  await sb.from('job_parts').delete().eq('id', Number(f.get('id')));
  revalidatePath('/account');
}

// A pro sends or corrects their CSLB license number: it waits for the NovaFides check (see the admin page).
export async function sendLicense(_p: { error?: string; ok?: boolean } | undefined, f: FormData): Promise<{ error?: string; errorVars?: Record<string, string>; ok?: boolean }> {
  const { me, sb } = await need(); if (!me.pro) return { error: 'Only pros can add a license.' };
  const n = String(f.get('license') ?? '').replace(/\D/g, '');
  if (!/^\d{5,8}$/.test(n)) return { error: 'A CSLB license number has 5 to 8 digits.' };
  // An independent pro may only use a license in their own name.
  const { data: pro } = await sb.from('pros').select('display_name, trade, company_id').eq('id', me.id).single();
  if (pro && !pro.company_id) {
    const { data: chk } = await sb.rpc('cslb_check', { num: n, trd: pro.trade });
    const c = chk as { result?: string; name?: string; name2?: string } | null;
    if (c?.result && !['not_found', 'no_list'].includes(c.result) && !namesMatch(pro.display_name, c.name, c.name2))
      return { error: 'This license is in the name of {lic}, not {name}. An independent pro can only add their own license. If the license belongs to your company, register the company instead; otherwise remove the number.', errorVars: { lic: [c.name, c.name2].filter(Boolean).join(' / '), name: pro.display_name } };
  }
  const { error } = await sb.rpc('submit_license', { n });
  if (error) return { error: 'Could not send. Try again.' };
  revalidatePath('/account'); revalidatePath('/account/profile');
  return { ok: true };
}
