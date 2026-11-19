'use server';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { marketMid, roundPrice, serviceById, TIER_KEYS, TIERS, type Tier } from '@/lib/catalog';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export type BookState = { error?: string; demo?: boolean } | undefined;

export async function createBooking(_prev: BookState, form: FormData): Promise<BookState> {
  const get = (k: string) => String(form.get(k) ?? '').trim();
  const proSlug = get('pro'), companySlug = get('company'), svcId = get('svc'), t = get('t'), dayPref = get('day');
  const tier = (TIER_KEYS.includes(get('tier') as Tier) ? get('tier') : 'standard') as Tier;
  const address = get('address'), notes = get('notes');
  if (!address) return { error: 'Please enter the job address.' };
  if (!proSlug && !companySlug) return { error: 'Choose a pro or a company.' };
  if (proSlug && !t && !get('estimate')) return { error: 'Please pick a time.' };
  if (!isLive()) return { demo: true };

  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/book?${proSlug ? `pro=${proSlug}` : `company=${companySlug}`}`)}`);
  const sb = await supabaseServer();
  const svc = svcId ? serviceById(svcId) : undefined;
  let row: Record<string, unknown> = { client_id: me.id, service_id: svc?.id ?? null, tier, address, notes: notes || null };

  if (proSlug) {
    const { data: pro } = await sb.from('pros').select('id').eq('slug', proSlug).maybeSingle();
    if (!pro) return { error: 'This pro is not available.' };
    let price: number | null = null;
    if (svc) {
      const { data: ps } = await sb.from('pro_services').select('price').eq('pro_id', pro.id).eq('service_id', svc.id).maybeSingle();
      price = roundPrice(Number(ps?.price ?? marketMid(svc)) * TIERS[tier].multiplier);
    }
    row = { ...row, pro_id: pro.id, chosen_by: 'client', status: 'requested', starts_at: t || null, day_pref: t ? null : 'week', price_estimate: price };
  } else {
    const { data: co } = await sb.from('companies').select('id').eq('slug', companySlug).maybeSingle();
    if (!co) return { error: 'This company is not available.' };
    row = { ...row, company_id: co.id, chosen_by: 'office', status: 'assigning', day_pref: ['today', 'tomorrow', 'week'].includes(dayPref) ? dayPref : 'week',
      price_estimate: svc ? roundPrice(marketMid(svc) * TIERS[tier].multiplier) : null };
  }
  const { data, error } = await sb.from('bookings').insert(row).select('id').single();
  if (error) return { error: error.message.includes('bookings_no_double') ? 'That time was just taken. Please pick another.' : error.message.includes('pro not accepting') ? 'This pro is not taking new jobs right now.' : error.message };
  redirect(`/account?booked=${data.id}`);
}
