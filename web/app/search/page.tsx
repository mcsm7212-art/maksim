import Link from 'next/link';
import ProCard from '@/components/ProCard';
import SearchBox from '@/components/SearchBox';
import { searchRanked, serviceById, TRADES, usd, type Trade } from '@/lib/catalog';
import { listPros, openSlots } from '@/lib/data';
import { getLoc } from '@/lib/loc';
import { locCity, milesBetween } from '@/lib/areas';
import { mySaves } from '@/lib/social';
import { getLang } from '@/lib/i18n';
import { makeT, svcName } from '@/lib/i18n-core';

export const metadata = { title: 'Find a pro' };
const DIAG: Record<string, string> = { plumbing: 'plumbing-diagnostic-visit', electrical: 'electrical-diagnostic-visit', handyman: 'small-repairs-hourly' };
type SP = Promise<Record<string, string | undefined>>;

export default async function Search({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams; const lang = await getLang(); const tr = makeT(lang);
  const svc = sp.svc ? serviceById(sp.svc) : undefined;
  const trade = (svc?.trade ?? (sp.trade && sp.trade in TRADES ? sp.trade : null)) as Trade | null;
  const matches = !svc && sp.q ? searchRanked(sp.q, trade, 4).map((h) => h.s) : [];
  // Not sure which job? Show the pros of the most likely trade, not everyone.
  const guess = (!trade && matches[0]?.trade) as Trade | undefined;
  let pros = await listPros({ trade: trade ?? guess ?? null, serviceId: svc?.id });
  if (sp.online) pros = pros.filter((p) => p.online);
  if (sp.today) pros = pros.filter((p) => openSlots(p, 1).length > 0);
  const loc = await getLoc(sp.loc ?? null);
  const dist = (p: { area: string; onlineArea?: string | null }) => (loc.city ? milesBetween(loc.city, locCity(p.onlineArea) ?? locCity(p.area)) ?? 60 : 0);
  // Handymen cannot take permit jobs or jobs over $1,000.
  if (svc && (svc.permit || svc.hi > 1000)) pros = pros.filter((p) => p.trade !== 'handyman');
  // My pros: hidden ones are left out, saved ones come first.
  const saves = await mySaves();
  pros = pros.filter((p) => saves.get(p.id) !== 'hidden');
  const fav = (p: { id: string }) => Number(saves.get(p.id) === 'saved');
  pros = [...pros].sort((a, b) => fav(b) - fav(a) || Number(b.accepting) - Number(a.accepting) || Number(b.online) - Number(a.online) || Math.min(Math.ceil(dist(a) / 8), 4) - Math.min(Math.ceil(dist(b) / 8), 4) || (b.rankScore ?? b.rating ?? 0) - (a.rankScore ?? a.rating ?? 0));
  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    return `/search?${p}`;
  };
  return (
    <section className="sec pad"><div className="in">
      <div className="eyebrow">{trade ? tr(TRADES[trade].name) : tr('All trades')}</div>
      <h2>{svc ? svcName(svc, lang) : sp.online ? tr('Online now') : tr('Find a pro')}</h2>
      <div className="search-wide"><SearchBox initial={svc ? svcName(svc, lang) : sp.q ?? ''} trade={trade} loc={loc.text} /></div>
      {loc.city && <p className="mu xs" style={{ marginTop: 8 }}>📍 {tr('Pros near {city} come first', { city: loc.city })}</p>}
      {loc.text && !loc.city && <p className="mu xs" style={{ marginTop: 8 }}>📍 {tr('We could not find “{loc}”. Try a Bay Area city or a ZIP code.', { loc: loc.text })}</p>}
      {sp.today && <p className="mu xs">{tr('Showing pros with open hours today by their schedule. The pro confirms the exact time.')}</p>}

      <div className="chips" style={{ marginTop: 16 }}>
        <Link className="chip" aria-pressed={!trade} href={link({ trade: null, svc: null })}>{tr('All')}</Link>
        {(Object.keys(TRADES) as Trade[]).map((t) => <Link key={t} className="chip" aria-pressed={trade === t} href={link({ trade: t, svc: null })}>{tr(TRADES[t].name)}</Link>)}
        <Link className="chip" aria-pressed={Boolean(sp.online)} href={link({ online: sp.online ? null : '1' })}>● {tr('Online now')}</Link>
      </div>
      {svc && <p className="mu sm" style={{ marginTop: 12 }}>{tr('Bay Area typical price: {lo}–{hi}.', { lo: usd(svc.lo), hi: usd(svc.hi) })} {svc.permit && tr('Permit usually required.')}</p>}

      {matches.length > 0 && <div className="card" style={{ marginTop: 18, padding: 16 }}>
        <b>{tr('What needs doing?')}</b>
        <div className="chips" style={{ marginTop: 10 }}>{matches.map((m) => <Link key={m.id} className="chip" href={link({ svc: m.id, q: null, trade: null })}>{svcName(m, lang)}</Link>)}
          {DIAG[matches[0].trade] && <Link className="chip" href={link({ svc: DIAG[matches[0].trade], q: null, trade: null })}>{tr('Not sure yet: diagnostic visit')}</Link>}</div>
        {guess && <p className="mu xs" style={{ margin: '10px 0 0' }}>{tr('Showing {trade} pros below.', { trade: tr(TRADES[guess].name).toLowerCase() })}</p>}
      </div>}
      {sp.q && !matches.length && !svc && <div className="card" style={{ marginTop: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <b>{tr('We did not find this exact job.')}</b>
        <span className="mu sm">{tr('Try other words, pick a trade above, or describe the problem with a photo: pros will tell you what it is.')}</span>
        <div className="chips"><Link className="btn sm" href={`/ask?${new URLSearchParams({ ...(trade ? { trade } : {}), q: sp.q })}`}>{tr('Describe the problem')}</Link><Link className="btn ghost sm" href="/questions">{tr('Ask the pros')}</Link></div>
      </div>}

      <div className="list" style={{ marginTop: 22 }}>
        {pros.map((p) => <ProCard key={p.id} pro={p} serviceId={svc?.id} saved={saves.get(p.id) === 'saved'} />)}
        {!pros.length && <div className="card empty">{tr('No pros match yet.')} <Link href="/ask">{tr('Describe your job')}</Link> {tr('and we will find someone.')}</div>}
      </div>
    </div></section>
  );
}
