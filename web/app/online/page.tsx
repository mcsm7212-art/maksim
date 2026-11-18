import Link from 'next/link';
import AreaMap from '@/components/AreaMap';
import ProCard from '@/components/ProCard';
import { cityOf } from '@/lib/areas';
import { TRADES, type Trade } from '@/lib/catalog';
import { listPros } from '@/lib/data';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'Online now' };
export const dynamic = 'force-dynamic';

export default async function Online({ searchParams }: { searchParams: Promise<{ trade?: string; city?: string; urgent?: string }> }) {
  const sp = await searchParams; const tr = await getT();
  const trade = (sp.trade && sp.trade in TRADES ? sp.trade : null) as Trade | null;
  const urgent = sp.urgent === '1';
  const allOnline = (await listPros({ trade })).filter((p) => p.online);
  const urgentN = allOnline.filter((p) => p.urgent).length;
  const online = urgent ? allOnline.filter((p) => p.urgent) : allOnline;
  const withCity = online.map((p) => ({ p, city: cityOf(p.onlineArea) ?? cityOf(p.area) }));
  const counts: Record<string, number> = {};
  withCity.forEach(({ city }) => { if (city) counts[city] = (counts[city] ?? 0) + 1; });
  const city = sp.city && counts[sp.city] !== undefined ? sp.city : sp.city ?? null;
  const shown = withCity.filter((x) => !city || x.city === city).sort((a, b) => Number(b.p.urgent) - Number(a.p.urgent) || (b.p.rating ?? 0) - (a.p.rating ?? 0));
  const href = (patch: { trade?: string | null; city?: string | null; urgent?: boolean }) => {
    const q = new URLSearchParams();
    const t = patch.trade !== undefined ? patch.trade : trade; const c = patch.city !== undefined ? patch.city : city; const u = patch.urgent !== undefined ? patch.urgent : urgent;
    if (u) q.set('urgent', '1'); if (t) q.set('trade', t); if (c) q.set('city', c);
    return `/online${q.size ? `?${q}` : ''}`;
  };
  return (
    <section className="sec pad"><div className="in">
      <div className="eyebrow" style={{ color: 'var(--ok)' }}>● {tr('Live')}</div>
      <h2>{urgent ? `⚡ ${tr('Urgent help')}` : tr('Online now')}: {tr(online.length === 1 ? '{n} pro' : '{n} pros', { n: online.length })}</h2>
      <p className="mu" style={{ maxWidth: '62ch' }}>{urgent ? tr('Pros who are online right now and said they take urgent calls. Message or book them directly. Some charge an extra urgent call-out fee: it is shown on their page.') : tr('Pros who switched on “Online now” and can come soon. The map shows only the city they work in right now, never an exact location. Tap a city to see who is there.')}</p>
      <div className="chips" style={{ marginTop: 14 }}>
        <Link className="chip" aria-pressed={!urgent} href={href({ urgent: false })}>● {tr('All online')} ({allOnline.length})</Link>
        <Link className="chip" aria-pressed={urgent} href={href({ urgent: true })}>⚡ {tr('Urgent calls')} ({urgentN})</Link>
      </div>
      {urgent && <p className="mu2 xs" style={{ marginTop: 8 }}>{tr('Smell gas? Leave the house first and call PG&E at 1-800-743-5000 or 911.')}</p>}
      <div className="chips" style={{ margin: '10px 0 14px' }}>
        <Link className="chip" aria-pressed={!trade} href={href({ trade: null })}>{tr('All trades')}</Link>
        {(Object.keys(TRADES) as Trade[]).map((t) => <Link key={t} className="chip" aria-pressed={trade === t} href={href({ trade: t })}>{tr(TRADES[t].name)}</Link>)}
      </div>
      <AreaMap counts={counts} selected={city} hrefFor={(c) => href({ city: c })} />
      <div className="mu xs" style={{ marginTop: 6 }}>{tr('Schematic map, not to scale.')}</div>
      <h3 style={{ marginTop: 22 }}>{city ? tr('In {city}', { city }) : tr('All online pros')} {city && <Link className="xs" href={href({ city: null })} style={{ marginLeft: 8 }}>{tr('show all')}</Link>}</h3>
      <div className="list">
        {shown.map(({ p, city: c }) => <div key={p.id}>{c && <div className="mu xs" style={{ margin: '0 0 4px 4px' }}>● {tr('now in {city}', { city: c })}</div>}<ProCard pro={p} /></div>)}
        {!shown.length && <div className="card empty">{tr('Nobody online here right now.')} <Link href={`/search${trade ? `?trade=${trade}` : ''}`}>{tr('Book a pro for later')}</Link> · <Link href="/ask">{tr('Describe your job')}</Link></div>}
      </div>
    </div></section>
  );
}
