'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { useT } from './I18n';

// Inside the preview only the page itself is shown (no site menu, footer or bottom bar).
// Only the top of the pro page (name, trade, popular jobs, figure): nothing below it and no scrolling.
const CLEAN = 'header.bar,footer.ft,.bnav,.stick3,.demo-note{display:none!important}.in>:not(.ph3){display:none!important}html,body{overflow:hidden!important;padding-bottom:0!important}';
/** Height of the visible top of the page inside the frame (so the window has no empty space). */
const topHeight = (f: HTMLIFrameElement) => { try { const el = f.contentDocument?.querySelector('.ph3'); return el ? Math.ceil(el.getBoundingClientRect().bottom + 20) : null; } catch { return null; } };
const clean = (f: HTMLIFrameElement | null) => { try { const d = f?.contentDocument; if (d && !d.getElementById('peek-css')) { const s = d.createElement('style'); s.id = 'peek-css'; s.textContent = CLEAN; d.head.appendChild(s); } } catch { /* other site */ } };

/**
 * A small picture that shows a whole page in a window: on hover a small live preview pops up next to it,
 * a click opens it big over the current page (no new tab; Esc or ✕ closes it).
 */
export default function PagePeek({ href, img, label, title }: { href: string; img: string; label: string; title: string }) {
  const t = useT();
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null); const [big, setBig] = useState(false);
  const me = useRef<HTMLSpanElement>(null);
  const [h, setH] = useState(760); // the page top's height at 1100 px wide
  const [vw, setVw] = useState({ w: 1300, h: 900 });
  useEffect(() => { if (!big) return; const r = () => setVw({ w: innerWidth, h: innerHeight }); r(); addEventListener('resize', r); return () => removeEventListener('resize', r); }, [big]);
  const sc = Math.min(1, (vw.w * 0.96) / 1100, (vw.h * 0.92 - 52) / h);
  const loaded = (f: HTMLIFrameElement) => { clean(f); setTimeout(() => { const v = topHeight(f); if (v) setH(Math.min(1000, v)); }, 120); };
  // Next to the picture (right side, or left if there is no room), fully inside the window.
  const place = () => {
    const r = me.current?.getBoundingClientRect(); if (!r) return null;
    const W = 379, H = 300, gap = 12;
    const x = r.right + gap + W <= innerWidth - 8 ? r.right + gap : Math.max(8, r.left - gap - W);
    const y = Math.min(Math.max(72, r.top + r.height / 2 - H / 2), innerHeight - H - 8);
    return { x, y };
  };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fine = () => typeof window !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const enter = () => { if (!fine()) return; if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setHover(place()), 250); };
  const leave = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setHover(null), 200); };
  useEffect(() => {
    if (!big) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(false); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [big]);
  return (
    <span className="peek" ref={me} onMouseEnter={enter} onMouseLeave={leave}>
      <button type="button" className="peek-thumb" onClick={() => { setHover(null); setBig(true); }} aria-label={`${t('Example page')}: ${title}`}>
        <img src={img} alt="" loading="lazy" /><span>{label}</span>
      </button>
      {hover && !big && <span className="peek-pop" role="button" tabIndex={-1} style={{ left: hover.x, top: hover.y }} onClick={() => { setHover(null); setBig(true); }}>
        <span className="peek-frame" style={{ height: Math.round(h * 0.33) }}><iframe src={href} title={title} loading="lazy" tabIndex={-1} scrolling="no" style={{ height: h }} onLoad={(e) => loaded(e.currentTarget)} /></span>
        <small>{t('Click to open it bigger')}</small>
      </span>}
      {big && <span className="peek-modal" role="dialog" aria-modal="true" aria-label={title} onClick={() => setBig(false)}>
        <span className="peek-box" style={{ width: Math.round(1100 * sc) }} onClick={(e) => e.stopPropagation()}>
          <span className="peek-top"><b>{title}</b> <span className="mu xs">· {t('Example page')}</span><button type="button" className="btn ghost sm" onClick={() => setBig(false)}>✕ {t('Close')}</button></span>
          {/* only to look at: the page is shown whole (1100 px wide, scaled to fit) and nothing inside can be clicked */}
          <span className="peek-big" style={{ height: Math.round(h * sc) }}>
            <iframe src={href} title={title} scrolling="no" tabIndex={-1} style={{ height: h, transform: `scale(${sc})` }} onLoad={(e) => loaded(e.currentTarget)} />
          </span>
        </span>
      </span>}
    </span>
  );
}
