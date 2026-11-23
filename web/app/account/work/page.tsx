import Link from 'next/link';
import { redirect } from 'next/navigation';
import ActionForm from '@/components/ActionForm';
import { saveContact, saveExtLinks, saveSchedule, setAccepting } from './actions';
import CallSettings from '@/components/CallSettings';
import { callHoursText } from '@/lib/calls';
import { getMe } from '@/lib/auth';
import { EXT_SITES } from '@/lib/ext-sites';
import { getLang, getT } from '@/lib/i18n';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';

export const metadata = { title: 'Work & chat settings' };
export const dynamic = 'force-dynamic';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 33 }, (_, i) => `${String(5 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`); // 05:00 … 21:00

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Work() {
  const me = await getMe(); if (!me) redirect('/login?next=/account/work');
  if (!me.pro) redirect('/join/pro');
  const tr = await getT(); const lang = await getLang(); const sb = await supabaseServer();
  const [{ data: pRow }, { data: rules }, { data: priv }] = await Promise.all([
    sb.from('pros').select('accepting, paused_until, slug, public_phone, call_from, call_days, call_pause, hide_paused, ext_links, ext_checked_at').eq('id', me.id).single(),
    sb.from('availability_rules').select('weekday, start_time, end_time').eq('pro_id', me.id),
    sb.from('pro_client_phone').select('phone').eq('pro_id', me.id).maybeSingle(),
  ]);
  const p: any = pRow ?? {};
  const workDays = Object.fromEntries((rules ?? []).map((r: any) => [r.weekday, { start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) }]));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const accepting = p.accepting || (p.paused_until && p.paused_until <= today);
  const rule = (d: number) => (rules ?? []).find((r: any) => r.weekday === d);
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/account">{tr('My account')}</Link></div>
      <h2>{tr('Work & chat settings')}</h2>

      <h3 id="calls" style={{ scrollMarginTop: 90 }}>{tr('Phone and calls')}</h3>
      <ActionForm action={saveContact} className="card formcard" style={{ marginBottom: 18 }} okText>
        <p className="mu sm" style={{ margin: 0 }}>{tr('Optional. If you add a number, clients see a “Call” button on your page. Without it, clients write to you or ask for a call back.')}</p>
        <CallSettings phone={p.public_phone ?? priv?.phone ?? ''} from={p.call_from === 'clients' ? 'clients' : 'all'} days={p.call_days ?? null} pause={p.call_pause !== false} hide={Boolean(p.hide_paused)} workText={callHoursText(workDays, tr)} />
        <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Save')}</button>
      </ActionForm>

      <h3 id="reviews-elsewhere">{tr('Reviews on other sites')}</h3>
      <ActionForm action={saveExtLinks} className="card formcard" style={{ marginBottom: 18 }} okText>
        <p className="mu sm" style={{ margin: 0 }}>{tr('Already have reviews on Yelp, Google or Thumbtack? Add the links: clients see buttons to your profiles there and can read your history. We show only links, never copy ratings.')}</p>
        {EXT_SITES.map((x) => <label key={x.key} className="f">{x.name}<input className="inp" name={x.key} type="url" defaultValue={p.ext_links?.[x.key] ?? ''} placeholder={x.hint} /></label>)}
        <span className="mu xs">{p.ext_checked_at ? `✓ ${tr('NovaFides checked that these profiles belong to this pro.')}` : tr('After you save, a NovaFides admin checks that the profiles are yours.')}</span>
        <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Save')}</button>
      </ActionForm>

      <h3>{tr('New jobs')}</h3>
      <div className="card bk" style={{ marginBottom: 18 }}>
        <span><b>{accepting ? `● ${tr('Taking new jobs')}` : `⏸ ${tr('Not taking new jobs')}`}</b><br />
          <span className="mu sm">{accepting ? tr('Clients can book you and see your open times.') : p.paused_until ? tr('Paused until {date}. Clients can still message you.', { date: dateLabel(p.paused_until + 'T12:00:00', lang) }) : tr('Paused. Clients can still message you, but cannot book.')}</span></span>
        {accepting
          ? <form action={setAccepting} className="chips"><input type="hidden" name="take" value="0" />
              <label className="sm mu">{tr('until (optional)')} <input className="inp" type="date" name="until" min={today} style={{ width: 'auto', padding: '6px 8px' }} /></label>
              <button className="btn ghost sm">⏸ {tr('Pause new jobs')}</button></form>
          : <form action={setAccepting}><input type="hidden" name="take" value="1" /><button className="btn sm">▶ {tr('Take jobs again')}</button></form>}
      </div>

      <h3>{tr('My schedule')}</h3>
      <ActionForm action={saveSchedule} className="card formcard" style={{ marginBottom: 18 }} okText>
        <span className="mu sm">{tr('Choose your working days and hours for each day. Clients only see open times inside them.')}</span>
        <div className="sched">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => { const r: any = rule(d); return (
            <label key={d} className="sched-row">
              <span><input type="checkbox" name={`on_${d}`} defaultChecked={Boolean(r)} /> {tr(DAYS[d])}</span>
              <select className="inp" name={`start_${d}`} defaultValue={r?.start_time?.slice(0, 5) ?? '08:00'} aria-label={tr('From')}>{HOURS.map((h) => <option key={h}>{h}</option>)}</select>
              <span className="mu">—</span>
              <select className="inp" name={`end_${d}`} defaultValue={r?.end_time?.slice(0, 5) ?? '17:00'} aria-label={tr('To')}>{HOURS.map((h) => <option key={h}>{h}</option>)}</select>
            </label>); })}
        </div>
        <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Save schedule')}</button>
      </ActionForm>

      <Link className="card desk-link" href="/friends?tab=friends" style={{ display: 'block', padding: '14px 16px', textDecoration: 'none', color: 'var(--ink)' }}>
        <b>🛠 {tr('Friends, colleagues and messages from other pros')}</b><br /><span className="mu sm">{tr('Moved to your pro network: friends, who can write to you, pros you need, stores and tools.')} →</span>
      </Link>
    </div></section>
  );
}
