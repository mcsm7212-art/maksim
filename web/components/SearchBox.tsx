'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { searchServices, TRADES, type Trade } from '@/lib/catalog';
import Icon from './Icon';

export default function SearchBox({ initial = '', trade }: { initial?: string; trade?: Trade | null }) {
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
        placeholder="What needs fixing? e.g. leaking faucet, EV charger, TV mount" aria-label="Search services" autoComplete="off" />
      {open && hits.length > 0 && (
        <div className="sugg" role="listbox">
          {hits.map((s) => (
            <button type="button" key={s.id} onMouseDown={(e) => e.preventDefault()} onClick={() => go(s.id)}>
              <span>{s.name}</span><span className="mu xs">{TRADES[s.trade].name}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
