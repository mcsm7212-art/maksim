'use server';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { serviceById, slugify, TIER_KEYS, TRADES, type Tier, type Trade } from '@/lib/catalog';
import { accentFromUniform, isHex } from '@/lib/colors';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export type JoinState = { error?: string; demo?: boolean } | undefined;
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

async function uploadPhoto(uid: string, file: FormDataEntryValue | null, name: string) {
  if (!(file instanceof File) || !file.size) return null;
  if (file.size > 8 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Photo must be a JPG, PNG or WEBP under 8 MB.');
  const sb = await supabaseServer();
  const path = `${uid}/${name}-${Date.now()}.${file.type.split('/')[1]}`;
  const { error } = await sb.storage.from('photos').upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export async function registerPro(_p: JoinState, f: FormData): Promise<JoinState> {
  const name = str(f, 'name', 60), trade = str(f, 'trade') as Trade, license = str(f, 'license', 12).replace(/\D/g, '');
  const invite = str(f, 'invite', 40);
  const tiers = TIER_KEYS.filter((t) => f.get(`tier_${t}`)) as Tier[];
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => f.get(`day_${d}`));
  const start = str(f, 'start') || '08:00', end = str(f, 'end') || '18:00';
  const services = [...f.keys()].filter((k) => k.startsWith('svc_')).map((k) => k.slice(4))
    .filter((id) => serviceById(id)?.trade === trade)
    .map((id) => { const v = Number(str(f, `price_${id}`)); return { service_id: id, price: v > 0 ? v : null }; });

  if (name.length < 3) return { error: 'Enter your name as clients will see it.' };
  if (!(trade in TRADES)) return { error: 'Choose your trade.' };
  if (trade !== 'handyman' && !invite && license.length < 6) return { error: `A CSLB ${TRADES[trade].license} license number is required for ${TRADES[trade].name.toLowerCase()}.` };
  if (!tiers.length) return { error: 'Choose at least one service level.' };
  if (!services.length) return { error: 'Choose at least one service you offer.' };
  if (!days.length || end <= start) return { error: 'Set your working days and hours.' };
  if (!isLive()) return { demo: true };

  const me = await getMe();
  if (!me) redirect('/login?next=/join/pro');
  if (me.pro) redirect('/account');
  const sb = await supabaseServer();
  let photo: string | null = null;
  try { photo = await uploadPhoto(me.id, f.get('photo'), 'pro'); } catch (e) { return { error: (e as Error).message }; }
  const uniform = isHex(f.get('uniform')) ? String(f.get('uniform')) : null;
  const { error } = await sb.from('pros').insert({
    id: me.id, slug: await uniqueSlug('pros', name), display_name: name, trade, tiers,
    years_exp: Number(str(f, 'years')) || 0, area: str(f, 'area', 60), bio: str(f, 'bio', 600),
    languages: str(f, 'languages', 120).split(',').map((s) => s.trim()).filter(Boolean),
    license_no: license || null, license_status: license ? 'pending' : 'none', insured: Boolean(f.get('insured')),
    photo_url: photo, uniform_color: uniform, accent: accentFromUniform(uniform),
  });
  if (error) return { error: error.message };
  await sb.from('pro_services').insert(services.map((s) => ({ ...s, pro_id: me.id })));
  await sb.from('availability_rules').insert(days.map((weekday) => ({ pro_id: me.id, weekday, start_time: start, end_time: end })));
  if (me.role === 'client') await sb.rpc('become', { new_role: 'pro' });
  if (invite) { const { error: e } = await sb.rpc('accept_invite', { invite_code: invite }); if (e) return { error: `Profile saved, but the invite failed: ${e.message}` }; }
  redirect('/account?joined=pro');
}

export async function registerCompany(_p: JoinState, f: FormData): Promise<JoinState> {
  const name = str(f, 'name', 80), trade = str(f, 'trade') as Trade, license = str(f, 'license', 12).replace(/\D/g, '');
  const accent = isHex(f.get('accent')) ? String(f.get('accent')) : '#B57A50';
  const base = ['dark', 'graphite', 'light', 'teal'].includes(str(f, 'base')) ? str(f, 'base') : 'dark';
  if (name.length < 3) return { error: 'Enter the company name.' };
  if (!(trade in TRADES)) return { error: 'Choose the main trade.' };
  if (trade !== 'handyman' && license.length < 6) return { error: 'A CSLB license number is required.' };
  if (!isLive()) return { demo: true };

  const me = await getMe();
  if (!me) redirect('/login?next=/join/company');
  if (me.companies.length) redirect('/business');
  const sb = await supabaseServer();
  let logo: string | null = null;
  try { logo = await uploadPhoto(me.id, f.get('logo'), 'logo'); } catch (e) { return { error: (e as Error).message }; }
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
