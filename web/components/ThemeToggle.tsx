'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useT } from './I18n';
import { useHoverIntent } from './useHoverIntent';

type Choice = 'light' | 'dark' | 'system';
const sysTheme = () => (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
const icons: Record<Choice, React.ReactNode> = {
  light: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  dark: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>,
  system: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>,
};

/** Landscape for a theme card: snowy mountains at sunset with a sun (day) or under a moon and stars (night). */
function Scene({ kind }: { kind: 'day' | 'night' }) {
  // Unique ids: the picker is on the page twice (header and menu), and a hidden copy would break shared gradients.
  const d = kind === 'day'; const k = `${kind}${useId().replace(/:/g, '')}`;
  const stars = [[12, 9], [24, 18], [40, 7], [52, 16], [66, 5], [78, 14], [96, 6], [108, 17], [116, 9], [30, 28], [86, 26], [4, 22]];
  return (
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden className="tscene">
      <defs>
        <linearGradient id={`sky-${k}`} x1="0" y1="0" x2="0" y2="1">
          {d ? <><stop offset="0" stopColor="#E9A56A" /><stop offset=".45" stopColor="#F2C79A" /><stop offset=".75" stopColor="#C9A9B8" /><stop offset="1" stopColor="#8E86A8" /></>
            : <><stop offset="0" stopColor="#080D1C" /><stop offset=".5" stopColor="#14203A" /><stop offset="1" stopColor="#2A3A5E" /></>}
        </linearGradient>
        <radialGradient id={`glow-${k}`} cx={d ? '.72' : '.28'} cy={d ? '.32' : '.25'} r=".45">
          <stop offset="0" stopColor={d ? '#FFF1C9' : '#E8E4D0'} stopOpacity={d ? '.95' : '.35'} /><stop offset="1" stopColor={d ? '#FFE0B0' : '#8FA2C8'} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`far-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={d ? '#A59AB8' : '#3A4A6E'} /><stop offset="1" stopColor={d ? '#8A82A2' : '#2A3756'} /></linearGradient>
        <linearGradient id={`peak-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={d ? '#8C7E9E' : '#33415F'} /><stop offset="1" stopColor={d ? '#5D5374' : '#1D2740'} /></linearGradient>
        <linearGradient id={`mist-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={d ? '#F6D9B8' : '#6E83AE'} stopOpacity="0" /><stop offset="1" stopColor={d ? '#F6D9B8' : '#6E83AE'} stopOpacity=".45" /></linearGradient>
      </defs>
      <rect width="120" height="80" fill={`url(#sky-${k})`} />
      <rect width="120" height="80" fill={`url(#glow-${k})`} />
      {d ? <circle cx="86" cy="24" r="7.5" fill="#FFF6DE" /> : <>
        {stars.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 0.55 : 0.9} fill="#fff" opacity={i % 2 ? 0.7 : 0.95} />)}
        <path d="M31 12a10 10 0 1 0 10 15 8 8 0 1 1-10-15z" fill="#F7EED2" />
      </>}
      {/* far range */}
      <path d="M0 52 L14 40 L24 46 L38 33 L50 44 L62 36 L74 45 L90 31 L104 42 L120 36 V80 H0Z" fill={`url(#far-${k})`} opacity=".9" />
      {/* main peak with snow and a lit side */}
      <path d="M18 70 L60 22 L102 70Z" fill={`url(#peak-${k})`} />
      <path d="M60 22 L102 70 L74 70 L66 48 Z" fill={d ? '#4E4566' : '#151D33'} opacity=".55" />
      <path d="M60 22 L52 32 L56 31 L59 35 L62 30 L66 33 L68 30Z" fill={d ? '#FBEFE6' : '#C9D3E6'} opacity=".95" />
      {/* mist */}
      <rect y="52" width="120" height="16" fill={`url(#mist-${k})`} />
      {/* foreground hills */}
      <path d="M0 66 Q20 58 38 64 T76 62 T120 60 V80 H0Z" fill={d ? '#4C4462' : '#162036'} />
      <path d="M0 74 Q30 66 60 72 T120 70 V80 H0Z" fill={d ? '#352F45' : '#0E1526'} />
      {/* pines */}
      {(d ? [3, 9, 15, 21, 104, 111] : [4, 11, 108, 114]).map((x, i) => <path key={x} d={`M${x} 78 L${x + 3.2} ${62 + (i % 2) * 4} L${x + 6.4} 78Z`} fill={d ? '#2A2436' : '#0A101E'} />)}
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
