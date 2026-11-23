'use client';
import Disclaimer from '@/components/Disclaimer';
import { useActionState, useRef, useState } from 'react';
import { createBooking } from './actions';
import { useT } from '@/components/I18n';
import { LEGAL_VERSION } from '@/lib/legal-short';
import { supabaseBrowser } from '@/lib/supabase/client';

type Summary = { mode: 'book' | 'estimate' | 'company'; to: string; svc?: string; t?: string; services: Record<string, { name: string; price: number | null }>; slots: Record<string, string>; trip: string; urgent?: string };
export const OTHER = '__other';

/**
 * Booking / estimate form with a live summary: who gets it, what, about how much, when, and what happens next.
 * "My job is not in the list": no calendar yet; the pro first answers with a price and how long it takes.
 * A guest stays on the page: name + email, a 6-digit code from the email, and the request is sent.
 */
export default function BookForm({ hidden, children, when, where, whereOther, cta, ctaOther, summary, off, guest, live }: {
  hidden: Record<string, string>; children: React.ReactNode; when?: React.ReactNode; where: React.ReactNode; whereOther?: React.ReactNode;
  cta: string; ctaOther?: string; summary: Summary; off?: boolean; guest?: boolean; live?: boolean;
}) {
  const [state, action, pending] = useActionState(createBooking, undefined); const t = useT();
  const ref = useRef<HTMLFormElement>(null);
  const [v, setV] = useState<Record<string, string>>({});
  const read = () => { if (!ref.current) return; const f = new FormData(ref.current); setV(Object.fromEntries([...f.entries()].filter(([, x]) => typeof x === 'string')) as Record<string, string>); };
  const other = (v.svc ?? summary.svc) === OTHER && summary.mode === 'book';
  const mode = other ? 'estimate' : summary.mode;
  const svc = summary.services[v.svc ?? summary.svc ?? ''];
  const where2 = mode === 'estimate' ? [v.city, v.zip].filter(Boolean).join(' ') : v.address;
  const whenTxt = mode === 'book' ? summary.slots[v.t ?? summary.t ?? ''] : mode === 'company' ? t(({ today: 'Today', tomorrow: 'Tomorrow', week: 'This week' } as Record<string, string>)[v.day ?? 'today'] ?? 'This week') : null;
  const next = other ? 'The pro looks at your description and photos, then answers with a price and about how long the job takes. After that you pick a time.'
    : mode === 'book' ? 'This is a visit request. The pro confirms the time and you get a notification. The final price is in the quote before work starts.'
    : mode === 'estimate' ? 'Your request, area and photos go to the pro in a chat. The pro answers there or sends a quote you can accept.'
    : 'The office picks a technician and you see who is coming in your orders. The final price is in the quote before work starts.';

  // Guest: confirm the email with a code right here, then send the same form.
  const [signed, setSigned] = useState(!guest);
  const [step, setStep] = useState<'form' | 'code'>('form'); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  const flush = async () => { const f = ref.current as (HTMLFormElement & { nfFlush?: () => Promise<void> }) | null; if (f?.nfFlush) await f.nfFlush(); };
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (signed || !live) return;
    e.preventDefault(); setMsg(null);
    if (!v.g_agree) { setMsg(t('Please agree to the Terms of Use and Privacy Policy.')); return; }
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email: v.g_email, options: { data: { full_name: v.g_name, terms_version: LEGAL_VERSION } } });
    setBusy(false);
    if (error) setMsg(/rate limit/i.test(error.message) ? t('Too many sign-in emails were sent in the last hour. Please try again in an hour.') : error.message); else setStep('code');
  };
  const verify = async () => {
    setBusy(true); setMsg(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.verifyOtp({ email: v.g_email, token: code.trim(), type: 'email' });
    if (error) { setBusy(false); setMsg(t('That code did not work. Check the latest email or send a new code.')); return; }
    await sb.rpc('accept_terms', { v: LEGAL_VERSION });
    try { await flush(); } catch { /* photos can be added later in the chat */ }
    setSigned(true); setStep('form'); setBusy(false);
    setTimeout(() => ref.current?.requestSubmit(), 120);
  };

  return (
    <form ref={ref} action={action} className="list" onChange={read} onInput={read} onSubmit={onSubmit}>
      {Object.entries(hidden).map(([k, x]) => <input key={k} type="hidden" name={k} value={x} />)}
      {children}
      {other
        ? <div className="card step other-note"><b>🔎 {t('The pro looks at your job first')}</b>
            <span className="sm">{t('Describe the job above and add photos. The pro answers with a price and about how long it takes. Only then you see the calendar and pick a time.')}</span>
            <input type="hidden" name="estimate" value="1" /></div>
        : when}
      {other ? whereOther : where}

      {guest && <div className="card step guest-step" hidden={signed}>
        <h3><i>✉</i>{t('How to reach you')}</h3>
        <span className="mu sm">{t('No password and no separate sign-up page: we email you a 6-digit code, you type it here and the request is sent. The answer of the pro comes to this email.')}</span>
        <div className="row2">
          <label className="f">{t('Your name')}<input className="inp" name="g_name" required minLength={2} maxLength={60} autoComplete="name" placeholder={t('First and last name')} /></label>
          <label className="f">{t('Email')}<input className="inp" name="g_email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
        </div>
        <label className="f">{t('Phone (optional): the pro can call you back')}<input className="inp" name="phone" type="tel" inputMode="tel" maxLength={30} autoComplete="tel" placeholder="(650) 555-0123" /></label>
        <label className="agree"><input type="checkbox" name="g_agree" value="1" />
          <span>{t('I am 18 or older and agree to the')} <a href="/terms" target="_blank">{t('Terms of Use')}</a> {t('and the')} <a href="/privacy" target="_blank">{t('Privacy Policy')}</a>.</span></label>
        <a className="xs" href={`/login?next=${encodeURIComponent(`/book?${new URLSearchParams(hidden)}`)}`}>{t('Already have an account? Sign in')} →</a>
      </div>}

      <div className="card summary">
        <b>{t('Check your request')}</b>
        <dl>
          <dt>{t('Goes only to')}</dt><dd>{summary.to}</dd>
          <dt>{t('Job')}</dt><dd>{other ? t('Not in the list: described by you') : svc?.name ?? <span className="mu">{t('Not chosen: the pro will help')}</span>}</dd>
          <dt>{t('Price')}</dt><dd>{svc?.price != null ? <>≈ ${svc.price.toLocaleString('en-US')} <span className="mu xs">{t('typical for this job')}</span></> : <span className="mu">{t(other ? 'The pro answers with a price' : 'In the quote')}</span>}</dd>
          <dt>{t('Trip fee')}</dt><dd>{summary.trip}</dd>
          {summary.urgent && <><dt>{t('Urgent visit')}</dt><dd>{summary.urgent}</dd></>}
          {other ? <><dt>{t('When')}</dt><dd><span className="mu">{t('After the pro answers')}</span></dd></>
            : whenTxt !== null && <><dt>{t('When')}</dt><dd>{whenTxt || <span className="mu">{t('Pick a time above')}</span>}</dd></>}
          <dt>{t('Where')}</dt><dd>{where2 || <span className="mu">{t('Not filled in yet')}</span>}</dd>
        </dl>
        <span className="mu xs">{t(next)}</span>
        <Disclaimer />
      </div>
      {state?.error && <div className="err" role="alert">{t(state.error)}</div>}
      {msg && <div className="err" role="alert">{msg}</div>}
      {state?.demo && <div className="note">{t('Demo mode: the request was not sent. When the database is connected, this creates a real booking.')}</div>}
      {step === 'code'
        ? <div className="card formcard code-step pulse-green">
            <span>{t('We sent a code to')} <b>{v.g_email}</b>. {t('Type it here and your request is sent.')}</span>
            <input className="inp" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" aria-label={t('Code')} style={{ fontSize: 22, letterSpacing: '.3em' }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (code.trim().length >= 6) verify(); } }} />
            <div className="chips"><button type="button" className="btn" disabled={busy || code.trim().length < 6} onClick={verify}>{busy ? t('Checking…') : t('Confirm and send')}</button>
              <button type="button" className="btn ghost sm" onClick={() => { setStep('form'); setCode(''); }}>{t('Use a different email')}</button></div>
          </div>
        : <button className="btn" disabled={pending || busy || off}>{pending || busy ? t('Sending…') : other ? ctaOther ?? cta : cta}</button>}
    </form>
  );
}
