import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { serviceById } from '@/lib/catalog';
import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import InvoiceForm, { type Line } from './InvoiceForm';

export const metadata = { title: 'Invoice' };

export default async function NewInvoice({ searchParams }: { searchParams: Promise<{ booking?: string; edit?: string }> }) {
  const tr = await getT(); const lang = await getLang();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('Invoice')}</h2><p className="mu">{tr('Demo mode.')}</p></div></section>;
  const me = await getMe(); if (!me) redirect('/login?next=/account');
  const sp = await searchParams;
  const sb = await supabaseServer();
  let inv: Record<string, any> | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (sp.edit) {
    inv = (await sb.from('invoices').select('*').eq('id', sp.edit).maybeSingle()).data;
    if (!inv) notFound();
    if (inv.status !== 'draft') redirect(`/invoice/${inv.id}`);
  }
  const bookingId = inv?.booking_id ?? sp.booking;
  const { data: b } = await sb.from('bookings').select('id, service_id, price_estimate, address, client:profiles!bookings_client_id_fkey(full_name)').eq('id', bookingId ?? '').maybeSingle();
  if (!b) notFound();
  const { data: last } = await sb.from('invoices').select('payment_instructions, tax_rate').eq('created_by', me.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const name = svcName(serviceById(b.service_id ?? ''), lang) || tr('Estimate visit');
  const initial: Line[] = inv?.items ?? [{ kind: 'labor', description: name, qty: 1, price: Number(b.price_estimate ?? 0) }];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (b as any).client?.full_name || tr('Client');
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 820 }}>
      <div className="eyebrow"><Link href="/account">{tr('My account')}</Link> · {tr('Invoice')}</div>
      <h2>{inv ? tr('Edit invoice {n}', { n: inv.number }) : tr('New invoice')}</h2>
      <p className="mu sm">{name} · {client} · {b.address}</p>
      <InvoiceForm booking={b.id} id={inv?.id} initial={initial} tax={Number(inv?.tax_rate ?? last?.tax_rate ?? 0)} notes={inv?.notes ?? ''} payment={inv?.payment_instructions ?? last?.payment_instructions ?? ''} />
    </div></section>
  );
}
