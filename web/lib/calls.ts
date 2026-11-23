import { pacificParts } from './time';

export type CallDays = Record<string, { start: string; end: string }>;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const h12 = (s: string) => { const [h, m] = s.split(':').map(Number); return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`; };

/** "Mon–Fri 8 AM–6 PM, Sat 9 AM–1 PM": days with the same hours are joined. */
export function callHoursText(days: CallDays, tr: (s: string) => string): string {
  const out: string[] = []; let run: number[] = []; let cur = '';
  const flush = () => { if (!run.length) return; const [a, z] = [run[0], run[run.length - 1]]; const [s, e] = cur.split('|'); out.push(`${tr(WD[a])}${z !== a ? `–${tr(WD[z])}` : ''} ${h12(s)}–${h12(e)}`); run = []; };
  for (const d of ORDER) { const x = days[d]; const k = x ? `${x.start}|${x.end}` : ''; if (k !== cur) { flush(); cur = k; } if (x) run.push(d); }
  flush(); return out.join(', ');
}
/** Is the pro taking calls right now (Bay Area time)? */
export function callsOpenNow(days: CallDays, now = new Date()): boolean {
  const p = pacificParts(now); const x = days[p.weekday]; if (!x) return false;
  const t = `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
  return t >= x.start && t < x.end;
}
