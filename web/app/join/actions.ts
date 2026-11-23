'use server';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { licenseNeeded, serviceById, slugify, TRADES, type Tier, type Trade } from '@/lib/catalog';
import { accentFromUniform, isHex } from '@/lib/colors';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { ownPhotoUrl } from '@/lib/photos';

export type JoinState = { error?: string; demo?: boolean; saved?: boolean } | undefined;
const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);

async function uniqueSlug(table: 'pros' | 'companies', base: string) {
  const sb = await supabaseServer();
  const root = slugify(base) || 'pro';
  for (let i = 0; i < 6; i++) {
    const s = i ? `${root}-${Math.random().toString(36).slice(2, 6)}` : root;
    const { data } = await sb.from(table).select('slug').eq('slug', s).maybeSingle();
    if (!data) return s;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// Service area from the map: a polygon of [lat, lng] points (anywhere in the US), plus its center and reach for sorting.
function serviceArea(f: FormData) {
  const none = { base_lat: null, base_lng: null, service_radius_mi: null, service_polygon: null };
  let pts: [number, number][] = [];
  try { pts = JSON.parse(String(f.get('service_polygon') ?? '[]')); } catch { return none; }
  if (!Array.isArray(pts)) return none;
  pts = pts.filter((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] > 17 && p[0] < 72 && p[1] > -180 && p[1] < -60)
    .slice(0, 60).map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5]);
  if (pts.length < 3) return none;
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length, lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const r = Math.max(...pts.map(([a, b]) => { const dy = (a - lat) * 69, dx = (b - lng) * 69 * Math.cos((lat * Math.PI) / 180); return Math.hypot(dx, dy); }));
  return { base_lat: Math.round(lat * 1e5) / 1e5, base_lng: Math.round(lng * 1e5) / 1e5, service_radius_mi: Math.min(1500, Math.max(1, Math.round(r))), service_polygon: pts };
}

// Full-height photo (background already removed in the browser) and the glow colour taken from the clothes.
function figureOf(f: FormData, uid: string, cur: string | null) {
  if (!f.has('figure_url')) return { url: cur, accent: null as string | null };
  const u = str(f, 'figure_url', 500);
  return { url: u && ownPhotoUrl(u, uid) ? u : null, accent: isHex(f.get('figure_accent')) ? String(f.get('figure_accent')) : null };
}

// California: a CSLB license is needed for jobs over $1,000 (labor + materials) or that need a permit.
const needsLicense = (x: { service_id: string; price?: number | null }) => { const s = serviceById(x.service_id); return Boolean(s && licenseNeeded(s, x.price)); };
function customOf(f: FormData) {
  const names = f.getAll('custom_name').map(String), prices = f.getAll('custom_price').map(String);
  const cats = f.getAll('custom_cat').map(String);
  return names.map((n, i) => ({ name: n.trim().slice(0, 80), price: Number(prices[i]) > 0 ? Math.round(Number(prices[i])) : null, category: (cats[i] ?? '').trim().slice(0, 60) || null }))
    .filter((x) => x.name.length >= 3).slice(0, 60);
}
function licenseProblem(services: { service_id: string; price?: number | null }[], custom: { name: string; price: number | null }[], licensed: boolean): string | null {
  if (licensed) return null;
  const bad = [...services.filter(needsLicense).map((x) => serviceById(x.service_id)!.name), ...custom.filter((c) => (c.price ?? 0) >= 1000).map((c) => c.name)];
  return bad.length ? 'Some chosen jobs need a CSLB license (your price is $1,000 or more, or a permit is needed). They are marked red. Add your license number, lower the price or remove them.' : null;
}
async function saveCustom(sb: Awaited<ReturnType<typeof supabaseServer>>, uid: string, custom: { name: string; price: number | null }[]) {
  await sb.from('pro_custom_services').delete().eq('pro_id', uid);
  if (custom.length) await sb.from('pro_custom_services').insert(custom.map((c) => ({ ...c, pro_id: uid })));
}

