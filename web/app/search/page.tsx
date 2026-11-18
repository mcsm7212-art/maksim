import Link from 'next/link';
import ProCard from '@/components/ProCard';
import SearchBox from '@/components/SearchBox';
import { searchServices, serviceById, TIER_KEYS, TIERS, TRADES, usd, type Tier, type Trade } from '@/lib/catalog';
import { listPros } from '@/lib/data';
import { mySaves } from '@/lib/social';
import { getLang } from '@/lib/i18n';
import { makeT, svcName } from '@/lib/i18n-core';

export const metadata = { title: 'Find a pro' };
type SP = Promise<Record<string, string | undefined>>;

export default async function Search({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams; const lang = await getLang(); const tr = makeT(lang);
  const svc = sp.svc ? serviceById(sp.svc) : undefined;
  const trade = (svc?.trade ?? (sp.trade && sp.trade in TRADES ? sp.trade : null)) as Trade | null;
  const tier = (sp.tier && TIER_KEYS.includes(sp.tier as Tier) ? sp.tier : null) as Tier | null;
  const matches = !svc && sp.q ? searchServices(sp.q, trade) : [];
  let pros = await listPros({ trade, serviceId: svc?.id, tier });
  if (sp.online) pros = pros.filter((p) => p.online);
  // Handymen cannot take permit jobs or jobs over $1,000.
  if (svc && (svc.permit || svc.hi > 1000)) pros = pros.filter((p) => p.trade !== 'handyman');
  // My pros: hidden ones are left out, saved ones come first.
  const saves = await mySaves();
  pros = pros.filter((p) => saves.get(p.id) !== 'hidden');
  const fav = (p: { id: string }) => Number(saves.get(p.id) === 'saved');
  pros = [...pros].sort((a, b) => fav(b) - fav(a) || Number(b.online) - Number(a.online) || (b.rating ?? 0) - (a.rating ?? 0));
  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    return `/search?${p}`;
  };
  return (
    <section className="sec pad"><div className="in">
      <div className="eyebrow">{trade ? tr(TRADES[trade].name) : tr('All trades')}</div>
      <h2>{svc ? svcName(svc, lang) : sp.online ? tr('Online now') : tr('Find a pro')}</h2>
      <SearchBox initial={svc ? svcName(svc, lang) : sp.q ?? ''} trade={trade} />

      <div className="chips" style={{ marginTop: 16 }}>
        <Link className="chip" aria-pressed={!trade} href={link({ trade: null, svc: null })}>{tr('All')}</Link>
        {(Object.keys(TRADES) as Trade[]).map((t) => <Link key={t} className="chip" aria-pressed={trade === t} href={link({ trade: t, svc: null })}>{tr(TRADES[t].name)}</Link>)}
        <Link className="chip" aria-pressed={Boolean(sp.online)} href={link({ online: sp.online ? null : '1' })}>● {tr('Online now')}</Link>
      </div>
      <div className="chips" style={{ marginTop: 10 }}>
        <Link className="chip" aria-pressed={!tier} href={link({ tier: null })}>{tr('Any level')}</Link>
        {TIER_KEYS.map((t) => <Link key={t} className="chip" aria-pressed={tier === t} href={link({ tier: t })} title={tr(TIERS[t].blurb)}>{tr(TIERS[t].name)}</Link>)}
      </div>
      {svc && <p className="mu sm" style={{ marginTop: 12 }}>{tr('Bay Area typical price: {lo}–{hi} (Standard).', { lo: usd(svc.lo), hi: usd(svc.hi) })} {svc.permit && tr('Permit usually required.')} {tier && tr(TIERS[tier].blurb)}</p>}

      {matches.length > 0 && <div style={{ marginTop: 18 }}>
        <div className="mu sm" style={{ marginBottom: 8 }}>{tr('Did you mean:')}</div>
        <div className="chips">{matches.map((m) => <Link key={m.id} className="chip" href={link({ svc: m.id, q: null })}>{svcName(m, lang)}</Link>)}</div>
      </div>}
      {sp.q && !matches.length && !svc && <div className="note" style={{ marginTop: 18 }}>
        {tr('Not in our catalog yet.')} <Link href={`/ask${trade ? `?trade=${trade}` : ''}`}>{tr('Describe your job')}</Link> {tr('with photos and ask up to 3 pros for an estimate.')}
      </div>}

      <div className="list" style={{ marginTop: 22 }}>
        {pros.map((p) => <ProCard key={p.id} pro={p} serviceId={svc?.id} tier={tier} saved={saves.get(p.id) === 'saved'} />)}
        {!pros.length && <div className="card empty">{tr('No pros match yet.')} <Link href="/ask">{tr('Describe your job')}</Link> {tr('and we will find someone.')}</div>}
      </div>
    </div></section>
  );
}
