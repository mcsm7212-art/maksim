'use client';
import { useEffect, useRef, useState } from 'react';
import { useT } from './I18n';

/** "Select all" in a service group heading: ticks or unticks every service in that group at once. */
export default function GroupAll() {
  const t = useT(); const ref = useRef<HTMLInputElement>(null);
  const [n, setN] = useState({ on: 0, all: 0 });
  const boxes = () => [...(ref.current?.closest('details')?.querySelectorAll<HTMLInputElement>('input[type=checkbox][name^="svc_"]') ?? [])];
  const count = () => { const b = boxes(); setN({ on: b.filter((x) => x.checked).length, all: b.length }); };
  useEffect(() => {
    const d = ref.current?.closest('details'); if (!d) return;
    count(); d.addEventListener('change', count); const f = d.closest('form'); f?.addEventListener('input', count);
    return () => { d.removeEventListener('change', count); f?.removeEventListener('input', count); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (ref.current) ref.current.indeterminate = n.on > 0 && n.on < n.all; }, [n]);
  const all = n.all > 0 && n.on === n.all;
  return (
    <label className="grp-all" onClick={(e) => e.stopPropagation()}>
      <input ref={ref} type="checkbox" checked={all} onChange={() => {
        const target = !all; boxes().forEach((b) => { if (b.checked !== target) b.click(); }); count();
        const d = ref.current?.closest('details'); if (d && target) d.open = true;
      }} aria-label={t('Select all')} />
      <span>{all ? t('Unselect all') : t('Select all')}</span>
    </label>
  );
}
