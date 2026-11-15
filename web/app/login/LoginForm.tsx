'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Email sign-in with a 6-digit code (also works by clicking the link in the email). No passwords.
export default function LoginForm({ next, live }: { next: string; live: boolean }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function send(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (!live) { setMsg('Demo mode: sign-in turns on when the database is connected.'); return; }
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`, data: name ? { full_name: name } : undefined },
    });
    setBusy(false);
    if (error) setMsg(error.message); else setStep('code');
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setMsg('That code did not work. Check the latest email or send a new code.');
    else { router.replace(next); router.refresh(); }
  }

  return step === 'email' ? (
    <form className="card formcard" onSubmit={send}>
      <label className="f">Email<input className="inp" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" /></label>
      <label className="f">Your name (new accounts)<input className="inp" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="First and last name" /></label>
      {msg && <div className="err" role="alert">{msg}</div>}
      <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in code'}</button>
      <span className="mu xs">No password needed. New here? This creates your account.</span>
    </form>
  ) : (
    <form className="card formcard" onSubmit={verify}>
      <p style={{ margin: 0 }}>We sent a code to <b>{email}</b>. Enter it below, or tap the link in the email.</p>
      <label className="f">Code<input className="inp" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" style={{ fontSize: 22, letterSpacing: '.3em' }} /></label>
      {msg && <div className="err" role="alert">{msg}</div>}
      <button className="btn" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
      <button type="button" className="btn ghost sm" onClick={() => setStep('email')}>Use a different email</button>
    </form>
  );
}
