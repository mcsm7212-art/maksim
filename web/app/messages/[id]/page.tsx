import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import Thread from './Thread';
import QuoteForm from '@/components/QuoteForm';
import { SERVICES } from '@/lib/catalog';
import { getLang } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'Chat' };
/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Chat({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; sent?: string }> }) {
  if (!isLive()) redirect('/messages');
  const me = await getMe();
  const { id } = await params;
  if (!me) redirect(`/login?next=/messages/${id}`);
  const sb = await supabaseServer();
  const { data: c } = await sb.from('conversations')
    .select('id, client_id, pro_id, company_id, peer_id, pro:pros(display_name, slug), company:companies(name, slug), client:profiles!conversations_client_id_fkey(full_name)')
    .eq('id', id).maybeSingle();
  if (!c) notFound();
  const cc = c as any;
  const [{ data: msgs }, { data: bk }, { data: qs }] = await Promise.all([
    sb.from('messages').select('id, body, photo_url, sender_id, created_at, flagged').eq('conversation_id', id).order('created_at').limit(300),
    sb.from('bookings').select('id').eq('client_id', cc.client_id).in('status', ['confirmed', 'on_the_way', 'in_progress', 'done'])
      .or(cc.pro_id ? `pro_id.eq.${cc.pro_id}` : `company_id.eq.${cc.company_id}`).limit(1),
    sb.from('quotes').select('*').eq('conversation_id', id).order('created_at'),
  ]);
  const iAmPro = Boolean(cc.pro_id && cc.pro_id === me.id && !cc.peer_id);
  const quotes = (qs ?? []).map((q: any) => ({ id: q.id, conv: id, title: q.title, lines: q.lines ?? [], total: Number(q.total), includes: q.includes, notes: q.notes,
    validUntil: q.valid_until, version: q.version, status: q.status, bookingId: q.booking_id, at: q.created_at }));
  let quoteForm = null;
  if (iAmPro) {
    const lang = await getLang();
    const { data: pr } = await sb.from('pros').select('trade').eq('id', me.id).single();
    const { data: open } = await sb.from('bookings').select('id, service_id, starts_at, status').eq('pro_id', me.id).eq('client_id', cc.client_id).not('status', 'in', '(done,cancelled)');
    quoteForm = <QuoteForm conv={id} services={SERVICES.filter((s) => s.trade === pr?.trade).map((s) => ({ id: s.id, label: svcName(s, lang) }))}
      jobs={(open ?? []).map((b: any) => ({ id: b.id, label: `${svcName(SERVICES.find((s) => s.id === b.service_id), lang) || 'Job'}${b.starts_at ? ' · ' + new Date(b.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}` }))} />;
  }
  const spx = await searchParams; const qErr = spx.q;
  const iAmClient = cc.client_id === me.id; const tr = await getT();
  const peerName = cc.peer_id ? ((await sb.rpc('public_name', { uid: iAmClient ? cc.peer_id : cc.client_id })).data as string) : null;
  const other = peerName ? peerName : iAmClient ? (cc.pro?.display_name ?? tr('{name} office', { name: cc.company?.name })) : (cc.client?.full_name || tr('Client'));
  const link = cc.peer_id ? null : iAmClient ? (cc.pro ? `/pro/${cc.pro.slug}` : `/company/${cc.company.slug}`) : null;
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/messages">{tr('Messages')}</Link></div>
      <h2 style={{ marginBottom: 4 }}>{other}</h2>
      {link && <p className="sm" style={{ marginTop: 0 }}><Link href={link}>{tr('Profile')}</Link> · <Link href={`/book?${cc.pro ? `pro=${cc.pro.slug}` : `company=${cc.company.slug}`}`}>{tr('Book')}</Link></p>}
      {cc.peer_id && <p className="mu xs" style={{ marginTop: 0 }}>{tr('Neighbor chat.')} <Link href="/neighbors">{tr('Neighbors')}</Link></p>}
      {qErr && <p className="err">{tr(qErr)}</p>}
      {spx.sent === 'estimate' && <div className="note">✓ {tr('Sent to {name} only. They answer here or send a quote you can accept.', { name: other })}</div>}
      {spx.sent === 'callback' && <div className="note">✓ {tr('{name} got your call-back request with your number and convenient time. You can also write here.', { name: other })}</div>}
      <Thread id={id} booked={(bk ?? []).length > 0 || Boolean(cc.peer_id)} quotes={quotes} role={iAmPro ? 'pro' : 'client'} quoteForm={quoteForm}
        messages={(msgs ?? []).map((m: any) => ({ id: m.id, body: m.body, photo: m.photo_url, mine: m.sender_id === me.id, at: m.created_at, flagged: m.flagged, who: other }))} />
    </div></section>
  );
}
