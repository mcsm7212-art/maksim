'use server';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { serviceById, slugify, TRADES, type Tier, type Trade } from '@/lib/catalog';
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

export async function registerPro(_p: JoinState, f: FormData): Promise<JoinState> {
  const name = str(f, 'name', 60), trade = str(f, 'trade') as Trade, license = str(f, 'license', 12).replace(/\D/g, '');
  const invite = str(f, 'invite', 40);
  const tiers = ['standard'] as Tier[]; // one price per job; levels are no longer used
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => f.get(`day_${d}`));
  const start = str(f, 'start') || '08:00', end = str(f, 'end') || '18:00';
  const services = [...f.keys()].filter((k) => k.startsWith('svc_')).map((k) => k.slice(4))
    .filter((id) => serviceById(id)?.trade === trade)
    .map((id) => { const v = Number(str(f, `price_${id}`)); return { service_id: id, price: v > 0 ? v : null }; });

  if (name.length < 3) return { error: 'Enter your name as clients will see it.' };
  if (!(trade in TRADES)) return { error: 'Choose your trade.' };
  if (!f.get('agree')) return { error: 'Please confirm your licenses and agree to the Terms of Use.' };
  if (trade !== 'handyman' && !invite && license.length < 6) return { error: `A CSLB ${TRADES[trade].license} license number is required for ${TRADES[trade].name.toLowerCase()}.` };
  if (!services.length) return { error: 'Choose at least one service you offer.' };
  if (!days.length || end <= start) return { error: 'Set your working days and hours.' };
  if (!isLive()) return { demo: true };

  const me = await getMe();
  if (!me) redirect('/login?next=/join/pro');
  if (me.pro) redirect('/account');
  const sb = await supabaseServer();
  const photo = str(f, 'photo_url', 500);
  if (!photo || !ownPhotoUrl(photo, me.id)) return { error: 'Add a real photo of yourself. Clients choose pros by face.' };
  const work = f.getAll('work_url').map(String).filter((u) => ownPhotoUrl(u, me.id)).slice(0, 24);
  const uniform = isHex(f.get('uniform')) ? String(f.get('uniform')) : null;
  const { error } = await sb.from('pros').insert({
    id: me.id, slug: await uniqueSlug('pros', name), display_name: name, trade, tiers,
    years_exp: Number(str(f, 'years')) || 0, area: str(f, 'area', 60), bio: str(f, 'bio', 300),
    experience: str(f, 'experience', 2000) || null,
    skills: str(f, 'skills', 300).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12),
    languages: str(f, 'languages', 120).split(',').map((s) => s.trim()).filter(Boolean),
    license_no: license || null, license_status: license ? 'pending' : 'none', insured: Boolean(f.get('insured')),
    photo_url: photo, uniform_color: uniform, accent: accentFromUniform(uniform),
  });
  if (error) return { error: error.message };
  await sb.from('pro_services').insert(services.map((s) => ({ ...s, pro_id: me.id })));
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
  const { data: cur } = await sb.from('pros').select('trade, photo_url, figure_url, accent').eq('id', me.id).single();
  const trade = cur!.trade as Trade;
  const name = str(f, 'name', 60);
  const tiers = ['standard'] as Tier[]; // one price per job; levels are no longer used
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => f.get(`day_${d}`));
  const start = str(f, 'start') || '08:00', end = str(f, 'end') || '18:00';
  const services = [...f.keys()].filter((k) => k.startsWith('svc_')).map((k) => k.slice(4))
    .filter((id) => serviceById(id)?.trade === trade)
    .map((id) => { const v = Number(str(f, `price_${id}`)); return { service_id: id, price: v > 0 ? v : null }; });
  if (name.length < 3) return { error: 'Enter your name as clients will see it.' };
  if (!services.length) return { error: 'Choose at least one service you offer.' };
  if (!days.length || end <= start) return { error: 'Set your working days and hours.' };
  const newPhoto = str(f, 'photo_url', 500);
  const uniform = isHex(f.get('uniform')) ? String(f.get('uniform')) : null;
  const { error } = await sb.from('pros').update({
    display_name: name, tiers, years_exp: Number(str(f, 'years')) || 0, area: str(f, 'area', 60), bio: str(f, 'bio', 300),
    experience: str(f, 'experience', 2000) || null,
    skills: str(f, 'skills', 300).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12),
    languages: str(f, 'languages', 120).split(',').map((x) => x.trim()).filter(Boolean),
    insured: Boolean(f.get('insured')), uniform_color: uniform, accent: uniform || !cur!.figure_url ? accentFromUniform(uniform) : cur!.accent, // the full-height photo sets its own glow colour
    photo_url: newPhoto && ownPhotoUrl(newPhoto, me.id) ? newPhoto : cur!.photo_url,
  }).eq('id', me.id);
  if (error) return { error: error.message };
  // Keep job counters: services that are no longer offered are switched off, not deleted.
  await sb.from('pro_services').update({ active: false }).eq('pro_id', me.id).not('service_id', 'in', `(${services.map((x) => x.service_id).join(',')})`);
  const { error: e2 } = await sb.from('pro_services').upsert(services.map((x) => ({ ...x, pro_id: me.id, active: true })), { onConflict: 'pro_id,service_id' });
  if (e2) return { error: e2.message };
  await sb.from('availability_rules').delete().eq('pro_id', me.id);
  await sb.from('availability_rules').insert(days.map((weekday) => ({ pro_id: me.id, weekday, start_time: start, end_time: end })));
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
