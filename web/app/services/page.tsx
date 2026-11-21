import Link from 'next/link';
import { GROUPS, SERVICES, TRADES, usd, type Trade } from '@/lib/catalog';
import { CITIES } from '@/lib/areas';
import { citySlug } from '@/lib/seo';
import { getLang } from '@/lib/i18n';
import { makeT, svcName } from '@/lib/i18n-core';

export const metadata = { title: 'Home services and typical Bay Area prices', description: 'Typical Bay Area prices for plumbing, electrical, handyman and building jobs, and verified pros who do them.' };

/** All services with typical Bay Area price ranges, grouped by trade. */
export default async function Services() {
  const lang = await getLang(); const tr = makeT(lang);
  const gname = (t: Trade, g: string) => { const s = SERVICES.find((x) => x.trade === t && x.group === g); return lang === 'ru' ? s?.groupRu ?? g : lang === 'es' ? s?.groupEs ?? g : g; };
  return (
    <section className="sec pad"><div className="in">
      <div className="eyebrow">{tr('Bay Area · San Francisco to San Jose')}</div>
      <h2>{tr('Services and typical prices')}</h2>
      <p className="mu" style={{ maxWidth: '64ch' }}>{tr('Typical totals for the Bay Area (labor and standard parts). Your pro gives the exact price in a quote before the work starts.')}</p>
      {GROUPS.map(({ trade, groups }) => (
        <div key={trade} style={{ marginTop: 26 }}>
          <h3 id={trade}>{tr(TRADES[trade].name)}</h3>
          <div className="svc-groups">
            {groups.map((g) => (
              <div key={g} className="card svc-group"><b>{gname(trade, g)}</b>
                <ul>{SERVICES.filter((s) => s.trade === trade && s.group === g).map((s) => (
                  <li key={s.id}><Link href={`/services/${s.id}`}>{svcName(s, lang)}</Link> <span className="mu xs">{usd(s.lo)}–{usd(s.hi)}{s.unit !== 'job' ? ` ${tr(s.unit)}` : ''}</span></li>))}</ul>
              </div>))}
          </div>
        </div>))}
      <h3 style={{ marginTop: 30 }}>{tr('Pros by city')}</h3>
      <div className="chips">{CITIES.map((c) => <Link key={c.name} className="chip" href={`/near/${citySlug(c.name)}`}>{c.name}</Link>)}</div>
    </div></section>
  );
}
