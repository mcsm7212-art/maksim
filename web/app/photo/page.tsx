/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import PhotoSearch from '@/components/PhotoSearch';
import PartSearch from '@/components/PartSearch';
import ProCard from '@/components/ProCard';
import { serviceById } from '@/lib/catalog';
import { listPros } from '@/lib/data';
import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { visionEnabled } from '@/lib/vision';

export const metadata = { title: 'Search by photo' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // part search may run a few web searches

export default async function Photo({ searchParams }: { searchParams: Promise<{ svc?: string; s?: string; u?: string; tip?: string; mode?: string }> }) {
  const sp = await searchParams; const tr = await getT(); const lang = await getLang();
  const ids = (sp.svc ?? '').split(',').filter((id) => serviceById(id)).slice(0, 3);
  // Pros who offer these jobs; those with photos of this kind of job come first.
  const pros = ids.length ? (await listPros()).filter((p) => p.accepting && p.services.some((s) => ids.includes(s.id))) : [];
  const photos = new Map<string, { url: string; kind: string }[]>();
  if (ids.length && isLive() && pros.length) {
    const { data } = await (await supabaseServer()).from('pro_photos').select('pro_id, url, kind, created_at').in('service_id', ids).in('pro_id', pros.map((p) => p.id)).order('created_at', { ascending: false }).limit(200);
    for (const r of data ?? []) { const l = photos.get(r.pro_id) ?? []; if (l.length < 4) l.push({ url: r.url, kind: r.kind }); photos.set(r.pro_id, l); }
  }
  const jobs = (p: (typeof pros)[number]) => p.services.filter((s) => ids.includes(s.id)).reduce((n, s) => n + s.jobs, 0);
  const sorted = [...pros].sort((a, b) => (photos.get(b.id)?.length ?? 0) - (photos.get(a.id)?.length ?? 0) || jobs(b) - jobs(a) || (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 20);
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 860 }}>
      <div className="eyebrow">{tr('Like Google Lens, for home repairs')}</div>
      <h2>{tr('Search by photo')}</h2>
      {!visionEnabled() && <p className="note">{tr('Photo search is not switched on yet. Describe the problem in words instead.')} <Link href="/search">{tr('Find a pro')}</Link></p>}
      <div className="chips" style={{ marginBottom: 14 }}>
        <Link className="chip" aria-pressed={sp.mode !== 'part'} href="/photo">📷 {tr('What is wrong?')}</Link>
        <Link className="chip" aria-pressed={sp.mode === 'part'} href="/photo?mode=part">🔩 {tr('Find a part')}</Link>
      </div>
      {sp.mode === 'part' ? <PartSearch /> : <PhotoSearch />}

      {sp.mode !== 'part' && ids.length > 0 && <>
        <div className="card" style={{ padding: 18, marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sp.s && <b style={{ fontSize: 18 }}>{sp.s}</b>}
          {sp.u === '1' && <div className="note" style={{ margin: 0 }}>⚡ {tr('Looks urgent.')} {sp.tip} <Link href="/online?urgent=1">{tr('Find urgent help')}</Link></div>}
          {sp.u !== '1' && sp.tip && <span className="mu sm">{sp.tip}</span>}
          <span className="mu xs">{tr('Likely jobs')}:</span>
          <div className="chips">{ids.map((id) => <Link key={id} className="chip" href={`/search?svc=${id}`}>{svcName(serviceById(id), lang)}</Link>)}</div>
          <span className="mu xs">{tr('AI suggestion from your photo. A pro confirms the exact job on site.')}</span>
        </div>
        <h3 style={{ marginTop: 24 }}>{tr('Pros who do this')} <span className="mu sm">({sorted.length})</span></h3>
        <div className="list">
          {sorted.map((p) => (
            <div key={p.id}>
              <ProCard pro={p} serviceId={ids.find((id) => p.services.some((s) => s.id === id))} />
              {(photos.get(p.id)?.length ?? 0) > 0 && <div className="jobstrip">{photos.get(p.id)!.map((ph) => (
                <a key={ph.url} href={ph.url} target="_blank" rel="noreferrer" title={tr(ph.kind === 'before' ? 'Before' : ph.kind === 'after' ? 'After' : 'Work photo')}><img src={ph.url} alt="" loading="lazy" /></a>))}</div>}
              {jobs(p) > 0 && <div className="mu xs" style={{ margin: '4px 0 0 4px' }}>{tr('{n} such jobs on NovaFides', { n: jobs(p) })}</div>}
            </div>))}
          {!sorted.length && <div className="card empty">{tr('No pros for this job yet.')} <Link href="/ask">{tr('Describe your job')}</Link> · <Link href="/questions">{tr('Ask the pros')}</Link></div>}
        </div>
      </>}
    </div></section>
  );
}