export async function registerPro(_p: JoinState, f: FormData): Promise<JoinState> {
  const name = str(f, 'name', 60), trade = str(f, 'trade') as Trade, license = str(f, 'license', 12).replace(/\D/g, '');
  const invite = str(f, 'invite', 40);
  const tiers = ['standard'] as Tier[]; // one price per job; levels are no longer used
  // Only name, trade and the agreement are needed to sign up; the rest can be filled in later in the account.
  const picked = [0, 1, 2, 3, 4, 5, 6].filter((d) => f.get(`day_${d}`)); const days = picked.length ? picked : [1, 2, 3, 4, 5];
  let start = str(f, 'start') || '08:00', end = str(f, 'end') || '18:00'; if (end <= start) { start = '08:00'; end = '18:00'; }
  const services = [...f.keys()].filter((k) => k.startsWith('svc_')).map((k) => k.slice(4))
    .filter((id) => serviceById(id)?.trade === trade)
    .map((id) => { const v = Number(str(f, `price_${id}`)); return { service_id: id, price: v > 0 ? v : null }; });

  if (name.length < 3) return { error: 'Enter your name as clients will see it.' };
  if (!(trade in TRADES)) return { error: 'Choose your trade.' };
  const ownTrade = trade === 'other' ? str(f, 'custom_trade', 40) : '';
  if (trade === 'other' && ownTrade.length < 2) return { error: 'Write the name of your trade.' };
  if (!f.get('agree')) return { error: 'Tick the box to agree to the Terms of Use' };
  // No license is fine: such pros take only jobs under $1,000 without a permit (checked below with the chosen services).
  const custom = customOf(f);
  const lp = licenseProblem(services, custom, Boolean(invite) || license.length >= 6); if (lp) return { error: lp };
  if (!isLive()) return { demo: true };

  const me = await getMe();
  if (!me) redirect('/login?next=/join/pro');
  if (me.pro) redirect('/account');
  const sb = await supabaseServer();
  const photo = str(f, 'photo_override', 500) || str(f, 'photo_url', 500);
  if (photo && !ownPhotoUrl(photo, me.id)) return { error: 'Add a real photo of yourself. Clients choose pros by face.' };
  const work = f.getAll('work_url').map(String).filter((u) => ownPhotoUrl(u, me.id)).slice(0, 24);
  const uniform = isHex(f.get('uniform')) ? String(f.get('uniform')) : null;
  const { error } = await sb.from('pros').insert({
    id: me.id, slug: await uniqueSlug('pros', name), display_name: name, trade, custom_trade: ownTrade || null, tiers,
    years_exp: Number(str(f, 'years')) || 0, area: str(f, 'area', 60), ...serviceArea(f), bio: str(f, 'bio', 300),
    experience: str(f, 'experience', 2000) || null,
    skills: str(f, 'skills', 300).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12),
    languages: str(f, 'languages', 120).split(',').map((s) => s.trim()).filter(Boolean),
    license_no: license || null, license_status: license ? 'pending' : 'none', insured: Boolean(f.get('insured')),
    photo_url: photo || null, uniform_color: uniform, ...((fg) => ({ figure_url: fg.url, accent: fg.url && fg.accent ? fg.accent : accentFromUniform(uniform) }))(figureOf(f, me.id, null)),
  });
  if (error) return { error: error.message };
  if (services.length) await sb.from('pro_services').insert(services.map((s) => ({ ...s, pro_id: me.id })));
  await saveCustom(sb, me.id, custom);
  if (work.length) await sb.from('pro_photos').insert(work.map((url) => ({ pro_id: me.id, url })));
  await sb.from('availability_rules').insert(days.map((weekday) => ({ pro_id: me.id, weekday, start_time: start, end_time: end })));
  if (me.role === 'client') await sb.rpc('become', { new_role: 'pro' });
  if (invite) { const { error: e } = await sb.rpc('accept_invite', { invite_code: invite }); if (e) return { error: `Profile saved, but the invite failed: ${e.message}` }; }
  redirect('/account?joined=pro');
}

// Pro edits their own profile. Trade and license stay locked (changing them needs a new check).
export async function updatePro(_p: JoinState, f: FormData): Promise<JoinState> {
  if (!isLive()) return { demo: true };
  const me = await getMe();
  if (!me) redirect('/login?next=/account/profile');
  if (!me.pro) redirect('/join/pro');
  const sb = await supabaseServer();
  const { data: cur } = await sb.from('pros').select('trade, photo_url, figure_url, accent, license_no, company_id').eq('id', me.id).single();
  const trade = cur!.trade as Trade;
  const name = str(f, 'name', 60);
  const tiers = ['standard'] as Tier[]; // one price per job; levels are no longer used
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => f.get(`day_${d}`));
  const start = str(f, 'start') || '08:00', end = str(f, 'end') || '18:00';
  const services = [...f.keys()].filter((k) => k.startsWith('svc_')).map((k) => k.slice(4))
    .filter((id) => serviceById(id)?.trade === trade)
    .map((id) => { const v = Number(str(f, `price_${id}`)); return { service_id: id, price: v > 0 ? v : null }; });
  if (name.length < 3) return { error: 'Enter your name as clients will see it.' };
  if (end <= start) return { error: 'Set your working days and hours.' };
  const custom = customOf(f);
  const lp = licenseProblem(services, custom, Boolean(cur!.license_no) || Boolean(cur!.company_id)); if (lp) return { error: lp };
  const newPhoto = str(f, 'photo_override', 500) || str(f, 'photo_url', 500);
  const fg = figureOf(f, me.id, cur!.figure_url);
  const uniform = isHex(f.get('uniform')) ? String(f.get('uniform')) : null;
  const { error } = await sb.from('pros').update({
    display_name: name, tiers, years_exp: Number(str(f, 'years')) || 0, area: str(f, 'area', 60), ...serviceArea(f), bio: str(f, 'bio', 300),
    experience: str(f, 'experience', 2000) || null,
    skills: str(f, 'skills', 300).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12),
    languages: str(f, 'languages', 120).split(',').map((x) => x.trim()).filter(Boolean),
    insured: Boolean(f.get('insured')), uniform_color: uniform, figure_url: fg.url,
    // the full-height photo sets its own glow colour; without it the page uses the work-clothes colour
    accent: fg.url ? (fg.accent ?? (cur!.figure_url ? cur!.accent : accentFromUniform(uniform))) : accentFromUniform(uniform),
    photo_url: newPhoto && ownPhotoUrl(newPhoto, me.id) ? newPhoto : cur!.photo_url,
  }).eq('id', me.id);
  if (error) return { error: error.message };
  // Keep job counters: services that are no longer offered are switched off, not deleted.
  const off = sb.from('pro_services').update({ active: false }).eq('pro_id', me.id);
  await (services.length ? off.not('service_id', 'in', `(${services.map((x) => x.service_id).join(',')})`) : off);
  if (services.length) {
    const { error: e2 } = await sb.from('pro_services').upsert(services.map((x) => ({ ...x, pro_id: me.id, active: true })), { onConflict: 'pro_id,service_id' });
    if (e2) return { error: e2.message };
  }
  await saveCustom(sb, me.id, custom);
  await sb.from('availability_rules').delete().eq('pro_id', me.id);
  if (days.length) await sb.from('availability_rules').insert(days.map((weekday) => ({ pro_id: me.id, weekday, start_time: start, end_time: end })));
  return { saved: true };
}

