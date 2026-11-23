'use client';
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from 'react';
import { useT } from './I18n';

type R = { x: number; y: number; w: number; h: number };
type Grab = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const MIN = 0.08;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Crop frame over a picture: drag the corners or sides to cut off what you don't need, drag inside to move it. */
export default function CropBox({ src, onDone, onCancel }: { src: string; onDone: (r: R) => void; onCancel: () => void }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [r, setR] = useState<R>({ x: 0, y: 0, w: 1, h: 1 });
  const drag = useRef<{ g: Grab; px: number; py: number; r: R } | null>(null);

  function down(g: Grab, e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { g, px: e.clientX, py: e.clientY, r };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current, b = box.current?.getBoundingClientRect(); if (!d || !b) return;
    const dx = (e.clientX - d.px) / b.width, dy = (e.clientY - d.py) / b.height; const o = d.r;
    let { x, y, w, h } = o;
    if (d.g === 'move') { x = clamp(o.x + dx, 0, 1 - o.w); y = clamp(o.y + dy, 0, 1 - o.h); }
    else {
      if (d.g.includes('w')) { x = clamp(o.x + dx, 0, o.x + o.w - MIN); w = o.x + o.w - x; }
      if (d.g.includes('e')) w = clamp(o.w + dx, MIN, 1 - o.x);
      if (d.g.includes('n')) { y = clamp(o.y + dy, 0, o.y + o.h - MIN); h = o.y + o.h - y; }
      if (d.g.includes('s')) h = clamp(o.h + dy, MIN, 1 - o.y);
    }
    setR({ x, y, w, h });
  }
  const up = () => { drag.current = null; };
  const whole = r.x < 0.003 && r.y < 0.003 && r.w > 0.994 && r.h > 0.994;
  const pct = (v: number) => `${v * 100}%`;

  return (
    <div className="crop">
      <div className="crop-wrap">
        <div ref={box} className="crop-img" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <img src={src} alt="" draggable={false} />
          <div className="crop-r" style={{ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) }} onPointerDown={(e) => down('move', e)}>
            {(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as Grab[]).map((g) => (
              <i key={g} className={`crop-h ${g}`} onPointerDown={(e) => down(g, e)} aria-hidden />
            ))}
          </div>
        </div>
      </div>
      <span className="mu xs">{t('Drag the corners or sides of the frame. Everything outside the frame is cut off.')}</span>
      <div className="chips">
        <button type="button" className="btn sm" onClick={() => onDone(r)} disabled={whole}>✂ {t('Crop')}</button>
        <button type="button" className="btn ghost sm" onClick={() => setR({ x: 0, y: 0, w: 1, h: 1 })} disabled={whole}>{t('Reset')}</button>
        <button type="button" className="btn ghost sm" onClick={onCancel}>{t('Cancel')}</button>
      </div>
    </div>
  );
}
