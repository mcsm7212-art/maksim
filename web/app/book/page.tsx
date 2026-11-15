import Link from 'next/link';
import { notFound } from 'next/navigation';
import Figure from '@/components/Figure';
import { priceFor } from '@/components/ProCard';
import { marketMid, roundPrice, SERVICES, serviceById, TIER_KEYS, TIERS, usd, type Tier } from '@/lib/catalog';
import { getCompany, getPro, openSlots } from '@/lib/data';
import { slotLabel } from '@/lib/time';
import BookForm from './BookForm';
import { getLang } from '@/lib/i18n';
import { makeT, svcName } from '@/lib/i18n-core';

export const metadata = { title: 'Book' };
type SP = Promise<Record<string, string | undefined>>;

export default async function Book({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams; const lang = await getLang(); const tr = makeT(lang);
  const pro = sp.pro ? await getPro(sp.pro) : null;
  const company = !pro && sp.company ? await getCompany(sp.company) : null;
  if (!pro && !company) notFound();
  const estimate = Boolean(sp.estimate);
  const trade = (pro ?? company)!.trade;
  const tiers: Tier[] = pro ? pro.tiers : TIER_KEYS;
  const tier: Tier = tiers.includes(sp.tier as Tier) ? (sp.tier as Tier) : tiers.includes('standard') ? 'standard' : tiers[0];
  const svcOptions = pro ? pro.services.map((s) => serviceById(s.id)!).filter(Boolean) : SERVICES.filter((s) => s.trade === trade);
  const svc = sp.svc ? serviceById(sp.svc) : undefined;
  const slots = pro ? openSlots(pro) : [];
  const price = svc ? (pro ? priceFor(pro, svc.id, tier) : roundPrice(marketMid(svc) * TIERS[tier].multiplier)) : null;
  const accent = pro?.accent ?? company!.accent;
  const name = pro?.name ?? company!.name;

  return (
    <section className="sec pad" style={{ ['--acc' as string]: accent }}><div className="in" style={{ maxWidth: 720 }}>
      <div className="eyebrow">{estimate ? tr('Estimate request') : pro ? tr('Booking') : tr('Request a visit')}</div>
      <h2>{estimate ? tr('Ask {name} for an estimate', { name }) : pro ? tr('Book {name}', { name }) : tr('{name}: the office assigns a technician', { name })}</h2>
      {pro && <div className="card pc" style={{ marginBottom: 16 }}>
        <span className="fig"><Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} /></span>
        <span><b>{pro.name}</b><br /><span className="mu sm">{pro.company?.name ?? tr('Independent pro')} · ★ {pro.rating?.toFixed(2) ?? tr('new')}</span></span>
        <Link href={`/pro/${pro.slug}`} className="btn ghost sm side">{tr('Profile')}</Link>
      </div>}

      <BookForm cta={estimate ? tr('Send estimate request') : pro ? tr('Send booking request') : tr('Request a visit')}
        hidden={{ ...(pro ? { pro: pro.slug } : { company: company!.slug }), ...(estimate ? { estimate: '1' } : {}) }}>
        <div className="card step">
          <h3><i>1</i>{tr('Service')}</h3>
          <select className="inp" name="svc" defaultValue={svc?.id ?? ''}>
            <option value="">{estimate ? tr('Not sure / not in the list') : tr('Choose a service')}</option>
            {svcOptions.map((s) => <option key={s.id} value={s.id}>{svcName(s, lang)}</option>)}
          </select>
          <div className="tbtn" role="radiogroup" aria-label={tr('Service level')}>
            {tiers.map((t) => <label key={t}><input type="radio" name="tier" value={t} defaultChecked={t === tier} />{tr(TIERS[t].name)}</label>)}
          </div>
          <span className="mu xs">{tr(TIERS[tier].blurb)}{price != null && ` ${tr('Estimated {price} for {svc}.', { price: usd(price), svc: svcName(svc, lang) })}`}</span>
        </div>

        <div className="card step">
          <h3><i>2</i>{tr('When')}</h3>
          {pro && !estimate ? (
            <div className="tbtn">
              {slots.slice(0, 18).map((t) => { const [d, h] = slotLabel(t, tr); return <label key={t}><input type="radio" name="t" value={t} defaultChecked={t === sp.t} required />{d} · {h}</label>; })}
              {!slots.length && <span className="mu">{tr('No open times. Send an estimate request instead.')}</span>}
            </div>
          ) : (
            <div className="tbtn">
              {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'This week']].map(([v, l], i) => <label key={v}><input type="radio" name="day" value={v} defaultChecked={i === 0} />{tr(l)}</label>)}
            </div>
          )}
        </div>

        <div className="card step">
          <h3><i>3</i>{tr('Where and what')}</h3>
          <label className="f">{tr('Job address')}<input className="inp" name="address" required placeholder={tr('Street, city')} autoComplete="street-address" /></label>
          <label className="f">{tr('Describe the problem')}<textarea className="inp" name="notes" placeholder={tr('What happened, where, how urgent. You can send photos in chat after booking.')} /></label>
          <span className="mu xs">{tr('Your address is shared only with the pro or office you book.')}</span>
        </div>
      </BookForm>
    </div></section>
  );
}
