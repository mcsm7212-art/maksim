import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProCard from '@/components/ProCard';
import { CITIES, milesBetween } from '@/lib/areas';
import { miles, proPoint } from '@/lib/geo';
import { TRADES, type Trade, TRADE_KEYS } from '@/lib/catalog';
import { listPros } from '@/lib/data';
import { getLang } from '@/lib/i18n';
import { makeT } from '@/lib/i18n-core';
import { cityBySlug, citySlug, SITE } from '@/lib/seo';

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props) {
  const c = cityBySlug((await params).city);
  if (!c) return { title: 'City not found', robots: { index: false } };
  return {
    title: `Plumbers, electricians, handymen and builders in ${c.name}`,
    description: `Verified home pros who work in and near ${c.name}, CA: real photos, real work, honest reviews. Compare pros and ask up to three; your request goes only to the ones you choose. Free for clients.`,
    alternates: { canonical: `${SITE}/near/${citySlug(c.name)}` },
  };
}

/** Pros who work in or near one Bay Area city, by trade. */
export default async function CityPage({ params }: Props) {
  const c = cityBySlug((await params).city); if (!c) notFound();
  const lang = await getLang(); const tr = makeT(lang);
  const all = await listPros();
  const here = { lat: c.lat, lng: c.lon };
  const dist = (p: (typeof all)[number]) => { const pp = proPoint(p); return pp ? miles(here, pp) : 99; };
  // In the pro's map circle, or within 12 miles when the pro has not drawn one.
  const near = all.filter((p) => (p.serviceArea ? dist(p) <= p.serviceArea.radius + 0.5 : dist(p) <= 12)).sort((a, b) => dist(a) - dist(b) || (b.rankScore ?? 0) - (a.rankScore ?? 0));
  const others = CITIES.filter((x) => x.name !== c.name).sort((a, b) => (milesBetween(c.name, a.name) ?? 99) - (milesBetween(c.name, b.name) ?? 99)).slice(0, 8);
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 900 }}>
      <div className="eyebrow">{tr('Bay Area · San Francisco to San Jose')}</div>
      <h2>{tr('Home pros in {city}', { city: c.name })}</h2>
      <p className="mu" style={{ maxWidth: '64ch' }}>{tr('Verified pros who work in and near {city}: real photos, their own work and honest reviews. Compare them and ask up to three; your request goes only to the ones you choose.', { city: c.name })}</p>
      <div className="chips"><Link className="btn" href={`/search?loc=${encodeURIComponent(c.name)}`}>{tr('Find a pro')}</Link><Link className="btn ghost" href="/services">{tr('Services and typical prices')}</Link></div>
      {TRADE_KEYS.map((t) => {
        const list = near.filter((p) => p.trade === t).slice(0, 4);
        return (
          <div key={t} style={{ marginTop: 24 }}>
            <h3>{tr(TRADES[t].name)}</h3>
            <div className="list">{list.map((p) => <ProCard key={p.id} pro={p} />)}
              {!list.length && <div className="card empty">{tr('No verified pros here yet. Pros are joining now.')} <Link href={`/search?trade=${t}&loc=${encodeURIComponent(c.name)}`}>{tr('Search nearby')}</Link></div>}</div>
          </div>);
      })}
      <h3 style={{ marginTop: 26 }}>{tr('Nearby cities')}</h3>
      <div className="chips">{others.map((x) => <Link key={x.name} className="chip" href={`/near/${citySlug(x.name)}`}>{x.name}</Link>)}</div>
    </div></section>
  );
}
