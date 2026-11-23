'use client';
import { useState, useTransition } from 'react';
import { requestTrade } from '@/app/join/actions';
import { useT } from './I18n';

/** "+ Add your trade": a pro whose trade is not one of the four names it; NovaFides sees the requests and adds trades. */
export default function TradeRequest() {
  const t = useT();
  const [open, setOpen] = useState(false); const [name, setName] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [busy, start] = useTransition();
  const send = () => start(async () => {
    const r = await requestTrade(name);
    if (r.ok) { setMsg({ ok: true, text: t('Thank you! We will add “{name}”. For now, pick the closest trade above.', { name: name.trim() }) }); setName(''); setOpen(false); }
    else setMsg({ ok: false, text: t(r.error ?? 'Could not send. Try again.') });
  });
  return (
    <div className="trade-req">
      {!open && <button type="button" className="add-own" onClick={() => { setOpen(true); setMsg(null); }}><i aria-hidden>+</i><b>{t('Add your trade')}</b></button>}
      {open && <div className="trade-req-row">
        <input className="inp" value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} placeholder={t('e.g. Roofing, Painting, HVAC')} aria-label={t('Your trade')}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (name.trim().length >= 2) send(); } }} />
        <button type="button" className="btn sm" disabled={busy || name.trim().length < 2} onClick={send}>{t(busy ? 'Sending…' : 'Send')}</button>
        <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>{t('Cancel')}</button>
      </div>}
      <span className="mu xs">{t('Your trade is not in the list? Tell us which one: we add new trades based on these requests.')}</span>
      {msg && <span className={msg.ok ? 'okmsg xs' : 'err xs'} role="status">{msg.text}</span>}
    </div>
  );
}
