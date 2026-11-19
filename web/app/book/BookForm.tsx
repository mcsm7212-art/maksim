'use client';
import Disclaimer from '@/components/Disclaimer';
import { useActionState, useRef, useState } from 'react';
import { createBooking } from './actions';
import { useT } from '@/components/I18n';

type Summary = { mode: 'book' | 'estimate' | 'company'; to: string; svc?: string; t?: string; services: Record<string, { name: string; price: number | null }>; slots: Record<string, string>; trip: string; urgent?: string };

/** Booking / estimate form with a live summary: who gets it, what, about how much, when, and what happens next. */
export default function BookForm({ hidden, children, cta, summary }: { hidden: Record<string, string>; children: React.ReactNode; cta: string; summary: Summary }) {
  const [state, action, pending] = useActionState(createBooking, undefined); const t = useT();
  const ref = useRef<HTMLFormElement>(null);
  const [v, setV] = useState<Record<string, string>>({});
  const read = () => { if (!ref.current) return; const f = new FormData(ref.current); setV(Object.fromEntries([...f.entries()].filter(([, x]) => typeof x === 'string')) as Record<string, string>); };
  const svc = summary.services[v.svc ?? summary.svc ?? ''];
  const where = summary.mode === 'estimate' ? [v.city, v.zip].filter(Boolean).join(' ') : v.address;
  const when = summary.mode === 'book' ? summary.slots[v.t ?? summary.t ?? ''] : summary.mode === 'company' ? t(({ today: 'Today', tomorrow: 'Tomorrow', week: 'This week' } as Record<string, string>)[v.day ?? 'today'] ?? 'This week') : null;
  const next = summary.mode === 'book' ? 'This is a visit request. The pro confirms the time and you get a notification. The final price is in the quote before work starts.'
    : summary.mode === 'estimate' ? 'Your request, area and photos go to the pro in a chat. The pro answers there or sends a quote you can accept.'
    : 'The office picks a technician and you see who is coming in your orders. The final price is in the quote before work starts.';
  return (
    <form ref={ref} action={action} className="list" onChange={read} onInput={read}>
      {Object.entries(hidden).map(([k, x]) => <input key={k} type="hidden" name={k} value={x} />)}
      {children}
      <div className="card summary">
        <b>{t('Check your request')}</b>
        <dl>
          <dt>{t('Goes only to')}</dt><dd>{summary.to}</dd>
          <dt>{t('Job')}</dt><dd>{svc?.name ?? <span className="mu">{t('Not chosen: the pro will help')}</span>}</dd>
          <dt>{t('Price')}</dt><dd>{svc?.price != null ? <>≈ ${svc.price.toLocaleString('en-US')} <span className="mu xs">{t('typical for this job')}</span></> : <span className="mu">{t('In the quote')}</span>}</dd>
          <dt>{t('Trip fee')}</dt><dd>{summary.trip}</dd>
          {summary.urgent && <><dt>{t('Urgent visit')}</dt><dd>{summary.urgent}</dd></>}
          {when !== null && <><dt>{t('When')}</dt><dd>{when || <span className="mu">{t('Pick a time above')}</span>}</dd></>}
          <dt>{t('Where')}</dt><dd>{where || <span className="mu">{t('Not filled in yet')}</span>}</dd>
        </dl>
        <span className="mu xs">{t(next)}</span>
        <Disclaimer />
      </div>
      {state?.error && <div className="err" role="alert">{t(state.error)}</div>}
      {state?.demo && <div className="note">{t('Demo mode: the request was not sent. When the database is connected, this creates a real booking.')}</div>}
      <button className="btn" disabled={pending}>{pending ? t('Sending…') : cta}</button>
    </form>
  );
}
