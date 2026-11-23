'use client';
/* eslint-disable @next/next/no-img-element */
import { useT } from './I18n';

// Example pages (demo profiles) whose photos stand right: full height, feet side by side, arms crossed.
const EXAMPLES = [
  { slug: 'carlos-mendoza', name: 'Carlos Mendoza', img: '/test-pros/f8.webp' },
  { slug: 'priya-raman', name: 'Priya Raman', img: '/test-pros/f10.webp' },
  { slug: 'marcus-hill', name: 'Marcus Hill', img: '/test-pros/f3.webp' },
];

/** A small drawn person: `feet` = how the feet stand ('even', 'step' = one foot forward, 'cut' = feet out of the frame). */
function Pose({ feet, ok }: { feet: 'even' | 'step' | 'cut'; ok: boolean }) {
  const c = ok ? '#3FB27F' : '#E0564F';
  const lf = feet === 'step' ? 100 : 104, rf = feet === 'step' ? 112 : 104; // sole heights
  return (
    <svg viewBox="0 0 80 124" width="80" height="124" aria-hidden>
      <rect x="1" y="1" width="78" height={feet === 'cut' ? 92 : 122} rx="8" fill="none" stroke="currentColor" strokeOpacity=".25" strokeDasharray="3 3" />
      <circle cx="40" cy="18" r="9" fill="currentColor" opacity=".85" />
      <path d="M27 32h26l3 34H24z" fill="currentColor" opacity=".7" />
      <path d={`M33 66 L${feet === 'step' ? 31 : 33} ${lf - 4} M47 66 L${feet === 'step' ? 50 : 47} ${rf - 4}`} stroke="currentColor" strokeWidth="7" strokeLinecap="round" opacity=".7" />
      {feet !== 'cut' && <>
        <rect x={feet === 'step' ? 23 : 25} y={lf - 5} width="13" height="5" rx="2" fill="currentColor" />
        <rect x={feet === 'step' ? 45 : 43} y={rf - 5} width="13" height="5" rx="2" fill="currentColor" />
        {/* floor line under each foot: one line when the feet are side by side */}
        <line x1="18" x2="40" y1={lf + 2} y2={lf + 2} stroke={c} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" x2="62" y1={rf + 2} y2={rf + 2} stroke={c} strokeWidth="2.5" strokeLinecap="round" />
      </>}
      {feet === 'cut' && <line x1="4" x2="76" y1="93" y2="93" stroke={c} strokeWidth="2.5" />}
    </svg>
  );
}

/** How to take the profile photo: drawn examples with floor lines under the feet, and short tips. */
export default function PhotoTips({ open }: { open?: boolean }) {
  const t = useT();
  const cards: { feet: 'even' | 'step' | 'cut'; ok: boolean; text: string }[] = [
    { feet: 'even', ok: true, text: 'Feet side by side, on one line' },
    { feet: 'step', ok: true, text: 'Half-turned is fine too' },
    { feet: 'cut', ok: false, text: 'Shoes cut off' },
  ];
  return (
    <details className="ptips" open={open}>
      <summary>📸 {t('How to take a good photo')}</summary>
      <div className="ptips-cards">
        {cards.map((c) => (
          <figure key={c.feet} className={c.ok ? 'ok' : 'no'}>
            <Pose feet={c.feet} ok={c.ok} />
            <figcaption><b>{c.ok ? '✓' : '✕'}</b> {t(c.text)}</figcaption>
          </figure>
        ))}
      </div>
      <div className="ptips-ex">
        <small>{t('Good examples (open the page):')}</small>
        <div>{EXAMPLES.map((e) => (
          <a key={e.slug} href={`/pro/${e.slug}`} target="_blank" rel="noopener" title={e.name}>
            <img src={e.img} alt={e.name} loading="lazy" /><span>{e.name.split(' ')[0]}</span>
          </a>))}</div>
      </div>
      <ul>
        <li>{t('Facing the camera or half-turned, both feet on the floor.')}</li>
        <li>{t('Whole body in the photo, from head to shoes, with a little floor under the shoes.')}</li>
        <li>{t('Ask someone to hold the phone upright at waist height, 2–3 m (7–10 ft) away.')}</li>
        <li>{t('Daylight or a bright room, plain wall behind you, nobody else in the photo.')}</li>
        <li>{t('Work clothes. Arms crossed or relaxed, both look good.')}</li>
      </ul>
    </details>
  );
}
