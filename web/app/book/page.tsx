/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Figure from '@/components/Figure';
import PhotoPicker from '@/components/PhotoPicker';
import { priceFor } from '@/components/ProCard';
import { CITIES } from '@/lib/areas';
import { marketMid, roundPrice, SERVICES, serviceById, usd } from '@/lib/catalog';
import { getCompany, getPro, openSlots } from '@/lib/data';
import { slotLabel } from '@/lib/time';
import BookForm from './BookForm';
import { getLang } from '@/lib/i18n';
import { makeT, svcName } from '@/lib/i18n-core';
import { postById } from '@/lib/social';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'Book' };
type SP = Promise<Record<string, string | undefined>>;

export default async function Book({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams; const lang = await getLang(); const tr = makeT(lang);
  const pro = sp.pro ? await getPro(sp.pro) : null;
  const company = !pro && sp.company ? await getCompany(sp.company) : null;
  if (!pro && !company) notFound();
  const estimate = Boolean(sp.estimate) && Boolean(pro);
  const mode = estimate ? 'estimate' : pro ? 'book' : 'company';
  const trade = (pro ?? company)!.trade;
  const svcOptions = pro ? pro.services.map((s) => serviceById(s.id)!).filter(Boolean) : SERVICES.filter((s) => s.trade === trade);
  // "I have the same problem": the work example the client started from.
  const [refKind, refId] = (sp.ref ?? '').split(':');
  const refPost = refKind === 'post' && refId ? await postById(refId) : null;
  const refPhoto = refKind === 'photo' && refId && isLive() ? (await (await supabaseServer()).from('pro_photos').select('id, url, kind, service_id').eq('id', refId).maybeSingle()).data : null;
  const svcId = sp.svc ?? refPhoto?.service_id ?? undefined;
  const svc = svcId ? serviceById(svcId) : undefined;
  const slots = pro ? openSlots(pro) : [];
  const accent = pro?.accent ?? company!.accent;
  const name = pro?.name ?? company!.name;
  const price = (id: string) => { const s = serviceById(id); return s ? (pro ? priceFor(pro, id) : roundPrice(marketMid(s))) : null; };
  const demo = pro?.isDemo;

  return (
    <section className="sec pad" style={{ ['--acc' as string]: accent }}><div className="in" style={{ maxWidth: 720 }}>
      <div className="eyebrow">{estimate ? tr('Estimate request') : pro ? tr('Booking') : tr('Request a visit')}</div>
      <h2>{estimate ? tr('Ask {name} for an estimate', { name }) : pro ? tr('Book {name}', { name }) : tr('{name}: the office assigns a technician', { name })}</h2>
      {pro && <div className="card pc" style={{ marginBottom: 16 }}>
        <span className="fig"><Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} /></span>
        <span><b>{pro.name}</b><br /><span className="mu sm">{pro.company?.name ?? tr('Independent pro')}{pro.rating != null && pro.reviewCount > 0 ? ` · ★ ${pro.rating.toFixed(1)}` : ''}</span></span>
        <Link href={`/pro/${pro.slug}`} className="btn ghost sm side">{tr('Profile')}</Link>
      </div>}
      {(refPost || refPhoto) && <div className="card refwork" style={{ marginBottom: 16 }}>
        <img src={refPost?.photos[0] ?? refPhoto?.url ?? ''} alt="" />
        <span><span className="mu xs">{tr('Like this job of {name}', { name: pro?.name.split(' ')[0] ?? name })}</span><br />{refPost?.body ? <span className="sm">{refPost.body.slice(0, 160)}</span> : svc && <b>{svcName(svc, lang)}</b>}</span>
      </div>}
      {demo && <div className="note" style={{ marginBottom: 16 }}>🧪 {tr('This is an example profile: the form shows how it works, but sending is turned off. With a real pro, your request goes to them.')}</div>}

      {<BookForm off={Boolean(demo)} cta={estimate ? tr('Send to {name}', { name: name.split(' ')[0] }) : pro ? tr('Send booking request') : tr('Request a visit')}
        hidden={{ ...(pro ? { pro: pro.slug } : { company: company!.slug }), ...(estimate ? { estimate: '1' } : {}), ...(sp.ref ? { ref: sp.ref } : {}) }}
        summary={{ mode, to: name, svc: svc?.id, t: sp.t, trip: pro ? tr('{fee}, credited if you hire', { fee: usd(pro.tripFee) }) : tr('Set by the company'),
          urgent: pro?.urgent && pro.urgentFee ? `+${usd(pro.urgentFee)}` : undefined,
          services: Object.fromEntries(svcOptions.map((s) => [s.id, { name: svcName(s, lang), price: price(s.id) }])),
          slots: Object.fromEntries(slots.slice(0, 18).map((x) => [x, slotLabel(x, tr).join(' · ')])) }}>
        <div className="card step">
          <h3><i>1</i>{tr('What needs doing')}</h3>
          <select className="inp" name="svc" defaultValue={svc?.id ?? ''}>
            <option value="">{estimate ? tr('Not sure / not in the list') : tr('Choose a service')}</option>
            {svcOptions.map((s) => <option key={s.id} value={s.id}>{svcName(s, lang)}{price(s.id) != null ? ` · ≈ ${usd(price(s.id)!)}` : ''}</option>)}
          </select>
          <textarea className="inp" name="notes" maxLength={2000} placeholder={tr('What happened, where in the house, since when. E.g. “Water drips under the kitchen sink when the dishwasher runs.”')} style={{ minHeight: 80 }} />
          <PhotoPicker name="photo_url" prefix="request" max={6} label={tr('Add photos of the problem')} />
          <span className="mu xs">{tr('Photos help the pro understand the job before coming. No faces or house numbers, please.')}</span>
        </div>

        {mode !== 'estimate' && <div className="card step">
          <h3><i>2</i>{tr('When')}</h3>
          {pro ? (
            <div className="tbtn">
              {slots.slice(0, 18).map((t) => { const [d, h] = slotLabel(t, tr); return <label key={t}><input type="radio" name="t" value={t} defaultChecked={t === sp.t} required />{d} · {h}</label>; })}
              {!slots.length && <span className="mu">{tr('No open times. Send an estimate request instead.')}</span>}
            </div>
          ) : (
            <div className="tbtn">
              {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'This week']].map(([v, l], i) => <label key={v}><input type="radio" name="day" value={v} defaultChecked={i === 0} />{tr(l)}</label>)}
            </div>
          )}
          {pro && <Link className="xs" href={`/book?${new URLSearchParams({ pro: pro.slug, estimate: '1', ...(svc ? { svc: svc.id } : {}), ...(sp.ref ? { ref: sp.ref } : {}) })}`}>{tr('Need to discuss first? Ask for an estimate instead')} →</Link>}
        </div>}

        <div className="card step">
          <h3><i>{mode === 'estimate' ? 2 : 3}</i>{mode === 'estimate' ? tr('Where') : tr('Address')}</h3>
          {mode === 'estimate' ? <div className="chips">
            <select className="inp" name="city" defaultValue="" style={{ width: 'auto' }} aria-label={tr('City')}><option value="">{tr('City')}…</option>{CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
            <input className="inp" name="zip" inputMode="numeric" maxLength={5} placeholder="ZIP" aria-label="ZIP" style={{ width: 110 }} />
            <span className="mu xs" style={{ flexBasis: '100%' }}>{tr('City or ZIP is enough for an estimate. The full address is needed only when you pick a visit time.')}</span>
          </div>
            : <><input className="inp" name="address" required placeholder={tr('Street, city')} autoComplete="street-address" aria-label={tr('Job address')} />
              <span className="mu xs">{tr('Your address is shared only with the pro or office you book.')}</span></>}
        </div>
      </BookForm>}
    </div></section>
  );
}
