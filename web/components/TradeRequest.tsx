'use client';
import { useState } from 'react';
import { requestTrade } from '@/app/join/actions';
import { useT } from './I18n';
import { badText, ENGLISH_ONLY, notEnglish } from '@/lib/clean-words';

/**
 * "+ Add your trade": a pro whose trade is not one of the four types its name and gets it right away, only for themselves.
 * The name is also sent to NovaFides (admin list), so popular trades can get a ready list later.
 */
export default function TradeRequest({ onAdd, current }: { onAdd: (name: string) => void; current?: string | null }) {
  const t = useT();
  const [open, setOpen] = useState(false); const [name, setName] = useState('');
  const bad = badText(name) ? 'Please remove rude or offensive words. Clients see this text.' : notEnglish(name) ? ENGLISH_ONLY : null;
  const ok = name.trim().length >= 2 && !bad;
  const add = () => { if (!ok) return; const n = name.trim().slice(0, 40); onAdd(n); requestTrade(n).catch(() => {}); setName(''); setOpen(false); };
  return (
    <div className="trade-req">
      {!open && <button type="button" className="add-own" onClick={() => setOpen(true)}><i aria-hidden>+</i><b>{t(current ? 'Change your trade' : 'Add your trade')}</b></button>}
      {open && <div className="trade-req-row">
        <input className="inp" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} placeholder={t('e.g. Roofing, Painting, HVAC')} aria-label={t('Your trade')}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } if (e.key === 'Escape') setOpen(false); }} />
        <button type="button" className="btn sm" disabled={!ok} onClick={add}>{t('Add')}</button>
        <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>{t('Cancel')}</button>
      </div>}
      {open && bad && <span className="err xs">{t(bad)}</span>}
      <span className="mu xs">{t('Your trade is not in the list? Add it: only you see it, and below you make your own categories and jobs.')}</span>
    </div>
  );
}
