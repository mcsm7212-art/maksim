import Link from 'next/link';
import { cookies } from 'next/headers';
import ProCard, { priceFor } from '@/components/ProCard';
import SearchControls from '@/components/SearchControls';
import CompareToggle, { CompareBar } from '@/components/CompareToggle';
import { saveSearch, unsaveSearch } from '@/app/social/actions';
import { getMe } from '@/lib/auth';
import { similarPicks, FILTERS, SORTS, type Sort } from '@/lib/discovery';
import { pacificParts, slotLabel } from '@/lib/time';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
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
  if (sp.today && !sp.f) sp.f = 'today';
  const loc = await getLoc(sp.loc ?? null);
  // Sort and filters: from the address, or the visitor's last choice (remembered in a cookie).
  let pick = { sort: sp.sort, f: sp.f, lang: sp.lang, max: sp.max };
  if (!sp.sf && !sp.sort && !sp.f && !sp.lang && !sp.max) {
    const saved = new URLSearchParams(decodeURIComponent((await cookies()).get('nf_sf')?.value ?? ''));
    pick = { sort: saved.get('sort') ?? undefined, f: saved.get('f') ?? undefined, lang: saved.get('lang') ?? undefined, max: saved.get('max') ?? undefined };
  }
  const sort: Sort = (SORTS as readonly string[]).includes(pick.sort ?? '') ? (pick.sort as Sort) : 'best';
  const filters = (pick.f ?? '').split(',').filter((x) => (FILTERS as readonly string[]).includes(x));
  const max = Number(pick.max) > 0 ? Number(pick.max) : null;
  // Handymen cannot take permit jobs or jobs over $1,000.
  if (svc && (svc.permit || svc.hi > 1000)) pros = pros.filter((p) => p.trade !== 'handyman');
  // My pros: hidden ones are left out, saved ones come first.
  const saves = await mySaves();
  pros = pros.filter((p) => saves.get(p.id) !== 'hidden');
  const me = await getMe();
  const sim = me ? await similarPicks(trade ?? guess ?? null, 24) : new Map<string, number>();
  const today = pacificParts(new Date());
  const dayOff = (iso: string) => { const p = pacificParts(new Date(iso)); return Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(today.y, today.m - 1, today.d)) / 864e5); };
  type Row = { p: (typeof pros)[number]; d: number | null; next: string | null; slots: string[]; price: number | null; jobs: number; sim: number; fav: number };
  const fromPrice = (p: (typeof pros)[number]) => { const v = p.services.map((x) => priceFor(p, x.id) ?? 1e9); return v.length ? Math.min(...v) : null; };
  let rows: Row[] = pros.map((p) => {
    const slots = openSlots(p, 7);
    return { p, slots, next: slots[0] ?? null, d: loc.city ? milesBetween(loc.city, locCity(p.onlineArea) ?? locCity(p.area)) : null,
      price: svc ? priceFor(p, svc.id) : fromPrice(p), jobs: svc ? (p.services.find((x) => x.id === svc.id)?.jobs ?? 0) : p.jobs,
      sim: sim.get(p.id) ?? 0, fav: Number(saves.get(p.id) === 'saved') };
  });
  const has = (f: string) => filters.includes(f);
  rows = rows.filter(({ p, slots, price, fav }) =>
    (!has('today') || slots.some((x) => dayOff(x) === 0)) && (!has('tomorrow') || slots.some((x) => dayOff(x) === 1)) &&
    (!has('weekend') || slots.some((x) => [0, 6].includes(pacificParts(new Date(x)).weekday))) && (!has('urgent') || p.urgent) &&
    (!has('lic') || p.verified.license) && (!has('id') || p.verified.id) && (!has('ins') || p.verified.insured) &&
    (!has('solo') || !p.company) && (!has('co') || Boolean(p.company)) && (!has('r45') || (p.reviewCount > 0 && (p.rating ?? 0) >= 4.5)) &&
    (!has('photos') || p.photos.length > 0) && (!has('mine') || fav === 1) && (!pick.lang || p.languages.includes(pick.lang)) && (!max || (price != null && price <= max)));
  const by = (f: (r: Row) => number | null, asc = true) => (a: Row, b: Row) => {
    const x = f(a), y = f(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return asc ? x - y : y - x;
  };
  const score = (r: Row) => r.fav * 100 + Number(r.p.accepting) * 20 + Math.min(r.sim, 10) * 2 + ((r.p.rankScore ?? 4.2) - 4.2) * 15
    + (r.d != null ? Math.max(0, 10 - r.d / 3) : 0) + (r.next && dayOff(r.next) <= 1 ? 5 : 0) + Number(r.p.online) * 3;
  const order: Record<Sort, (a: Row, b: Row) => number> = {
    best: by(score, false), rating: by((r) => r.p.rankScore ?? r.p.rating, false), near: by((r) => r.d), similar: (a, b) => b.sim - a.sim || by(score, false)(a, b),
    soon: by((r) => (r.next ? Date.parse(r.next) : null)), price: by((r) => r.price), fast: by((r) => r.p.responseMin), jobs: by((r) => r.jobs, false),
  };
  rows = [...rows].sort((a, b) => b.fav - a.fav || Number(b.p.accepting) - Number(a.p.accepting) || order[sort](a, b));
  if (sort !== 'best') rows = [...rows].sort((a, b) => Number(b.p.accepting) - Number(a.p.accepting) || order[sort](a, b));
  // Why each pro is here: two short reasons, the chosen order first.
  const why = (r: Row) => {
    const out: string[] = [];
    const near = r.d != null && r.d <= 30 ? (r.d < 1 ? tr('📍 In your city') : tr('📍 {n} mi from you', { n: r.d })) : null;
    const simT = r.sim ? tr('👥 Liked by {n} clients with picks like yours', { n: r.sim }) : null;
    const soon = r.next ? `📅 ${tr('Free')} ${slotLabel(r.next, tr).join(' ')}` : null;
    const fast = r.p.responseMin ? tr('⏱ Usually replies in ~{n} min', { n: r.p.responseMin }) : null;
    const jobs = r.jobs > 0 ? tr(svc ? '🔧 {n} such jobs on NovaFides' : '🔧 {n} jobs on NovaFides', { n: r.jobs }) : null;
    const first = { near, similar: simT, soon, fast, jobs, best: null, rating: null, price: null }[sort];
    for (const x of [first, simT, near, soon, jobs, fast]) if (x && !out.includes(x) && out.length < 2) out.push(x);
    return out;
  };
  pros = rows.map((r) => r.p);
  const langs = [...new Set(rows.length ? pros.flatMap((p) => p.languages) : [])].sort();
  // Saved search ("tell me about new pros") for this trade and city.
  let watching = false;
  if (me && isLive()) {
    let q = (await supabaseServer()).from('saved_searches').select('id').eq('user_id', me.id);
    q = trade ? q.eq('trade', trade) : q.is('trade', null); q = loc.city ? q.eq('city', loc.city) : q.is('city', null);
    watching = Boolean((await q.limit(1)).data?.length);
  }
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

      <SearchControls sort={sort} filters={filters} langs={langs} lang={pick.lang ?? ''} max={pick.max ?? ''} hasPrice={Boolean(svc)} />
      <div className="list" style={{ marginTop: 14 }}>
        {rows.map((r) => (
          <div key={r.p.id} className="pc-wrap">
            <ProCard pro={r.p} serviceId={svc?.id} saved={r.fav === 1} reasons={why(r)} />
            {!r.p.isDemo && <CompareToggle slug={r.p.slug} name={r.p.name} />}
          </div>))}
        {!rows.length && <div className="card empty">{filters.length || pick.lang || max ? <>{tr('No pros match these filters.')} <Link href={link({ f: null, lang: null, max: null, sf: '1' })}>{tr('Clear filters')}</Link></> : <>{tr('No pros match yet.')} <Link href="/ask">{tr('Describe your job')}</Link> {tr('and we will find someone.')}</>}</div>}
      </div>
      <p className="mu xs" style={{ marginTop: 14 }}>🤝 {tr('Pros never pay for a place in this list. The order depends only on what you choose above.')}</p>
      {isLive() && <form action={watching ? unsaveSearch : saveSearch} className="savesearch">
        <input type="hidden" name="trade" value={trade ?? ''} /><input type="hidden" name="city" value={loc.city ?? ''} /><input type="hidden" name="back" value={link({})} />
        <button className="btn ghost sm">{watching ? `🔕 ${tr('Stop alerts about new pros')}` : `🔔 ${tr('Tell me when a new verified pro joins')}`}</button>
        <span className="mu xs">{[trade ? tr(TRADES[trade].name) : tr('All trades'), loc.city].filter(Boolean).join(' · ')}</span>
      </form>}
      <CompareBar label={tr('Compare')} />
    </div></section>
  );
}
