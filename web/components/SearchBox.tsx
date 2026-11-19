'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { searchServices, TRADES, type Trade } from '@/lib/catalog';
import Icon from './Icon';
import { useLang, useT } from './I18n';
import { svcName } from '@/lib/i18n-core';

export default function SearchBox({ initial = '', trade }: { initial?: string; trade?: Trade | null }) {
  const t = useT(); const lang = useLang();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const hits = useMemo(() => searchServices(q, trade, 7), [q, trade]);
  const go = (svc?: string) => {
    const p = new URLSearchParams(); if (svc) p.set('svc', svc); else if (q.trim()) p.set('q', q.trim()); if (trade) p.set('trade', trade);
    router.push(`/search?${p}`); setOpen(false);
  };
  return (
    <form className="sbox" role="search" onSubmit={(e) => { e.preventDefault(); go(hits[0]?.id); }}>
      <Icon name="search" />
      <input className="inp" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t('What needs fixing? e.g. leaking faucet, EV charger, TV mount')} aria-label={t('Search services')} autoComplete="off" />
      <a href="/photo" className="sbox-cam" title={t('Search by photo')} aria-label={t('Search by photo')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
      </a>
      {open && hits.length > 0 && (
        <div className="sugg" role="listbox">
          {hits.map((s) => (
            <button type="button" key={s.id} onMouseDown={(e) => e.preventDefault()} onClick={() => go(s.id)}>
              <span>{svcName(s, lang)}</span><span className="mu xs">{t(TRADES[s.trade].name)}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
