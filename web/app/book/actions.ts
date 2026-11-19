'use server';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { CITIES } from '@/lib/areas';
import { marketMid, roundPrice, serviceById } from '@/lib/catalog';
import { getLang } from '@/lib/i18n';
import { makeT, svcName } from '@/lib/i18n-core';
import { ownPhotoUrl } from '@/lib/photos';
import { requestToPro } from '@/lib/requests';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export type BookState = { error?: string; demo?: boolean } | undefined;

export async function createBooking(_prev: BookState, form: FormData): Promise<BookState> {
  const get = (k: string) => String(form.get(k) ?? '').trim();
  const proSlug = get('pro'), companySlug = get('company'), svcId = get('svc'), t = get('t'), dayPref = get('day');
  const estimate = Boolean(get('estimate')) && Boolean(proSlug);
  const address = get('address').slice(0, 200), notes = get('notes').slice(0, 2000);
  const city = CITIES.some((c) => c.name === get('city')) ? get('city') : '', zip = /^\d{5}$/.test(get('zip')) ? get('zip') : '';
  if (!proSlug && !companySlug) return { error: 'Choose a pro or a company.' };
  if (estimate && !city && !zip) return { error: 'Choose your city or enter a ZIP code.' };
  if (estimate && !svcId && notes.length < 5) return { error: 'Describe the job in a few words or choose a service.' };
  if (!estimate && !address) return { error: 'Please enter the job address.' };
  if (proSlug && !estimate && !t) return { error: 'Please pick a time.' };
  if (!isLive()) return { demo: true };

  const back = `/book?${new URLSearchParams({ ...(proSlug ? { pro: proSlug } : { company: companySlug }), ...(estimate ? { estimate: '1' } : {}), ...(svcId ? { svc: svcId } : {}) })}`;
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(back)}`);
  const sb = await supabaseServer();
  const svc = svcId ? serviceById(svcId) : undefined;
  const photos = form.getAll('photo_url').map(String).filter((u) => ownPhotoUrl(u, me.id)).slice(0, 6);
  const [refKind, refId] = get('ref').split(':');
  const ref = /^[0-9a-f-]{36}$/.test(refId ?? '') ? { post: refKind === 'post' ? refId : null, photo: refKind === 'photo' ? refId : null } : undefined;

  if (proSlug) {
    const { data: pro } = await sb.from('pros').select('id').eq('slug', proSlug).maybeSingle();
    if (!pro) return { error: 'This pro is not available.' };
    if (estimate) {
      // An estimate is a conversation first: the pro answers or sends a quote in the chat.
      const lang = await getLang(); const tr = makeT(lang);
      const msg = [`📋 ${tr('Estimate request')}${svc ? `: ${svcName(svc, lang)}` : ''}`, `${tr('Area')}: ${[city, zip].filter(Boolean).join(' ')}`, notes].filter(Boolean).join('\n');
      const conv = await requestToPro(sb, me.id, pro.id, msg, photos, ref);
      if (!conv) return { error: 'This pro does not take messages right now.' };
      redirect(`/messages/${conv}?sent=estimate`);
    }
    let price: number | null = null;
    if (svc) {
      const { data: ps } = await sb.from('pro_services').select('price').eq('pro_id', pro.id).eq('service_id', svc.id).maybeSingle();
      price = roundPrice(Number(ps?.price ?? marketMid(svc)));
    }
    const { data, error } = await sb.from('bookings').insert({ client_id: me.id, service_id: svc?.id ?? null, address, notes: notes || null, photos,
      pro_id: pro.id, chosen_by: 'client', status: 'requested', starts_at: t || null, price_estimate: price }).select('id').single();
    if (error) return { error: nice(error.message) };
    if (ref) await sb.from('work_requests').insert({ client_id: me.id, pro_id: pro.id, post_id: ref.post, photo_id: ref.photo });
    redirect(`/orders/${data.id}?sent=1`);
  }
  const { data: co } = await sb.from('companies').select('id').eq('slug', companySlug).maybeSingle();
  if (!co) return { error: 'This company is not available.' };
  const { data, error } = await sb.from('bookings').insert({ client_id: me.id, service_id: svc?.id ?? null, address, notes: notes || null, photos,
    company_id: co.id, chosen_by: 'office', status: 'assigning', day_pref: ['today', 'tomorrow', 'week'].includes(dayPref) ? dayPref : 'week',
    price_estimate: svc ? roundPrice(marketMid(svc)) : null }).select('id').single();
  if (error) return { error: nice(error.message) };
  redirect(`/orders/${data.id}?sent=1`);
}

const nice = (m: string) => m.includes('bookings_no_double') ? 'That time was just taken. Please pick another.'
  : m.includes('pro not accepting') ? 'This pro is not taking new jobs right now.'
  : m.includes('demo profile') ? 'This is an example profile. It shows how NovaFides works; requests cannot be sent to it.' : 'Something went wrong. Please try again.';
