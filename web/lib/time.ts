// All schedules are in Bay Area time, wherever the server runs.
export const TZ = 'America/Los_Angeles';
const fmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' });
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function pacificParts(d: Date) {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, weekday: WD.indexOf(p.weekday) };
}
/** Date for a Pacific wall-clock time (day may overflow, e.g. d = 32). */
export function atPacific(y: number, m: number, d: number, h: number, min = 0): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const p = pacificParts(new Date(guess));
  const shown = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  return new Date(guess + (guess - shown));
}
export function slotLabel(iso: string): [string, string] {
  const t = new Date(iso); const p = pacificParts(t); const n = pacificParts(new Date());
  const dd = Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(n.y, n.m - 1, n.d)) / 864e5);
  const day = dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : `${WD[p.weekday]} ${p.m}/${p.d}`;
  return [day, `${p.h % 12 || 12}:${String(p.min).padStart(2, '0')} ${p.h < 12 ? 'AM' : 'PM'}`];
}
export const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' });
