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

/** Short colour word for the label next to the pro's figure, e.g. "BLUE". */
export function colorWord(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 'COPPER';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.12) return mx > 0.7 ? 'SILVER' : 'GRAPHITE';
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
  if (h < 9 || h >= 340) return 'RED';
  if (h < 28) return d > 0.5 ? 'TERRACOTTA' : 'COPPER';
  if (h < 40) return d < 0.45 ? 'SAND' : 'COPPER';
  if (h < 65) return 'GOLD';
  if (h < 160) return 'GREEN';
  if (h < 200) return 'TEAL';
  if (h < 255) return 'BLUE';
  return 'VIOLET';
}
