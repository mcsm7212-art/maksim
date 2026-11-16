/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { getLang, getT } from '@/lib/i18n';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';
import PrintButton from '@/components/PrintButton';
import { markPaid, sendInvoice, voidInvoice } from '../actions';

export const metadata = { title: 'Invoice' };
const money = (n: number) => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const STATUS_COLOR: Record<string, string> = { draft: 'n', sent: 'p', paid: 'ok', void: 'e' };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const tr = await getT(); const lang = await getLang();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('Invoice')}</h2><p className="mu">{tr('Demo mode.')}</p></div></section>;
  const { id } = await params;
  const me = await getMe(); if (!me) redirect(`/login?next=/invoice/${id}`);
  const sb = await supabaseServer();
  const { data: inv } = await sb.from('invoices')
    .select('*, pro:pros(display_name, license_no, slug), company:companies(name, license_no, city), client:profiles!invoices_client_id_fkey(full_name), booking:bookings(address, starts_at)')
    .eq('id', id).maybeSingle();
  if (!inv) notFound();
  const i = inv as any;
  const isClient = i.client_id === me.id;
  const from = i.company?.name ?? i.pro?.display_name ?? 'NovaFides pro';
  const license = i.company?.license_no ?? i.pro?.license_no;
  const kindLabel = (k: string) => tr(k === 'labor' ? 'Labor' : k === 'material' ? 'Material' : k === 'fee' ? 'Fee' : 'Discount / credit');
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 820 }}>
      <div className="noprint eyebrow"><Link href="/account">{tr('My account')}</Link> · {tr('Invoice')}</div>
      <div className="card formcard inv" style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>{tr('Invoice')} {i.number}</h2>
            <span className={`badge ${STATUS_COLOR[i.status]}`}>{tr(i.status === 'draft' ? 'Draft' : i.status === 'sent' ? 'Awaiting payment' : i.status === 'paid' ? 'Paid' : 'Void')}</span>
          </div>
          <div className="sm" style={{ textAlign: 'right' }}>
            <b>{from}</b>{i.company && i.pro && <><br />{tr('Technician')}: {i.pro.display_name}</>}
            {license && <><br />CSLB #{license}</>}
            <br /><span className="mu">{tr('Issued')}: {dateLabel(i.issued_at ?? i.created_at, lang)}</span>
            {i.paid_at && <><br /><span className="mu">{tr('Paid')}: {dateLabel(i.paid_at, lang)}</span></>}
          </div>
        </div>
        <div className="sm"><span className="mu">{tr('Bill to')}:</span> <b>{i.client?.full_name || tr('Client')}</b> · {i.booking?.address}</div>
        <table>
          <thead><tr><th>{tr('Description')}</th><th className="r">{tr('Qty')}</th><th className="r">{tr('Price')}</th><th className="r">{tr('Amount')}</th></tr></thead>
          <tbody>
            {(i.items as any[]).map((l, k) => {
              const amt = l.qty * Math.abs(l.price) * (l.kind === 'discount' ? -1 : 1);
              return <tr key={k}><td>{l.description}<br /><span className="mu xs">{kindLabel(l.kind)}</span></td><td className="r">{l.qty}</td><td className="r">{money(Math.abs(l.price))}</td><td className="r">{money(amt)}</td></tr>;
            })}
          </tbody>
        </table>
        <div className="brk" style={{ maxWidth: 320, marginLeft: 'auto', width: '100%' }}>
          <div><span>{tr('Subtotal')}</span><b>{money(i.subtotal)}</b></div>
          <div><span>{tr('Tax')} ({Number(i.tax_rate)}% {tr('on materials')})</span><b>{money(i.tax)}</b></div>
          <div style={{ fontSize: 18 }}><span><b>{tr('Total')}</b></span><b>{money(i.total)}</b></div>
        </div>
        {i.payment_instructions && <div className="note"><b>{tr('How to pay')}:</b><br /><span style={{ whiteSpace: 'pre-wrap' }}>{i.payment_instructions}</span></div>}
        {i.notes && <div className="sm" style={{ whiteSpace: 'pre-wrap' }}>{i.notes}</div>}
        <div className="mu xs">{tr('Booked through NovaFides Marketplace. NovaFides does not take payments; pay the pro directly as shown above.')}</div>
      </div>
      <div className="chips noprint" style={{ marginTop: 14 }}>
        <PrintButton label={tr('Print / save as PDF')} />
        {!isClient && i.status === 'draft' && <><Link className="btn ghost" href={`/invoice/new?edit=${i.id}`}>{tr('Edit')}</Link>
          <form action={sendInvoice}><input type="hidden" name="id" value={i.id} /><button className="btn">{tr('Send to client')}</button></form></>}
        {!isClient && i.status === 'sent' && <form action={markPaid}><input type="hidden" name="id" value={i.id} /><button className="btn">{tr('Mark as paid')}</button></form>}
        {!isClient && ['draft', 'sent'].includes(i.status) && <form action={voidInvoice}><input type="hidden" name="id" value={i.id} /><button className="btn ghost">{tr('Void')}</button></form>}
        {isClient && i.status !== 'paid' && <Link className="btn ghost" href="/messages">{tr('Question about the bill? Message the pro')}</Link>}
      </div>
    </div></section>
  );
}
