import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { syncBusy } from '@/lib/calendar-sync';
import { getLang, getT } from '@/lib/i18n';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';
import { makeFeedLink, saveBusyLink, syncNow } from './actions';

export const metadata = { title: 'Calendar' };

export default async function CalendarPage() {
  const tr = await getT(); const lang = await getLang();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('Calendar')}</h2><p className="mu">{tr('Demo mode.')}</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/account/calendar');
  if (!me.pro) redirect('/account');
  const sb = await supabaseServer();
  let { data: priv } = await sb.from('pro_private').select('*').eq('pro_id', me.id).maybeSingle();
  // Re-import busy times when the last sync is older than 30 minutes.
  if (priv?.busy_ics_url && (!priv.busy_synced_at || Date.now() - new Date(priv.busy_synced_at).getTime() > 30 * 6e4)) {
    await syncBusy(me.id, priv.busy_ics_url);
    priv = (await sb.from('pro_private').select('*').eq('pro_id', me.id).maybeSingle()).data;
  }
  const { count } = await sb.from('pro_busy').select('id', { count: 'exact', head: true }).eq('pro_id', me.id);
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const feed = priv?.calendar_token ? `${origin}/api/cal/${priv.calendar_token}.ics` : null;
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/account">{tr('My account')}</Link> · {tr('Calendar')}</div>
      <h2>{tr('Calendar sync')}</h2>

      <div className="card formcard" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>1. {tr('NovaFides jobs in your phone calendar')}</h3>
        <p className="mu sm" style={{ margin: 0 }}>{tr('Subscribe once: new and changed jobs appear in your Google, Apple or Outlook calendar automatically (calendar apps check every 15 minutes to a few hours).')}</p>
        {feed ? <>
          <code style={{ wordBreak: 'break-all', padding: 10, border: '1px solid var(--line)', borderRadius: 10 }}>{feed}</code>
          <div className="chips"><a className="btn sm" href={feed.replace(/^https?:/, 'webcal:')}>{tr('Open in Apple Calendar')}</a>
            <a className="btn ghost sm" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed.replace(/^https?:/, 'webcal:'))}`} target="_blank" rel="noreferrer">{tr('Add to Google Calendar')}</a></div>
          <span className="mu xs">{tr('Keep this link private: anyone with it can see your job times and addresses.')}</span>
          <form action={makeFeedLink}><button className="btn ghost sm">{tr('Make a new link (the old one stops working)')}</button></form>
        </> : <form action={makeFeedLink}><button className="btn">{tr('Create my calendar link')}</button></form>}
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>2. {tr('Block busy time from your own calendar')}</h3>
        <p className="mu sm" style={{ margin: 0 }}>{tr('Paste the secret iCal address of your calendar. Times when you are busy there disappear from your free slots on NovaFides. We store only the times, not the titles.')}</p>
        <details className="grp"><summary>{tr('Where to find the secret address')}</summary>
          <p className="sm">{tr('Google Calendar (on a computer): Settings → your calendar → Integrate calendar → “Secret address in iCal format”.')}</p>
          <p className="sm">{tr('Apple iCloud: Calendar app → calendar info → Public Calendar → copy link.')}</p>
          <p className="sm">{tr('Outlook: Settings → Calendar → Shared calendars → Publish a calendar → ICS link.')}</p>
        </details>
        <form action={saveBusyLink} className="list">
          <input className="inp" name="url" defaultValue={priv?.busy_ics_url ?? ''} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
          <div className="chips"><button className="btn sm">{tr('Save and sync')}</button></div>
        </form>
        {priv?.busy_ics_url && <form action={syncNow}><button className="btn ghost sm">{tr('Sync now')}</button></form>}
        {priv?.busy_synced_at && <span className="mu sm">{tr('Last sync')}: {dateLabel(priv.busy_synced_at, lang)} {new Date(priv.busy_synced_at).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' })} · {tr('{n} busy blocks in the next 30 days', { n: count ?? 0 })}</span>}
        {priv?.busy_sync_error && <span className="err">{tr(priv.busy_sync_error)}</span>}
      </div>
    </div></section>
  );
}
