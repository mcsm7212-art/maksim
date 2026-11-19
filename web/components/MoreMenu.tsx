'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useT } from './I18n';

/** Phones: the second-level links, language, theme and sound live behind one "⋯" button. */
export default function MoreMenu({ children }: { children: React.ReactNode }) {
  const t = useT(); const ref = useRef<HTMLDetailsElement>(null); const path = usePathname();
  useEffect(() => { if (ref.current) ref.current.open = false; }, [path]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false; };
    document.addEventListener('click', close); return () => document.removeEventListener('click', close);
  }, []);
  return (
    <details className="more" ref={ref}>
      <summary aria-label={t('More')}>⋯</summary>
      <div className="acct-menu more-menu">{children}</div>
    </details>
  );
}
