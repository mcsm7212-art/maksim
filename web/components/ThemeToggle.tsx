'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useT } from './I18n';
import { useHoverIntent } from './useHoverIntent';

type Choice = 'light' | 'dark' | 'system';
const sysTheme = () => (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
const icons: Record<Choice, React.ReactNode> = {
  light: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  dark: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>,
  system: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>,
};

/** Light / Dark / System, like phone settings: three preview cards. Opens on hover (mouse) or tap. */
export default function ThemeToggle({ initial, inline }: { initial: Choice; inline?: boolean }) {
  const t = useT(); const router = useRouter(); const ref = useRef<HTMLDetailsElement>(null); useHoverIntent(ref);
  const [choice, setChoice] = useState<Choice>(initial);
  const label: Record<Choice, string> = { light: t('Light'), dark: t('Dark'), system: t('System') };
  const apply = (c: Choice) => {
    const actual = c === 'system' ? sysTheme() : c;
    document.cookie = `theme=${c}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `theme_sys=${sysTheme()}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.theme = actual;
    setChoice(c); if (ref.current) ref.current.open = false; router.refresh();
  };
  // "System" follows the device when it switches (e.g. at sunset).
  useEffect(() => {
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const on = () => apply('system'); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);
  const cards = (
    <div className="theme-cards" role="radiogroup" aria-label={t('Appearance')}>
      {(['light', 'dark', 'system'] as Choice[]).map((c) => (
        <button key={c} type="button" role="radio" aria-checked={choice === c} className={`tcard${choice === c ? ' on' : ''}`} onClick={() => apply(c)}>
          <span className={`tprev ${c}`}><i /><i /><b /></span>
          <span className="tlabel">{label[c]}</span>
        </button>))}
    </div>
  );
  if (inline) return cards;
  return (
    <details className="acct themesel" ref={ref}>
      <summary className="ico themebtn" title={t('Appearance')} aria-label={t('Appearance')}>{icons[choice]}<span className="tg-label">{label[choice]}</span></summary>
      <div className="acct-menu theme-menu"><b className="xs mu" style={{ padding: '2px 4px 8px' }}>{t('Appearance')}</b>{cards}</div>
    </details>
  );
}
