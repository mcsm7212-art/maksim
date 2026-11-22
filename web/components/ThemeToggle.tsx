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

/** Small landscape for a theme card: mountains by day (sun) or by night (moon and stars). */
function Scene({ kind }: { kind: 'day' | 'night' }) {
  const day = kind === 'day'; const id = `sky-${kind}`;
  return (
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden className="tscene">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {day ? <><stop offset="0" stopColor="#F3B27A" /><stop offset=".55" stopColor="#E9C9A8" /><stop offset="1" stopColor="#B9A6B8" /></>
          : <><stop offset="0" stopColor="#0E1424" /><stop offset=".6" stopColor="#1C2A44" /><stop offset="1" stopColor="#2B3A55" /></>}
      </linearGradient></defs>
      <rect width="120" height="80" fill={`url(#${id})`} />
      {day ? <circle cx="88" cy="22" r="8" fill="#FFF3D6" /> : <>
        <path d="M30 14a9 9 0 1 0 9 13 7 7 0 1 1-9-13z" fill="#F4EBD0" />
        {[[70, 10], [92, 18], [104, 8], [58, 22], [112, 28], [80, 6]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r=".9" fill="#fff" opacity=".85" />)}</>}
      <path d="M0 62 L22 40 L36 52 L58 26 L80 50 L96 38 L120 56 V80 H0Z" fill={day ? '#8D7F9C' : '#2E3B57'} />
      <path d="M58 26 L52 34 L57 33 L61 38 L64 32Z" fill={day ? '#C9A9A0' : '#5B6A88'} opacity=".8" />
      <path d="M0 70 L30 54 L52 66 L78 50 L120 68 V80 H0Z" fill={day ? '#5E5470' : '#1B2438'} />
      {day && [6, 12, 18, 24].map((x) => <path key={x} d={`M${x} 80 L${x + 3} 66 L${x + 6} 80Z`} fill="#3D3848" />)}
    </svg>
  );
}

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
          <span className={`tprev ${c}`}>{c === 'system' ? <><Scene kind="day" /><span className="tnight"><Scene kind="night" /></span><i className="tcut" /></> : <Scene kind={c === 'light' ? 'day' : 'night'} />}
            {choice === c && <span className="tcheck" aria-hidden>✓</span>}</span>
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
