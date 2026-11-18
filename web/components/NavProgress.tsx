'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/** Thin copper bar at the top while the next page loads, so every click feels answered. */
export default function NavProgress() {
  const path = usePathname(); const sp = useSearchParams();
  const [state, setState] = useState<'idle' | 'run' | 'done'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setState('run'); clearTimeout(timer.current); timer.current = setTimeout(() => setState('idle'), 12000);
    };
    const onSubmit = () => { setState('run'); clearTimeout(timer.current); timer.current = setTimeout(() => setState('idle'), 12000); };
    document.addEventListener('click', onClick, true); document.addEventListener('submit', onSubmit, true);
    return () => { document.removeEventListener('click', onClick, true); document.removeEventListener('submit', onSubmit, true); };
  }, []);
  useEffect(() => {
    setState((s) => (s === 'run' ? 'done' : s));
    clearTimeout(timer.current); timer.current = setTimeout(() => setState('idle'), 450);
  }, [path, sp]);
  return <div className={`navbar-progress ${state}`} aria-hidden />;
}