export async function registerCompany(_p: JoinState, f: FormData): Promise<JoinState> {
  const name = str(f, 'name', 80), trade = str(f, 'trade') as Trade, license = str(f, 'license', 12).replace(/\D/g, '');
  const accent = isHex(f.get('accent')) ? String(f.get('accent')) : '#B57A50';
  const base = ['dark', 'graphite', 'light', 'teal'].includes(str(f, 'base')) ? str(f, 'base') : 'dark';
  if (name.length < 3) return { error: 'Enter the company name.' };
  if (!f.get('agree')) return { error: 'Please confirm your licenses and agree to the Terms of Use.' };
  if (!(trade in TRADES)) return { error: 'Choose the main trade.' };
  if (trade !== 'handyman' && license.length < 6) return { error: 'A CSLB license number is required.' };
  if (!isLive()) return { demo: true };

  const me = await getMe();
  if (!me) redirect('/login?next=/join/company');
  if (me.companies.length) redirect('/business');
  const sb = await supabaseServer();
  const logoUrl = str(f, 'logo_url', 500);
  const logo = logoUrl && ownPhotoUrl(logoUrl, me.id) ? logoUrl : null;
  const { data, error } = await sb.from('companies').insert({
    slug: await uniqueSlug('companies', name), name, trade, accent, base_theme: base, logo_url: logo,
    city: str(f, 'city', 60), license_no: license || null, since_year: Number(str(f, 'since')) || null,
    warranty_months: Number(str(f, 'warranty')) || 0, about: str(f, 'about', 800), owner_id: me.id,
  }).select('id').single();
  if (error) return { error: error.message };
  await sb.from('company_members').insert({ company_id: data.id, profile_id: me.id, role: 'owner' });
  if (me.role === 'client') await sb.rpc('become', { new_role: 'company' });
  redirect('/business?joined=1');
}

export async function updateCompany(_p: JoinState, f: FormData): Promise<JoinState> {
  if (!isLive()) return { demo: true };
  const me = await getMe();
  if (!me) redirect('/login?next=/business/profile');
  const co = me.companies.find((c) => c.role !== 'technician');
  if (!co) redirect('/join/company');
  const name = str(f, 'name', 80);
  if (name.length < 3) return { error: 'Enter the company name.' };
  const logoUrl = str(f, 'logo_url', 500);
  const sb = await supabaseServer();
  const patch: Record<string, unknown> = {
    name, city: str(f, 'city', 60), since_year: Number(str(f, 'since')) || null, warranty_months: Number(str(f, 'warranty')) || 0,
    about: str(f, 'about', 800), accent: isHex(f.get('accent')) ? String(f.get('accent')) : '#B57A50',
    base_theme: ['dark', 'graphite', 'light', 'teal'].includes(str(f, 'base')) ? str(f, 'base') : 'dark',
  };
  if (logoUrl && ownPhotoUrl(logoUrl, me.id)) patch.logo_url = logoUrl;
  const { error } = await sb.from('companies').update(patch).eq('id', co.id);
  return error ? { error: error.message } : { saved: true };
}

// "My trade is not in the list": saved for NovaFides admins.
export async function requestTrade(name: string): Promise<{ ok: boolean; error?: string }> {
  const n = String(name ?? '').trim().slice(0, 60);
  if (n.length < 2) return { ok: false, error: 'Write the name of your trade.' };
  if (!isLive()) return { ok: true };
  const me = await getMe(); if (!me) return { ok: false, error: 'Please sign in first.' };
  const { error } = await (await supabaseServer()).from('trade_requests').insert({ name: n });
  if (error && !/duplicate|unique/i.test(error.message)) return { ok: false, error: /limit/.test(error.message) ? 'You already sent 5 trades. Thank you!' : 'Could not send. Try again.' };
  return { ok: true };
}
