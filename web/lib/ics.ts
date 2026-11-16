// Minimal iCalendar (RFC 5545) reading and writing for calendar sync.
import { atPacific, pacificParts } from './time';

const unfold = (text: string) => text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');

type Prop = { value: string; params: Record<string, string> };
function prop(line: string): [string, Prop] {
  const i = line.indexOf(':');
  const head = line.slice(0, i); const value = line.slice(i + 1);
  const [name, ...ps] = head.split(';');
  const params: Record<string, string> = {};
  for (const p of ps) { const [k, v] = p.split('='); if (k) params[k.toUpperCase()] = (v ?? '').replace(/"/g, ''); }
  return [name.toUpperCase(), { value, params }];
}

/** Parses DTSTART/DTEND values: UTC (…Z), floating/TZID local time (treated as Bay Area time), or all-day dates. */
function toDate(p: Prop): { date: Date; allDay: boolean } | null {
  const m = p.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || p.params.VALUE === 'DATE') return { date: atPacific(+y, +mo, +d, 0), allDay: true };
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)), allDay: false };
  return { date: atPacific(+y, +mo, +d, +h, +mi), allDay: false };
}

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Busy ranges between `from` and `to`. Supports single events and simple DAILY/WEEKLY repeats (INTERVAL, COUNT, UNTIL, BYDAY, EXDATE). */
export function busyRanges(ics: string, from: Date, to: Date): { start: Date; end: Date }[] {
  const out: { start: Date; end: Date }[] = [];
  let ev: Record<string, Prop[]> | null = null;
  for (const line of unfold(ics)) {
    if (line === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (line === 'END:VEVENT' && ev) { expand(ev); ev = null; continue; }
    if (ev && line.includes(':')) { const [n, p] = prop(line); (ev[n] ??= []).push(p); }
  }
  function expand(e: Record<string, Prop[]>) {
    if ((e.STATUS?.[0]?.value ?? '').toUpperCase() === 'CANCELLED') return;
    if ((e.TRANSP?.[0]?.value ?? '').toUpperCase() === 'TRANSPARENT') return; // marked "free"
    const s = e.DTSTART?.[0] && toDate(e.DTSTART[0]); if (!s) return;
    const en = e.DTEND?.[0] && toDate(e.DTEND[0]);
    const len = en ? en.date.getTime() - s.date.getTime() : s.allDay ? 864e5 : 36e5;
    if (len <= 0 || len > 14 * 864e5) return;
    const ex = new Set((e.EXDATE ?? []).flatMap((p) => p.value.split(',').map((v) => toDate({ value: v, params: p.params })?.date.getTime())));
    const push = (t: number) => { if (!ex.has(t) && t + len > from.getTime() && t < to.getTime()) out.push({ start: new Date(t), end: new Date(t + len) }); };
    const rule = e.RRULE?.[0]?.value;
    if (!rule) return push(s.date.getTime());
    const r = Object.fromEntries(rule.split(';').map((kv) => kv.split('=')));
    if (r.FREQ !== 'DAILY' && r.FREQ !== 'WEEKLY') return push(s.date.getTime()); // other repeats: first occurrence only
    const interval = Math.max(1, Number(r.INTERVAL) || 1);
    const until = r.UNTIL ? toDate({ value: r.UNTIL, params: {} })?.date.getTime() ?? Infinity : Infinity;
    const count = Number(r.COUNT) || Infinity;
    const byday = r.BYDAY ? r.BYDAY.split(',').map((d: string) => DAYS.indexOf(d.slice(-2))) : null;
    const p0 = pacificParts(s.date);
    let n = 0;
    for (let days = 0; days < 800 && n < count; days++) {
      // Same Bay Area wall-clock time each day, so daylight-saving changes do not shift the hour.
      const d = s.allDay ? atPacific(p0.y, p0.m, p0.d + days, 0) : atPacific(p0.y, p0.m, p0.d + days, p0.h, p0.min);
      const t = d.getTime();
      if (t > until || t > to.getTime()) break;
      const wd = pacificParts(d).weekday;
      let hit: boolean;
      if (r.FREQ === 'DAILY') hit = days % interval === 0;
      else hit = Math.floor(days / 7) % interval === 0 && (byday ? byday.includes(wd) : days % 7 === 0);
      if (!hit) continue;
      n++; push(t);
    }
  }
  return out;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
/** Folds long lines at 75 octets as RFC 5545 requires. */
const fold = (line: string) => line.length <= 74 ? line : line.match(/.{1,73}/g)!.join('\r\n ');

export function buildFeed(name: string, events: { uid: string; start: Date; end: Date; summary: string; location?: string; description?: string; status?: 'CONFIRMED' | 'TENTATIVE' }[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NovaFides//Marketplace//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`, 'X-PUBLISHED-TTL:PT15M', 'REFRESH-INTERVAL;VALUE=DURATION:PT15M'];
  const now = stamp(new Date());
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@novafides`, `DTSTAMP:${now}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`, `SUMMARY:${esc(e.summary)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    lines.push(`STATUS:${e.status ?? 'CONFIRMED'}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
