'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from './I18n';

/** ☀ / ☾ switch: light or dark site. Remembered for a year. */
export default function ThemeToggle({ initial }: { initial: 'dark' | 'light' }) {
  const [theme, setTheme] = useState(initial); const router = useRouter(); const t = useT();
  const next = theme === 'dark' ? 'light' : 'dark';
  const flip = () => {
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.theme = next;
    setTheme(next); router.refresh();
  };
  return (
    <button type="button" className="ico themebtn" onClick={flip} title={t(next === 'light' ? 'Light theme' : 'Dark theme')} aria-label={t(next === 'light' ? 'Light theme' : 'Dark theme')}>
      {theme === 'dark'
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
    </button>
  );
}
