/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Figure from '@/components/Figure';
import ShareLink from '@/components/ShareLink';
import { getMe } from '@/lib/auth';
import { serviceById } from '@/lib/catalog';
import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';

export const metadata = { title: 'My home' };
export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function MyHome() {
  const tr = await getT(); const lang = await getLang();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('My home')}</h2><p className="mu">{tr('Demo mode: nothing was saved. Connect the database to accept real sign-ups.')}</p></div></section>;
  const me = await getMe(); if (!me) redirect('/login?next=/my-home');
  const sb = await supabaseServer();
  const { data: jobs } = await sb.from('bookings')
    .select('id, service_id, starts_at, created_at, price_estimate, client_confirmed_at, pro:pros!bookings_pro_id_fkey(id, slug, display_name, photo_url, accent, trade), quote:quotes!bookings_quote_fk(title, total)')
    .eq('client_id', me.id).eq('status', 'done').order('starts_at', { ascending: false, nullsFirst: false }).limit(100);
  const ids = (jobs ?? []).map((j: any) => j.id as string);
  const empty = { data: [] as any[] };
  const [{ data: parts }, { data: photos }, { data: invs }] = ids.length ? await Promise.all([
    sb.from('job_parts').select('booking_id, brand, part_no, name').in('booking_id', ids),
    sb.from('pro_photos').select('booking_id, url, kind').in('booking_id', ids),
    sb.from('invoices').select('id, number, total, status, booking_id').in('booking_id', ids).neq('status', 'void'),
  ]) : [empty, empty, empty];
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 820 }}>
      <div className="eyebrow">{tr('Everything that was done in your home')}</div>
      <h2>🏠 {tr('My home')}</h2>
      <p className="mu" style={{ maxWidth: '62ch' }}>{tr('Each finished job is saved here: who did it, when, what was installed (brand and part number), photos, the quote and the invoice. Call the same pro again in one tap, or share them with a neighbor.')}</p>
      <div className="list">
        {(jobs ?? []).map((j: any) => {
          const p = j.pro; const ps = (parts ?? []).filter((x: any) => x.booking_id === j.id); const ph = (photos ?? []).filter((x: any) => x.booking_id === j.id);
          const inv = (invs ?? []).find((x: any) => x.booking_id === j.id);
          const title = j.quote?.title || svcName(serviceById(j.service_id ?? ''), lang) || tr('Estimate visit');
          return (
            <article key={j.id} className="card homejob" style={{ ['--acc' as string]: p?.accent ?? '#B57A50' }}>
              <div className="homejob-head">
                {p && <Link href={`/${p.slug}`} className="post-ava"><Figure name={p.display_name} accent={p.accent ?? '#B57A50'} photo={p.photo_url} /></Link>}
                <span style={{ minWidth: 0 }}><b>{title}</b><br /><span className="mu xs">{dateLabel(j.starts_at ?? j.created_at, lang)}{p ? ` · ${p.display_name}` : ''}{j.price_estimate != null ? ` · $${Number(j.price_estimate).toLocaleString('en-US')}` : ''}</span></span>
              </div>
              {ps.length > 0 && <div className="sm">🔩 {tr('Installed')}: {ps.map((x: any) => [x.brand, x.part_no, x.name].filter(Boolean).join(' ')).join('; ')}</div>}
              {ph.length > 0 && <div className="jobstrip">{ph.slice(0, 4).map((x: any) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer"><img src={x.url} alt={x.kind} /></a>)}</div>}
              <div className="chips">
                {p && <Link className="btn sm" href={`/book?pro=${p.slug}${j.service_id ? `&svc=${j.service_id}` : ''}`}>{tr('Call again')}</Link>}
                {p && <Link className="btn ghost sm" href={`/projects/new?pro=${p.id}`}>📸 {tr('Share a project')}</Link>}
                <Link className="btn ghost sm" href={`/orders/${j.id}`}>{tr('Order details')}</Link>
                {inv && <Link className="btn ghost sm" href={`/invoice/${inv.id}`}>🧾 {tr('Invoice')} {inv.number}</Link>}
                {p && <ShareLink url={`/${p.slug}`} title={p.display_name} />}
              </div>
            </article>);
        })}
        {!(jobs ?? []).length && <div className="card empty">{tr('Nothing here yet. Finished jobs appear here automatically.')} <Link href="/search">{tr('Find a pro')}</Link></div>}
      </div>
    </div></section>
  );
}
