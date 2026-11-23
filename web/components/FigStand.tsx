'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type CSSProperties } from 'react';

type Foot = { l: number; w: number; y: number }; // left and width in % of the picture width, sole height in % of the picture height
type Stand = { drop: number; feet: Foot[]; amb: { l: number; w: number; y: number; h: number } };

/**
 * Finds the soles in a cut-out figure (transparent background): the lowest solid pixels of each foot.
 * People often stand half-turned with one foot forward, so the soles are at different heights.
 */
function findFeet(img: HTMLImageElement): Stand | null {
  const W = Math.min(220, img.naturalWidth), H = Math.round((img.naturalHeight * W) / img.naturalWidth);
  if (!W || !H) return null;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(img, 0, 0, W, H);
  const px = x.getImageData(0, 0, W, H).data; // throws if the picture is from another site without CORS
  const top = Math.floor(H * 0.72);
  const low = new Array<number>(W).fill(-1);
  for (let col = 0; col < W; col++) for (let y = H - 1; y >= top; y--) if (px[(y * W + col) * 4 + 3] > 140) { low[col] = y; break; }
  const maxY = Math.max(...low); if (maxY < 0) return null;
  // Columns that reach the floor band, grouped into feet (small gaps allowed).
  const band = maxY - H * 0.14;
  const groups: { a: number; b: number; y: number }[] = [];
  for (let col = 0; col < W; col++) {
    if (low[col] < band) continue;
    const g = groups[groups.length - 1];
    if (g && col - g.b <= 3) { g.b = col; g.y = Math.max(g.y, low[col]); } else groups.push({ a: col, b: col, y: low[col] });
  }
  const feet = groups.filter((g) => g.b - g.a + 1 >= W * 0.04).sort((p, q) => q.b - q.a - (p.b - p.a)).slice(0, 2);
  if (!feet.length) return null;
  const back = Math.min(...feet.map((f) => f.y)), front = Math.max(...feet.map((f) => f.y));
  const a = Math.min(...feet.map((f) => f.a)), b = Math.max(...feet.map((f) => f.b));
  const pctX = (v: number) => (v / W) * 100, pctY = (v: number) => (v / H) * 100;
  return {
    drop: pctY(H - 1 - back), // how far the back sole is above the picture's bottom edge
    feet: feet.map((f) => ({ l: pctX(f.a - (f.b - f.a) * 0.25), w: pctX((f.b - f.a + 1) * 1.5), y: pctY(f.y) })),
    amb: { l: pctX(a - (b - a) * 0.35), w: pctX((b - a + 1) * 1.7), y: pctY((back + front) / 2), h: Math.max(5, pctY(front - back) + 4.5) },
  };
}

/** A cut-out figure standing on the floor: soles on the floor line, a soft shadow under each foot. */
export default function FigStand({ src, alt, eager }: { src: string; alt: string; eager?: boolean }) {
  const [st, setSt] = useState<Stand | null>(null);
  const ref = useRef<HTMLImageElement>(null);
  const measure = (img: HTMLImageElement) => { try { setSt(findFeet(img)); } catch { /* picture from another site: keep the plain shadow */ } };
  // A cached picture can finish loading before the page comes alive: measure it then.
  useEffect(() => { const i = ref.current; if (i?.complete && i.naturalWidth) measure(i); }, [src]);
  const style = st ? ({ ['--drop' as string]: `${st.drop}%` } as CSSProperties) : undefined;
  return (
    <span className={`fstand${st ? ' found' : ''}`} style={style}>
      {st
        ? <>
            <i className="fshadow amb" aria-hidden style={{ left: `${st.amb.l}%`, width: `${st.amb.w}%`, top: `${st.amb.y}%`, height: `${st.amb.h}%`, bottom: 'auto', transform: 'translateY(-50%)' }} />
            {st.feet.map((f, i) => <i key={i} className="ffoot" aria-hidden style={{ left: `${f.l}%`, width: `${f.w}%`, top: `${f.y}%` }} />)}
          </>
        : <i className="fshadow" aria-hidden />}
      <img ref={ref} src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} crossOrigin="anonymous" onLoad={(e) => measure(e.currentTarget)} />
    </span>
  );
}
