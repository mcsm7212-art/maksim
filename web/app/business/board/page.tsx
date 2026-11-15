import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { setStatus } from '@/app/account/actions';
import { getMe } from '@/lib/auth';
import { serviceById } from '@/lib/catalog';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { atPacific, pacificParts, slotLabel } from '@/lib/time';
import AutoRefresh from '@/components/AutoRefresh';
import { assign } from '../actions';

export const metadata = { title: 'Day board' };
/* eslint-disable @typescript-eslint/no-explicit-any */
const STATUS: Record<string, [string, string]> = {
  assigning: ['Needs tech', '#F0A04B'], requested: ['Waiting', '#F0A04B'], confirmed: ['Confirmed', '#8FB8FF'],
  on_the_way: ['On the way', '#E2B48C'], in_progress: ['Working', '#3CCB7F'], done: ['Done', '#7A7068'], cancelled: ['Cancelled', '#7A7068'],
};
const NEXT: Record<string, [string, string] | undefined> = { requested: ['confirmed', 'Confirm'], confirmed: ['on_the_way', 'On the way'], on_the_way: ['in_progress', 'Start'], in_progress: ['done', 'Done'] };

function dayRange(day: string | undefined) {
  const today = pacificParts(new Date());
  const m = day?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [y, mo, d] = m ? [+m[1], +m[2], +m[3]] : [today.y, today.m, today.d];
  const start = atPacific(y, mo, d, 0), end = atPacific(y, mo, d + 1, 0);
  const iso = (t: Date) => { const p = pacificParts(t); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };
  return { start, end, key: iso(start), prev: iso(atPacific(y, mo, d - 1, 12)), next: iso(atPacific(y, mo, d + 1, 12)), isToday: y === today.y && mo === today.m && d === today.d };
}

export default async function Board({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const tr = await getT(); const lang = await getLang();
  const svc = (id: string | null) => svcName(serviceById(id ?? ''), lang) || tr('Estimate visit');
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr("Day board")}</h2><p className="mu">{tr("Demo mode.")}</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/business/board');
  const co = me.companies.find((c) => c.role !== 'technician');
  if (!co) redirect('/join/company');
  const r = dayRange((await searchParams).day);
  const sb = await supabaseServer();
  const [{ data: team }, { data: day }, { data: queue }] = await Promise.all([
    sb.from('pros').select('id, display_name, slug, online_until, online_area, status').eq('company_id', co.id).eq('status', 'verified').order('display_name'),
    sb.from('bookings').select('*, client:profiles!bookings_client_id_fkey(full_name, phone)').eq('company_id', co.id)
      .gte('starts_at', r.start.toISOString()).lt('starts_at', r.end.toISOString()).neq('status', 'cancelled').order('starts_at'),
    sb.from('bookings').select('*, client:profiles!bookings_client_id_fkey(full_name)').eq('company_id', co.id).in('status', ['assigning', 'requested']).is('pro_id', null).order('created_at'),
  ]);
  const unscheduled = (queue ?? []).filter((b: any) => !b.starts_at || (new Date(b.starts_at) >= r.start && new Date(b.starts_at) < r.end));
  const cols = (team ?? []).map((t: any) => ({ t, jobs: (day ?? []).filter((b: any) => b.pro_id === t.id) }));
  const online = (t: any) => t.online_until && new Date(t.online_until) > new Date();

  const Job = ({ b }: { b: any }) => {
    const [label, color] = STATUS[b.status];
    const nx = NEXT[b.status];
    return (
      <div className="card" style={{ padding: 12, borderLeft: `4px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b className="sm">{b.starts_at ? slotLabel(b.starts_at, tr)[1] : tr('No time yet')}</b><span className="xs" style={{ color }}>{tr(label)}</span></div>
        <span className="sm">{svc(b.service_id)}</span>
        <span className="mu xs">{b.address}{b.client?.full_name ? ` · ${b.client.full_name}` : ''}{b.client?.phone ? ` · ${b.client.phone}` : ''}</span>
        {nx && b.pro_id && <form action={setStatus}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value={nx[0]} /><button className="btn ghost sm" style={{ padding: '5px 10px' }}>{tr(nx[1])}</button></form>}
      </div>
    );
  };

  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 1200 }}>
      <AutoRefresh seconds={30} />
      <div className="eyebrow"><Link href="/business">{tr("Business")}</Link> · {co.name}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: '6px 0' }}>{r.isToday ? tr('Today') : new Date(r.start).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-US' : 'en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', month: 'short', day: 'numeric' })}</h2>
        <div className="chips"><Link className="chip" href={`/business/board?day=${r.prev}`}>{tr("← Prev")}</Link>{!r.isToday && <Link className="chip" href="/business/board">{tr("Today")}</Link>}<Link className="chip" href={`/business/board?day=${r.next}`}>{tr("Next →")}</Link></div>
      </div>
      <p className="mu sm" style={{ marginTop: 0 }}>{tr((day ?? []).length === 1 ? '{n} job' : '{n} jobs', { n: (day ?? []).length })} · {tr('{a} of {b} technicians online', { a: (team ?? []).filter(online).length, b: (team ?? []).length })} · {tr('updates every 30 seconds')}</p>

      {unscheduled.length > 0 && <div className="card formcard" style={{ borderColor: '#F0A04B', marginBottom: 16 }}>
        <b>{tr('Waiting for a technician')} ({unscheduled.length})</b>
        {unscheduled.map((b: any) => (
          <form key={b.id} action={assign} className="row2" style={{ alignItems: 'end', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            <input type="hidden" name="id" value={b.id} />
            <span className="sm">{svc(b.service_id)} · {b.address}<br /><span className="mu xs">{b.client?.full_name || tr('Client')} · {tr('Preferred')}: {tr(b.day_pref === 'week' ? 'this week' : b.day_pref ?? 'any day')}</span></span>
            <span className="chips">
              <select className="inp" name="pro" required defaultValue="" style={{ width: 'auto' }}><option value="" disabled>{tr("Technician…")}</option>{(team ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.display_name}{online(t) ? ` · ${tr('online')}` : ''}</option>)}</select>
              <input className="inp" type="datetime-local" name="time" required style={{ width: 'auto' }} />
              <button className="btn sm">{tr("Assign")}</button>
            </span>
          </form>
        ))}
      </div>}

      <div className="board">
        {cols.map(({ t, jobs }) => (
          <div key={t.id} className="bcol">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <Link href={`/pro/${t.slug}`}><b>{t.display_name}</b></Link>
              <span className="xs" style={{ color: online(t) ? 'var(--ok)' : 'var(--mu2)' }}>{online(t) ? `● ${tr('online')}${t.online_area ? ` · ${t.online_area}` : ''}` : tr('offline')}</span>
            </div>
            <div className="list" style={{ gap: 8 }}>{jobs.map((b: any) => <Job key={b.id} b={b} />)}{!jobs.length && <div className="mu xs" style={{ padding: 10, border: '1px dashed var(--line)', borderRadius: 12 }}>{tr("Free all day")}</div>}</div>
          </div>
        ))}
        {!cols.length && <div className="card empty">{tr("No verified technicians yet. Invite them from the Business page.")}</div>}
      </div>
    </div></section>
  );
}
