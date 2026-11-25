/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import Disclaimer from '@/components/Disclaimer';
import { notFound, redirect } from 'next/navigation';
import ActionForm from '@/components/ActionForm';
import QuoteCard from '@/components/QuoteCard';
import NextSteps from '@/components/NextSteps';
import QuickReview from '@/components/QuickReview';
import { confirmDone, orderStatus, pickTime, reportProblem, reschedule, setWarranty } from '../actions';
import { getMe } from '@/lib/auth';
import { serviceById } from '@/lib/catalog';
import AddressInput from '@/components/AddressInput';
import SlotPicker from '@/components/SlotPicker';
import { dayViews, getPro } from '@/lib/data';
import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import { orderPhrase, PROBLEM_KINDS, stepIndex, STEPS } from '@/lib/orders';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel, slotLabel } from '@/lib/time';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Order({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const { id } = await params; const sent = (await searchParams).sent;
  if (!isLive()) redirect('/orders');
  const me = await getMe(); if (!me) redirect(`/login?next=/orders/${id}`);
  const tr = await getT(); const lang = await getLang(); const sb = await supabaseServer();
  if (isLive()) await sb.rpc('auto_confirm_done'); // jobs the client left unanswered for 5 days
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
  const reviewed = role === 'client' && o.status === 'done' ? Boolean((await sb.from('reviews').select('id').eq('booking_id', id).maybeSingle()).data) : false;
  const canMove = role === 'client' && ['requested', 'confirmed'].includes(o.status) && Boolean(o.pro?.slug) && Boolean(o.starts_at);
  const slots = role === 'client' && (o.status === 'needs_time' || canMove) && o.pro?.slug ? dayViews((await getPro(o.pro.slug))!, tr) : [];
  const WARRANTY: [number, string][] = [[0, 'No warranty'], [30, '30 days'], [90, '90 days'], [180, '6 months'], [365, '1 year'], [730, '2 years']];
  const warUntil = o.warranty_days && o.done_at ? new Date(new Date(o.done_at).getTime() + o.warranty_days * 864e5).toISOString() : null;
  const accepted = (qs ?? []).filter((q: any) => q.status === 'accepted').pop() as any;
  const svc = accepted?.title || svcName(serviceById(o.service_id ?? ''), lang) || tr('Estimate visit');
  const next: Record<string, [string, string]> = { requested: ['confirmed', 'Confirm visit'], confirmed: ['on_the_way', 'On my way'], on_the_way: ['in_progress', 'Start work'], in_progress: ['done', 'Job done'] };
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/orders">{tr('Orders')}</Link></div>
      {sent && o.status === 'assigning' && <NextSteps tr={tr} now={1} steps={['Request sent', 'The office picks a technician', 'The technician comes; the price is in the quote before work']} />}
      {sent && o.status === 'requested' && <NextSteps tr={tr} now={1} steps={['Request sent', 'The pro confirms the time', 'The pro comes; the price is in the quote before work']} />}
      {sent && <div className="note" style={{ marginBottom: 12 }}>✓ {tr(o.status === 'assigning' ? 'Request sent. The office picks a technician; you will see who is coming here.' : 'Request sent. This is not a confirmed visit yet: the pro confirms the time and you get a notification.')}</div>}
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
          <SlotPicker days={slots} />
          <AddressInput required placeholder={tr('Job address')} />
          <span className="mu xs">{tr('The pro sees the address only after confirming the visit.')}</span>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Send time to the pro')}</button>
        </ActionForm>}

        {role === 'pro' && next[o.status] && <div className="chips">
          <form action={orderStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={next[o.status][0]} /><button className="btn sm">{tr(next[o.status][1])}</button></form>
        </div>}
        {canMove && <details className="notes-box">
          <summary className="sm">🗓 {tr('Move the visit to another time')}</summary>
          <ActionForm action={reschedule} className="list" style={{ gap: 8, marginTop: 8 }} okText>
            <input type="hidden" name="id" value={id} />
            <SlotPicker days={slots} />
            <span className="mu xs">{tr('The pro gets the new time and confirms it again. If nothing fits, write in the chat.')}</span>
            <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Send the new time')}</button>
          </ActionForm>
        </details>}
        {['in_progress', 'done'].includes(o.status) && (role === 'pro'
          ? <form action={setWarranty} className="chips" style={{ alignItems: 'center' }}><input type="hidden" name="id" value={id} />
              <label className="sm">🛡 {tr('Warranty on my work')} <select className="inp" name="days" defaultValue={String(o.warranty_days ?? 0)} style={{ width: 'auto', padding: '6px 8px' }}>{WARRANTY.map(([d, l]) => <option key={d} value={d}>{tr(l)}</option>)}</select></label>
              <button className="btn ghost sm">{tr('Save')}</button>{warUntil && <span className="mu xs">{tr('until {date}', { date: dateLabel(warUntil, lang) })}</span>}</form>
          : o.warranty_days ? <div className="sm">🛡 {tr('Warranty on the work from the pro')}: <b>{tr(WARRANTY.find(([d]) => d === o.warranty_days)?.[1] ?? '') || `${o.warranty_days} ${tr('days')}`}</b>{warUntil && <span className="mu"> · {tr('until {date}', { date: dateLabel(warUntil, lang) })}</span>}</div> : null)}
        {o.auto_confirmed && <span className="mu xs">✓ {tr('Confirmed by itself: the client did not answer for 5 days and no problem was reported.')}</span>}
        {role === 'client' && o.status === 'done' && !o.client_confirmed_at && <form action={confirmDone} className="chips" style={{ alignItems: 'center' }}><input type="hidden" name="id" value={id} />
          <button className="btn sm">✓ {tr('Confirm the job is complete')}</button><span className="mu xs">{tr('If something is wrong, report a problem below instead. Without an answer, the job counts as confirmed in 5 days.')}</span></form>}
        {role === 'client' && o.status === 'done' && o.pro && !reviewed && <QuickReview id={id} name={String(o.pro.display_name ?? '').split(' ')[0]} />}
        {role === 'client' && o.status === 'done' && reviewed && <span className="okmsg sm">★ {tr('Thank you: your review is saved.')}</span>}
        <div className="chips">
          {conv?.id && <Link className="btn ghost sm" href={`/messages/${conv.id}`}>💬 {tr('Chat')}</Link>}
          {['needs_time', 'requested', 'confirmed'].includes(o.status) && <form action={orderStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="cancelled" /><button className="btn ghost sm">{tr('Cancel order')}</button></form>}
        </div>
      </div>

      {(qs ?? []).length > 0 && <><h3 style={{ marginTop: 22 }}>{tr('Quote')}</h3>
        <div className="list">{(qs ?? []).slice().reverse().map((q: any) => <QuoteCard key={q.id} role={role} inOrder q={{ id: q.id, conv: q.conversation_id, title: q.title, lines: q.lines ?? [], total: Number(q.total), includes: q.includes, notes: q.notes, validUntil: q.valid_until, duration: q.duration, license: q.pro_license, version: q.version, status: q.status, bookingId: q.booking_id, at: q.created_at }} />)}</div>
        {role === 'pro' && conv?.id && !['done', 'cancelled'].includes(o.status) && <p className="mu xs">{tr('Scope changed? Send a new version of the quote in the chat: the client accepts it and the agreed price updates.')}</p>}</>}

      {(o.notes || (o.photos ?? []).length > 0) && <><h3 style={{ marginTop: 22 }}>{tr('Request')}</h3>
        {o.notes && <p className="sm" style={{ whiteSpace: 'pre-wrap', marginTop: 0 }}>{o.notes}</p>}
        {(o.photos ?? []).length > 0 && <div className="jobstrip">{o.photos.map((u: string) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div>}</>}
      {(photos ?? []).length > 0 && <><h3 style={{ marginTop: 22 }}>{tr('Photos')}</h3>
        <div className="jobstrip">{(photos ?? []).map((p: any) => <a key={p.id} href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.kind} /></a>)}</div></>}

      <h3 style={{ marginTop: 22 }}>{tr('Is there a problem?')}</h3>
      {(problems ?? []).map((p: any) => <div key={p.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
        <b className="sm">{tr(PROBLEM_KINDS[p.kind as keyof typeof PROBLEM_KINDS] ?? p.kind)}</b> <span className={`badge ${p.status === 'open' ? 'p' : 'ok'}`}>{tr(p.status === 'open' ? 'Under review' : 'Answered')}</span>
        <div className="sm" style={{ whiteSpace: 'pre-wrap' }}>{p.body}</div><div className="mu xs">{dateLabel(p.created_at, lang)}</div>
        {p.resolution && <div className="note" style={{ margin: '8px 0 0' }}>{tr('NovaFides team')}: {p.resolution}</div>}</div>)}
      <Disclaimer />
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
