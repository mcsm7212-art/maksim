import 'server-only';
import { busyRanges } from './ics';
import { supabaseServer } from './supabase/server';

// Calendar hosts we accept for importing busy times (the secret iCal addresses of Google, Apple and Outlook calendars).
const HOSTS = [/^calendar\.google\.com$/, /^p\d+-caldav\.icloud\.com$/, /^p\d+-calendarws\.icloud\.com$/, /^outlook\.office365\.com$/, /^outlook\.live\.com$/];
export function normalizeIcsUrl(raw: string): string | null {
  // Browser tests only: lets a local fake calendar through. Never set this in production.
  const testPrefix = process.env.NOVAFIDES_TEST_ICS_PREFIX;
  if (testPrefix && raw.startsWith(testPrefix)) return raw;
  let u: URL;
  try { u = new URL(raw.trim().replace(/^webcals?:\/\//i, 'https://')); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
  return HOSTS.some((h) => h.test(u.hostname)) ? u.toString() : null;
}

async function fetchIcs(url: string): Promise<string> {
  let target = url;
  for (let hop = 0; hop < 3; hop++) {
    const res = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { accept: 'text/calendar' }, cache: 'no-store' });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location'); const ok = next && normalizeIcsUrl(new URL(next, target).toString());
      if (!ok) throw new Error('calendar link redirects somewhere unexpected');
      target = ok; continue;
    }
    if (!res.ok) throw new Error(`calendar returned ${res.status}`);
    const text = await res.text();
    if (text.length > 3_000_000) throw new Error('calendar file is too large');
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('this link is not a calendar (iCal) address');
    return text;
  }
  throw new Error('too many redirects');
}

/** Re-imports busy ranges for the next 30 days from the pro's own calendar. Returns the number of busy blocks. */
export async function syncBusy(proId: string, url: string): Promise<number> {
  const sb = await supabaseServer();
  try {
    const now = new Date(); const to = new Date(now.getTime() + 30 * 864e5);
    const ranges = busyRanges(await fetchIcs(url), now, to).slice(0, 500);
    await sb.from('pro_busy').delete().eq('pro_id', proId);
    if (ranges.length) await sb.from('pro_busy').insert(ranges.map((r) => ({ pro_id: proId, starts_at: r.start.toISOString(), ends_at: r.end.toISOString() })));
    await sb.from('pro_private').update({ busy_synced_at: now.toISOString(), busy_sync_error: null }).eq('pro_id', proId);
    return ranges.length;
  } catch (e) {
    await sb.from('pro_private').update({ busy_synced_at: new Date().toISOString(), busy_sync_error: (e as Error).message.slice(0, 200) }).eq('pro_id', proId);
    return -1;
  }
}
