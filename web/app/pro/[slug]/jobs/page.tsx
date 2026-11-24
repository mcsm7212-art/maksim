/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Figure from '@/components/Figure';
import { serviceById, tradeLabel } from '@/lib/catalog';
import { getPro } from '@/lib/data';
import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const pro = await getPro((await params).slug);
  return { title: pro ? `${pro.name}: job history` : 'Job history' };
}

/** Every finished job of a pro: date, service, before/after photos the client allowed, and the review. */
export default async function Jobs({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const pro = await getPro(slug); if (!pro) notFound();
  const tr = await getT(); const lang = await getLang();
  const { data } = isLive() && !pro.isDemo ? await (await supabaseServer()).rpc('pro_jobs', { p: pro.id, lim: 60 }) : { data: [] as any[] };
  const jobs = (data ?? []) as { id: string; day: string; service_id: string | null; rating: number | null; review: string | null; author: string | null; before_urls: string[]; after_urls: string[] }[];
  const rated = jobs.filter((j) => j.rating != null);
  return (
    <section className="sec pad" style={{ ['--acc' as string]: pro.accent }}><div className="in" style={{ maxWidth: 860 }}>
      <div className="eyebrow"><Link href={`/pro/${pro.slug}`}>← {pro.name}</Link></div>
      <header className="card pc" style={{ marginBottom: 16 }}>
        <span className="fig"><Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} /></span>
        <span><h2 style={{ margin: 0 }}>{tr('Job history')}</h2><span className="mu sm">{pro.name} · {tr(tradeLabel(pro))}</span></span>
        <span className="side jh-stats"><span><b className="num">{jobs.length}</b> {tr('finished jobs')}</span>{rated.length > 0 && <span><b className="num">★ {(rated.reduce((s, j) => s + Number(j.rating), 0) / rated.length).toFixed(1)}</b> {tr('from {n} reviews', { n: rated.length })}</span>}</span>
      </header>
      <p className="mu sm">{tr('Every job finished through NovaFides, newest first. Photos are shown only when the client agreed. Reviews are honest: a negative one is not removed.')}</p>
      <div className="list">
        {jobs.map((j) => { const s = j.service_id ? serviceById(j.service_id) : undefined; return (
          <article key={j.id} className="card jh">
            <div className="jh-head"><b>{s ? svcName(s, lang) : tr('Job by agreement')}</b><span className="mu sm">{dateLabel(j.day + 'T12:00:00', lang)}</span>
              {j.rating != null ? <span className="badge ok">★ {Number(j.rating).toFixed(1)}</span> : <span className="badge n">{tr('No review yet')}</span>}</div>
            {(j.before_urls.length > 0 || j.after_urls.length > 0) && <div className="jh-photos">
              {j.before_urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /><small>{tr('Before')}</small></a>)}
              {j.after_urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /><small>{tr('After')}</small></a>)}
            </div>}
            {j.review && <blockquote className="jh-rev">“{j.review}”<span className="mu xs"> · {j.author}</span></blockquote>}
          </article>); })}
        {!jobs.length && <div className="card empty">{tr(pro.isDemo ? 'This is an example profile: it has no real jobs.' : 'No finished jobs yet. The first ones appear here right after they are done.')}</div>}
      </div>
      <div className="chips" style={{ marginTop: 16 }}><Link className="btn" href={`/book?pro=${pro.slug}`}>{tr('Pick a time')}</Link><Link className="btn ghost" href={`/pro/${pro.slug}`}>{tr('Profile')}</Link></div>
    </div></section>
  );
}
