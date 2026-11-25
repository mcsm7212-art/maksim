import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { serviceById } from '@/lib/catalog';
import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import { orderPhrase } from '@/lib/orders';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { slotLabel } from '@/lib/time';

export const metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Orders() {
  const tr = await getT(); const lang = await getLang();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('Orders')}</h2><p className="mu">{tr('Demo mode: nothing was saved. Connect the database to accept real sign-ups.')}</p></div></section>;
  const me = await getMe(); if (!me) redirect('/login?next=/orders');
  const sb = await supabaseServer();
  await sb.rpc('auto_confirm_done');
  const { data } = await sb.from('bookings').select('id, client_id, pro_id, service_id, status, starts_at, price_estimate, client_confirmed_at, created_at, pro:pros!bookings_pro_id_fkey(display_name), company:companies(name), quote:quotes!bookings_quote_fk(title)')
    .order('created_at', { ascending: false }).limit(100);
  const rows = (data ?? []) as any[];
  const groups = [
    { title: 'Needs your action', list: rows.filter((b) => orderPhrase(b, b.client_id === me.id ? 'client' : 'pro').tone === 'act') },
    { title: 'In progress', list: rows.filter((b) => ['wait', 'ok'].includes(orderPhrase(b, b.client_id === me.id ? 'client' : 'pro').tone) && !(b.status === 'done' && b.client_confirmed_at)) },
    { title: 'Finished', list: rows.filter((b) => b.status === 'cancelled' || (b.status === 'done' && b.client_confirmed_at)) },
  ];
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">{tr('What was agreed, when, and what is next')}</div>
      <h2>{tr('Orders')}</h2>
      {!rows.length && <div className="card empty">{tr('No orders yet.')} <Link href="/search">{tr('Find a pro')}</Link></div>}
      {groups.map((g) => g.list.length > 0 && (
        <div key={g.title} style={{ marginBottom: 20 }}>
          <h3>{tr(g.title)} <span className="mu sm">({g.list.length})</span></h3>
          <div className="list">{g.list.map((b) => { const role = b.client_id === me.id ? 'client' : 'pro'; const ph = orderPhrase(b, role); return (
            <Link key={b.id} href={`/orders/${b.id}`} className="card bk" style={{ textDecoration: 'none' }}>
              <span style={{ minWidth: 0 }}><span className={`ostatus ${ph.tone}`} style={{ fontSize: 14 }}>{tr(ph.text)}</span><br />
                <b>{b.quote?.title || svcName(serviceById(b.service_id ?? ''), lang) || tr('Estimate visit')}</b>
                <span className="mu sm"> · {role === 'client' ? (b.pro?.display_name ?? b.company?.name ?? '') : tr('Client')}{b.starts_at ? ` · ${slotLabel(b.starts_at, tr).join(' ')}` : ''}</span></span>
              {b.price_estimate != null && <b className="num" style={{ fontSize: 22 }}>${Number(b.price_estimate).toLocaleString('en-US')}</b>}
            </Link>); })}</div>
        </div>))}
    </div></section>
  );
}
