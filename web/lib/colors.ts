import type { Base } from './types';
export const COPPER = '#B57A50';

function rgb(hex: string) { const v = parseInt(hex.replace('#', '').slice(0, 6), 16); return [v >> 16, (v >> 8) & 255, v & 255]; }
function lighten(hex: string, k: number) {
  const [r, g, b] = rgb(hex).map((c) => Math.round(c + (255 - c) * k));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
/** Accent for a solo pro's page from their work-clothes color. Black, grey or white clothes → NovaFides copper. */
export function accentFromUniform(uniform: string | null | undefined): string {
  if (!uniform || !/^#[0-9a-f]{6}$/i.test(uniform)) return COPPER;
  const [r, g, b] = rgb(uniform); const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx < 60 || mx - mn < 25) return COPPER;
  return mx < 120 ? lighten(uniform, 0.3) : uniform;
}
export function baseFor(accent: string): Base { return accent.toUpperCase() === COPPER ? 'dark' : 'graphite'; }
export const isHex = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
