'use client';
import { useEffect, useRef, useState } from 'react';
import { useT } from './I18n';

/** Address field with suggestions while typing (Bay Area first). The person can always type the address by hand. */
export default function AddressInput({ name = 'address', placeholder, required }: { name?: string; placeholder: string; required?: boolean }) {
  const t = useT();
  const [v, setV] = useState(''); const [list, setList] = useState<string[]>([]); const [open, setOpen] = useState(false); const [at, setAt] = useState(-1);
  const skip = useRef(false); const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const q = v.trim(); if (q.length < 4) { setList([]); return; }
    const ctl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: ctl.signal }).then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items?: string[] }) => { setList(d.items ?? []); setOpen(true); setAt(-1); }).catch(() => {});
    }, 280);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [v]);
  useEffect(() => {
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', out); return () => document.removeEventListener('mousedown', out);
  }, []);
  const pick = (s: string) => { skip.current = true; setV(s); setOpen(false); setList([]); };
  return (
    <div className="addr" ref={box}>
      <input className="inp" name={name} required={required} value={v} placeholder={placeholder} aria-label={t('Job address')} autoComplete="off" role="combobox" aria-expanded={open && list.length > 0} aria-controls="addr-list" aria-autocomplete="list"
        onChange={(e) => setV(e.target.value)} onFocus={() => list.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !list.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setAt((at + 1) % list.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setAt((at - 1 + list.length) % list.length); }
          else if (e.key === 'Enter' && at >= 0) { e.preventDefault(); pick(list[at]); }
          else if (e.key === 'Escape') setOpen(false);
        }} />
      {open && list.length > 0 && <ul id="addr-list" className="addr-list" role="listbox">
        {list.map((s, i) => <li key={s} role="option" aria-selected={i === at} onMouseDown={(e) => { e.preventDefault(); pick(s); }}>📍 {s}</li>)}
      </ul>}
    </div>
  );
}
