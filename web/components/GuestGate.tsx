'use client';
import { useRef, useState } from 'react';
import { LEGAL_VERSION } from '@/lib/legal-short';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useT } from './I18n';

type NfForm = HTMLFormElement & { nfFlush?: () => Promise<void> };
/**
 * Put inside any request form. A visitor who is not signed in fills the form as usual, then gives a name and an
 * email here, types the 6-digit code from the email, and the same form is sent. Nothing typed is lost and there is
 * no separate sign-in page. While the gate is open it holds the form back and shows its own button instead.
 */
export default function GuestGate({ cta, loginNext }: { cta: string; loginNext: string }) {
  const t = useT(); const box = useRef<HTMLDivElement>(null);
  const [signed, setSigned] = useState(false); const [step, setStep] = useState<'form' | 'code'>('form');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [agree, setAgree] = useState(false);
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  const form = () => box.current?.closest('form') as NfForm | null;
  const send = async () => {
    const f = form(); if (!f) return; setMsg(null);
    // the rest of the form first: the person sees what is missing before any email is sent
    const bad = [...f.elements].find((el) => !(el as HTMLInputElement).classList?.contains('ghost-req') && 'checkValidity' in el && !(el as HTMLInputElement).checkValidity()) as HTMLInputElement | undefined;
    if (bad) { bad.reportValidity(); return; }
    if (!agree) { setMsg(t('Please agree to the Terms of Use and Privacy Policy.')); return; }
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { data: { full_name: name, terms_version: LEGAL_VERSION } } });
    setBusy(false);
    if (error) setMsg(/rate limit/i.test(error.message) ? t('Too many sign-in emails were sent in the last hour. Please try again in an hour.') : error.message); else setStep('code');
  };
  const verify = async () => {
    setBusy(true); setMsg(null); const sb = supabaseBrowser();
    const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    if (error) { setBusy(false); setMsg(t('That code did not work. Check the latest email or send a new code.')); return; }
    await sb.rpc('accept_terms', { v: LEGAL_VERSION });
    try { await form()?.nfFlush?.(); } catch { /* photos can be added later in the chat */ }
    setSigned(true); setBusy(false);
    setTimeout(() => form()?.requestSubmit(), 150);
  };
  if (signed) return <div ref={box} hidden />;
  return (
    <div ref={box} className="card step guest-step guest-wait">
      <h3><i>✉</i>{t('How to reach you')}</h3>
      <span className="mu sm">{t('No password and no separate sign-up page: we email you a 6-digit code, you type it here and the request is sent. The answer of the pro comes to this email.')}</span>
      <div className="row2">
        <label className="f">{t('Your name')}<input className="inp" required minLength={2} maxLength={60} autoComplete="name" placeholder={t('First and last name')} value={name} onChange={(e) => setName(e.target.value)} data-guest="name" /></label>
        <label className="f">{t('Email')}<input className="inp" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} data-guest="email" /></label>
      </div>
      <label className="agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-guest="agree" />
        <span>{t('I am 18 or older and agree to the')} <a href="/terms" target="_blank">{t('Terms of Use')}</a> {t('and the')} <a href="/privacy" target="_blank">{t('Privacy Policy')}</a>.</span></label>
      {/* holds the form back until the email is confirmed */}
      <input className="ghost-req" tabIndex={-1} aria-hidden required defaultValue="" />
      {msg && <div className="err" role="alert">{msg}</div>}
      {step === 'code'
        ? <div className="formcard code-step pulse-green" style={{ padding: 12, borderRadius: 12, border: '1px solid #3FB27F' }}>
            <span>{t('We sent a code to')} <b>{email}</b>. {t('Type it here and your request is sent.')}</span>
            <input className="inp" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" aria-label={t('Code')} style={{ fontSize: 22, letterSpacing: '.3em' }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (code.trim().length >= 6) verify(); } }} />
            <div className="chips"><button type="button" className="btn" disabled={busy || code.trim().length < 6} onClick={verify}>{busy ? t('Checking…') : t('Confirm and send')}</button>
              <button type="button" className="btn ghost sm" onClick={() => { setStep('form'); setCode(''); }}>{t('Use a different email')}</button></div>
          </div>
        : <button type="button" className="btn guest-go" disabled={busy} onClick={send}>{busy ? t('Sending…') : cta}</button>}
      <a className="xs" href={`/login?next=${encodeURIComponent(loginNext)}`}>{t('Already have an account? Sign in')} →</a>
    </div>
  );
}
