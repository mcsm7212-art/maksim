'use client';
import { useEffect, useState } from 'react';
import { useT } from './I18n';

// Optional "feel" for the interface: a soft light that follows the mouse over cards, and — only if the visitor
// turns it on — a quiet mechanical tick (like a mouse-wheel detent) on clicks and hovers. Off by default.

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
function tick(volume: number) {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    if (!noise) { // 25 ms of noise, made once
      noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.025), ctx.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    }
    const src = ctx.createBufferSource(); src.buffer = noise;
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 2600 + Math.random() * 400; band.Q.value = 6;
    const g = ctx.createGain(); g.gain.value = volume;
    src.connect(band).connect(g).connect(ctx.destination); src.start();
  } catch { /* no audio: fine */ }
}
const INTERACTIVE = 'a, button, summary, label.chip, [role="button"], input[type="checkbox"], input[type="radio"], select';

export default function UiFeel() {
  const t = useT();
  const [on, setOn] = useState(false);
  useEffect(() => { try { setOn(localStorage.getItem('nf_sound') === '1'); } catch { /* private mode */ } }, []);

  // Light that follows the mouse on cards (desktop only; CSS uses --mx/--my).
  useEffect(() => {
    if (!matchMedia('(hover: hover)').matches) return;
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.card, .btn'); if (!el) return;
      const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    document.addEventListener('pointermove', move, { passive: true });
    return () => document.removeEventListener('pointermove', move);
  }, []);

  // Sounds, only when turned on.
  useEffect(() => {
    if (!on) return;
    let last: Element | null = null; let lastAt = 0;
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = (e.target as HTMLElement).closest(INTERACTIVE); if (!el || el === last) return;
      last = el; const now = performance.now(); if (now - lastAt < 110) return; lastAt = now; tick(0.035);
    };
    const down = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(INTERACTIVE)) return;
      if (e.pointerType === 'mouse') tick(0.09); else { tick(0.06); navigator.vibrate?.(8); }
    };
    document.addEventListener('pointerover', over, { passive: true }); document.addEventListener('pointerdown', down, { passive: true });
    return () => { document.removeEventListener('pointerover', over); document.removeEventListener('pointerdown', down); };
  }, [on]);

  const flip = () => { const next = !on; setOn(next); try { localStorage.setItem('nf_sound', next ? '1' : '0'); } catch { /* ignore */ } if (next) tick(0.09); };
  return (
    <button type="button" className="ico soundbtn" onClick={flip} aria-pressed={on} title={t(on ? 'Sounds: on' : 'Sounds: off')} aria-label={t(on ? 'Sounds: on' : 'Sounds: off')}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5L6 9H3v6h3l5 4z" />{on ? <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></> : <path d="M22 9l-6 6M16 9l6 6" />}
      </svg>
    </button>
  );
}
