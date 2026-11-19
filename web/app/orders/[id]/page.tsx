/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ActionForm from '@/components/ActionForm';
import QuoteCard from '@/components/QuoteCard';
import { confirmDone, orderStatus, pickTime, reportProblem } from '../actions';
import { getMe } from '@/lib/auth';
import { serviceById } from '@/lib/catalog';
import { getPro, openSlots } from '@/lib/data';
import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import { orderPhrase, PROBLEM_KINDS, stepIndex, STEPS } from '@/lib/orders';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel, slotLabel } from '@/lib/time';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Order({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isLive()) redirect('/orders');
  const me = await getMe(); if (!me) redirect(`/login?next=/orders/${id}`);
  const tr = await getT(); const lang = await getLang(); const sb = await supabaseServer();
  const { data: b } = await sb.from('bookings').select('*, pro:pros!bookings_pro_id_fkey(id, slug, display_name, photo_url), company:companies(name, slug)').eq('id', id).maybeSingle();
  if (!b) notFound();
  const o = b as any;
  const role = o.client_id === me.id ? 'client' : 'pro';
  const [{ data: qs }, { data: problems }, { data: conv }, { data: photos }] = await Promise.all([
    sb.from('quotes').select('*').eq('booking_id', id).order('created_at'),
    sb.from('problems').select('*').eq('booking_id', id).order('created_at'),
    o.pro_id ? sb.from('conversations').select('id').eq('client_id', o.client_id).eq('pro_id', o.pro_id).is('peer_id', null).maybeSingle() : Promise.resolve({ data: null }),
    sb.from('pro_photos').select('id, url, kind').eq('booking_id', id),
  ]);
  const ph = orderPhrase(o, role); const step = stepIndex(o);
  const slots = role === 'client' && o.status === 'needs_time' && o.pro?.slug ? openSlots((await getPro(o.pro.slug))!).slice(0, 18) : [];
  const accepted = (qs ?? []).filter((q: any) => q.status === 'accepted').pop() as any;
  const svc = accepted?.title || svcName(serviceById(o.service_id ?? ''), lang) || tr('Estimate visit');
  const next: Record<string, [string, string]> = { requested: ['confirmed', 'Confirm visit'], confirmed: ['on_the_way', 'On my way'], on_the_way: ['in_progress', 'Start work'], in_progress: ['done', 'Job done'] };
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/orders">{tr('Orders')}</Link></div>
      <h2 style={{ marginBottom: 4 }}>{svc}</h2>
      <div className="mu sm">{role === 'client' ? <>{tr('Your pro')}: {o.pro ? <Link href={`/pro/${o.pro.slug}`}>{o.pro.display_name}</Link> : o.company?.name}</> : tr('Client')}
        {o.starts_at && ` · ${slotLabel(o.starts_at, tr).join(' · ')}`}{o.address && role === 'pro' && ['confirmed', 'on_the_way', 'in_progress', 'done'].includes(o.status) ? ` · ${o.address}` : ''}</div>

      <div className="card" style={{ padding: 18, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className={`ostatus ${ph.tone}`}>{tr(ph.text)}</span>
        {o.status !== 'cancelled' && o.status !== 'assigning' && <div className="steps">{STEPS.map((s, i) => <span key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>{i < step ? '✓ ' : ''}{tr(s)}</span>)}</div>}
        {o.price_estimate != null && <div className="sm">{tr('Agreed price')}: <b className="num" style={{ fontSize: 22 }}>${Number(o.price_estimate).toLocaleString('en-US')}</b></div>}

        {role === 'client' && o.status === 'needs_time' && <ActionForm action={pickTime} className="list" style={{ gap: 8 }}>
          <input type="hidden" name="id" value={id} />
          <b className="sm">{tr('Pick a time')}</b>
          <div className="slotpick">{slots.map((t) => <label key={t}><input type="radio" name="t" value={t} required />{slotLabel(t, tr).join(' · ')}</label>)}</div>
          {!slots.length && <span className="mu sm">{tr('No open times this week. Write to the pro to agree on a time.')}</span>}
          <input className="inp" name="address" required maxLength={200} placeholder={tr('Job address')} aria-label={tr('Job address')} />
          <span className="mu xs">{tr('The pro sees the address only after confirming the visit.')}</span>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Send time to the pro')}</button>
        </ActionForm>}

        {role === 'pro' && next[o.status] && <div className="chips">
          <form action={orderStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={next[o.status][0]} /><button className="btn sm">{tr(next[o.status][1])}</button></form>
        </div>}
        {role === 'client' && o.status === 'done' && !o.client_confirmed_at && <form action={confirmDone} className="chips" style={{ alignItems: 'center' }}><input type="hidden" name="id" value={id} />
          <button className="btn sm">✓ {tr('Confirm the job is complete')}</button><span className="mu xs">{tr('If something is wrong, report a problem below instead.')}</span></form>}
        {role === 'client' && o.status === 'done' && o.client_confirmed_at && <Link className="btn ghost sm" href="/account" style={{ alignSelf: 'flex-start' }}>★ {tr('Rate your pro')}</Link>}
        <div className="chips">
          {conv?.id && <Link className="btn ghost sm" href={`/messages/${conv.id}`}>💬 {tr('Chat')}</Link>}
          {['needs_time', 'requested', 'confirmed'].includes(o.status) && <form action={orderStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="cancelled" /><button className="btn ghost sm">{tr('Cancel order')}</button></form>}
        </div>
      </div>

      {(qs ?? []).length > 0 && <><h3 style={{ marginTop: 22 }}>{tr('Quote')}</h3>
        <div className="list">{(qs ?? []).slice().reverse().map((q: any) => <QuoteCard key={q.id} role={role} inOrder q={{ id: q.id, conv: q.conversation_id, title: q.title, lines: q.lines ?? [], total: Number(q.total), includes: q.includes, notes: q.notes, validUntil: q.valid_until, version: q.version, status: q.status, bookingId: q.booking_id, at: q.created_at }} />)}</div>
        {role === 'pro' && conv?.id && !['done', 'cancelled'].includes(o.status) && <p className="mu xs">{tr('Scope changed? Send a new version of the quote in the chat: the client accepts it and the agreed price updates.')}</p>}</>}

      {(photos ?? []).length > 0 && <><h3 style={{ marginTop: 22 }}>{tr('Photos')}</h3>
        <div className="jobstrip">{(photos ?? []).map((p: any) => <a key={p.id} href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.kind} /></a>)}</div></>}

      <h3 style={{ marginTop: 22 }}>{tr('Is there a problem?')}</h3>
      {(problems ?? []).map((p: any) => <div key={p.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
        <b className="sm">{tr(PROBLEM_KINDS[p.kind as keyof typeof PROBLEM_KINDS] ?? p.kind)}</b> <span className={`badge ${p.status === 'open' ? 'p' : 'ok'}`}>{tr(p.status === 'open' ? 'Under review' : 'Answered')}</span>
        <div className="sm" style={{ whiteSpace: 'pre-wrap' }}>{p.body}</div><div className="mu xs">{dateLabel(p.created_at, lang)}</div>
        {p.resolution && <div className="note" style={{ margin: '8px 0 0' }}>{tr('NovaFides team')}: {p.resolution}</div>}</div>)}
      <details className="card formcard"><summary style={{ cursor: 'pointer' }}><b>⚠ {tr('Report a problem')}</b> <span className="mu xs">{tr('The order, chat and quote are attached automatically.')}</span></summary>
        <ActionForm action={reportProblem} className="list" style={{ gap: 8, marginTop: 10 }} okText><input type="hidden" name="id" value={id} />
          <select className="inp" name="kind" required defaultValue="" aria-label={tr('What happened?')}><option value="" disabled>{tr('What happened?')}</option>
            {Object.entries(PROBLEM_KINDS).map(([k, v]) => <option key={k} value={k}>{tr(v)}</option>)}</select>
          <textarea className="inp" name="body" required maxLength={2000} style={{ minHeight: 80 }} placeholder={tr('Describe what happened. Photos can be sent in the chat.')} />
          <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Send to NovaFides')}</button></ActionForm>
      </details>
    </div></section>
  );
}
