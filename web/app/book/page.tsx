import Link from 'next/link';
import { notFound } from 'next/navigation';
import Figure from '@/components/Figure';
import { priceFor } from '@/components/ProCard';
import { marketMid, roundPrice, SERVICES, serviceById, TIER_KEYS, TIERS, usd, type Tier } from '@/lib/catalog';
import { getCompany, getPro, openSlots } from '@/lib/data';
import { slotLabel } from '@/lib/time';
import BookForm from './BookForm';

export const metadata = { title: 'Book' };
type SP = Promise<Record<string, string | undefined>>;

export default async function Book({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
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
      <div className="eyebrow">{estimate ? 'Estimate request' : pro ? 'Booking' : 'Request a visit'}</div>
      <h2>{estimate ? `Ask ${name} for an estimate` : pro ? `Book ${name}` : `${name}: the office assigns a technician`}</h2>
      {pro && <div className="card pc" style={{ marginBottom: 16 }}>
        <span className="fig"><Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} /></span>
        <span><b>{pro.name}</b><br /><span className="mu sm">{pro.company?.name ?? 'Independent pro'} · ★ {pro.rating?.toFixed(2) ?? 'new'}</span></span>
        <Link href={`/pro/${pro.slug}`} className="btn ghost sm side">Profile</Link>
      </div>}

      <BookForm cta={estimate ? 'Send estimate request' : pro ? 'Send booking request' : 'Request a visit'}
        hidden={{ ...(pro ? { pro: pro.slug } : { company: company!.slug }), ...(estimate ? { estimate: '1' } : {}) }}>
        <div className="card step">
          <h3><i>1</i>Service</h3>
          <select className="inp" name="svc" defaultValue={svc?.id ?? ''}>
            <option value="">{estimate ? 'Not sure / not in the list' : 'Choose a service'}</option>
            {svcOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="tbtn" role="radiogroup" aria-label="Service level">
            {tiers.map((t) => <label key={t}><input type="radio" name="tier" value={t} defaultChecked={t === tier} />{TIERS[t].name}</label>)}
          </div>
          <span className="mu xs">{TIERS[tier].blurb}{price != null && ` Estimated ${usd(price)} for ${svc!.name}.`}</span>
        </div>

        <div className="card step">
          <h3><i>2</i>When</h3>
          {pro && !estimate ? (
            <div className="tbtn">
              {slots.slice(0, 18).map((t) => { const [d, h] = slotLabel(t); return <label key={t}><input type="radio" name="t" value={t} defaultChecked={t === sp.t} required />{d} · {h}</label>; })}
              {!slots.length && <span className="mu">No open times. Send an estimate request instead.</span>}
            </div>
          ) : (
            <div className="tbtn">
              {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'This week']].map(([v, l], i) => <label key={v}><input type="radio" name="day" value={v} defaultChecked={i === 0} />{l}</label>)}
            </div>
          )}
        </div>

        <div className="card step">
          <h3><i>3</i>Where and what</h3>
          <label className="f">Job address<input className="inp" name="address" required placeholder="Street, city" autoComplete="street-address" /></label>
          <label className="f">Describe the problem<textarea className="inp" name="notes" placeholder="What happened, where, how urgent. You can send photos in chat after booking." /></label>
          <span className="mu xs">Your address is shared only with the pro or office you book.</span>
        </div>
      </BookForm>
    </div></section>
  );
}
