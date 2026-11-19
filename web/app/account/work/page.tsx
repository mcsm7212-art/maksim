import Link from 'next/link';
import { redirect } from 'next/navigation';
import ActionForm from '@/components/ActionForm';
import Figure from '@/components/Figure';
import { saveSchedule, setAccepting, setColleagueChat, toggleColleague } from './actions';
import { getMe } from '@/lib/auth';
import { TRADES, type Trade } from '@/lib/catalog';
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
  const [{ data: pRow }, { data: rules }, { data: contacts }] = await Promise.all([
    sb.from('pros').select('accepting, paused_until, colleague_chat, slug').eq('id', me.id).single(),
    sb.from('availability_rules').select('weekday, start_time, end_time').eq('pro_id', me.id),
    sb.from('pro_contacts').select('colleague:pros!pro_contacts_colleague_id_fkey(id, slug, display_name, trade, photo_url, accent)').eq('pro_id', me.id).order('created_at'),
  ]);
  const p: any = pRow ?? {};
  const mutual = new Set(((await sb.rpc('added_me')).data ?? []) as string[]);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const accepting = p.accepting || (p.paused_until && p.paused_until <= today);
  const rule = (d: number) => (rules ?? []).find((r: any) => r.weekday === d);
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/account">{tr('My account')}</Link></div>
      <h2>{tr('Work & chat settings')}</h2>

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

      <h3>{tr('Messages from other pros')}</h3>
      <form action={setColleagueChat} className="card formcard" style={{ marginBottom: 12 }}>
        {([['all', 'Any verified pro can message me'], ['contacts', 'Only colleagues from my list'], ['off', 'Nobody: colleague chat is off']] as const).map(([v, label]) => (
          <label key={v} className="sm" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="radio" name="mode" value={v} defaultChecked={p.colleague_chat === v} /> {tr(label)}</label>))}
        <span className="mu xs">{tr('Clients can always message you. Turning this off also stops replies in old chats with colleagues.')}</span>
        <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Save')}</button>
      </form>

      <h3>{tr('My colleagues')} <span className="mu sm">({(contacts ?? []).length})</span></h3>
      <div className="list">
        {(contacts ?? []).filter((c: any) => c.colleague).map((c: any) => (
          <div key={c.colleague.id} className="card coll" style={{ ['--acc' as string]: c.colleague.accent ?? '#B57A50' }}>
            <span className="post-ava"><Figure name={c.colleague.display_name} accent={c.colleague.accent ?? '#B57A50'} photo={c.colleague.photo_url} /></span>
            <span style={{ minWidth: 0 }}><Link href={`/${c.colleague.slug}`}><b>{c.colleague.display_name}</b></Link>{mutual.has(c.colleague.id) && <span className="badge ok" style={{ marginLeft: 6 }}>⇄ {tr('Mutual')}</span>}<br /><span className="mu xs">{tr(TRADES[c.colleague.trade as Trade]?.name ?? '')}</span></span>
            <form action={toggleColleague} style={{ marginLeft: 'auto' }}><input type="hidden" name="id" value={c.colleague.id} /><input type="hidden" name="on" value="0" /><button className="btn ghost sm">{tr('Remove')}</button></form>
          </div>))}
        {!(contacts ?? []).length && <div className="card empty">{tr('Open a colleague’s page and press “+ Add to my colleagues”. You can also find colleagues in the')} <Link href="/lounge">{tr('Pro Lounge')}</Link>.</div>}
      </div>
    </div></section>
  );
}
