import Link from 'next/link';
import { redirect } from 'next/navigation';
import Figure from '@/components/Figure';
import SaveButton from '@/components/SaveButton';
import { getMe } from '@/lib/auth';
import { serviceById, TRADES, type Trade } from '@/lib/catalog';
import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import { mySaves } from '@/lib/social';
import PeerPicks from '@/components/PeerPicks';
import { similarPicks } from '@/lib/discovery';
import { listPros } from '@/lib/data';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';

export const metadata = { title: 'My pros' };
/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = { id: string; slug: string; name: string; trade: Trade; photo: string | null; accent: string; area: string; status: 'saved' | 'hidden' | null;
  lastJob?: { service: string | null; date: string; serviceId: string | null; tier: string } ; jobs: number };

export default async function MyPros() {
  const tr = await getT(); const lang = await getLang();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('My pros')}</h2><p className="mu">{tr('Demo mode: accounts turn on when the database is connected.')}</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/my-pros');
  const sb = await supabaseServer();
  const saves = await mySaves();
  const [{ data: bookings }, { data: savedPros }] = await Promise.all([
    sb.from('bookings').select('id, status, created_at, starts_at, service_id, tier, pro:pros!bookings_pro_id_fkey(id, slug, display_name, trade, photo_url, accent, area)').eq('client_id', me.id).not('pro_id', 'is', null).order('created_at', { ascending: false }).limit(200),
    saves.size ? sb.from('pros').select('id, slug, display_name, trade, photo_url, accent, area').in('id', [...saves.keys()]) : Promise.resolve({ data: [] as any[] }),
  ]);
  const rows = new Map<string, Row>();
  const add = (p: any) => { if (p && !rows.has(p.id)) rows.set(p.id, { id: p.id, slug: p.slug, name: p.display_name, trade: p.trade, photo: p.photo_url, accent: p.accent ?? '#B57A50', area: p.area ?? '', status: saves.get(p.id) ?? null, jobs: 0 }); };
  (savedPros ?? []).forEach(add);
  for (const b of (bookings ?? []) as any[]) {
    add(b.pro); const r = rows.get(b.pro?.id); if (!r) continue;
    if (b.status === 'done') r.jobs++;
    if (!r.lastJob) r.lastJob = { service: svcName(serviceById(b.service_id ?? ''), lang) || null, date: b.starts_at ?? b.created_at, serviceId: b.service_id, tier: b.tier };
  }
  const all = [...rows.values()];
  const saved = all.filter((r) => r.status === 'saved').sort((a, b) => a.trade.localeCompare(b.trade));
  const history = all.filter((r) => !r.status);
  const hidden = all.filter((r) => r.status === 'hidden');
  const simMap = await similarPicks(null, 8);
  const simPros = simMap.size ? (await listPros()).filter((p) => simMap.has(p.id)).sort((a, b) => (simMap.get(b.id) ?? 0) - (simMap.get(a.id) ?? 0)) : [];

  const Card = ({ r }: { r: Row }) => (
    <div className="card bk" style={{ ['--acc' as string]: r.accent }}>
      <span style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
        <Link href={`/${r.slug}`} style={{ width: 56, height: 64, borderRadius: 12, overflow: 'hidden', flex: 'none', display: 'block' }}><Figure name={r.name} accent={r.accent} photo={r.photo} /></Link>
        <span style={{ minWidth: 0 }}><Link href={`/${r.slug}`}><b>{r.name}</b></Link><br />
          <span className="mu sm">{tr(TRADES[r.trade]?.name ?? '')}{r.area ? ` · ${r.area}` : ''}{r.jobs ? ` · ${tr(r.jobs === 1 ? '{n} job together' : '{n} jobs together', { n: r.jobs })}` : ''}</span>
          {r.lastJob && <><br /><span className="mu xs">{tr('Last')}: {r.lastJob.service ?? tr('Estimate visit')} · {dateLabel(r.lastJob.date, lang)}</span></>}</span>
      </span>
      <span className="chips">
        {r.status !== 'hidden' && <Link className="btn sm" href={`/book?pro=${r.slug}${r.lastJob?.serviceId ? `&svc=${r.lastJob.serviceId}` : ''}`}>{tr(r.lastJob ? 'Book again' : 'Book')}</Link>}
        <SaveButton proId={r.id} initial={r.status} count={0} compact />
      </span>
    </div>
  );
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 820 }}>
      <div className="eyebrow">{tr('Your address book of trusted pros')}</div><h2>♥ {tr('My pros')}</h2>
      <h3>{tr('Saved')} <span className="mu sm">({saved.length})</span></h3>
      <div className="list">{saved.map((r) => <Card key={r.id} r={r} />)}
        {!saved.length && <div className="card empty">{tr('Tap ♡ Save on a pro’s page: they appear here first, their new work shows in your feed, and they come first in your search.')}</div>}</div>
      <PeerPicks pros={simPros} counts={simMap} title={tr('You may also like')} note={tr('Pros that clients with picks like yours are happy with, in any trade. Shown only when at least 3 clients agree; nobody sees who.')} />
      {history.length > 0 && <><h3 style={{ marginTop: 26 }}>{tr('Pros you booked')}</h3><div className="list">{history.map((r) => <Card key={r.id} r={r} />)}</div></>}
      {hidden.length > 0 && <><h3 style={{ marginTop: 26 }}>{tr('Hidden')}</h3><p className="mu xs">{tr('These pros do not appear in your search.')}</p><div className="list">{hidden.map((r) => <Card key={r.id} r={r} />)}</div></>}
    </div></section>
  );
}
