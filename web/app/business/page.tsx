import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { serviceById, TIERS, type Tier } from '@/lib/catalog';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { slotLabel } from '@/lib/time';
import { setStatus } from '../account/actions';
import AutoRefresh from '@/components/AutoRefresh';
import { assign, inviteManager, inviteTechnician } from './actions';

export const metadata = { title: 'Business' };
/* eslint-disable @typescript-eslint/no-explicit-any */
const STATUS: Record<string, string> = { assigning: 'Needs a technician', requested: 'Waiting for technician', confirmed: 'Confirmed', on_the_way: 'On the way', in_progress: 'In progress', done: 'Done', cancelled: 'Cancelled' };

export default async function Business({ searchParams }: { searchParams: Promise<{ error?: string; joined?: string }> }) {
  const tr = await getT(); const lang = await getLang();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr("Business")}</h2><p className="mu">{tr("Demo mode: the business office turns on when the database is connected.")}</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/business');
  const co = me.companies.find((c) => c.role !== 'technician');
  if (!co) redirect('/join/company');
  const sp = await searchParams;
  const sb = await supabaseServer();
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const [{ data: bookings }, { data: team }, { data: invites }] = await Promise.all([
    sb.from('bookings').select('*, pro:pros!bookings_pro_id_fkey(id, display_name, slug), proposed:pros!bookings_swap_proposed_pro_fkey(display_name), client:profiles!bookings_client_id_fkey(full_name, phone)')
      .eq('company_id', co.id).not('status', 'in', '(done,cancelled)').order('created_at', { ascending: false }).limit(50),
    sb.from('pros').select('id, display_name, slug, status, online_until').eq('company_id', co.id),
    sb.from('company_invites').select('code, role, expires_at').eq('company_id', co.id).is('used_by', null).gt('expires_at', new Date().toISOString()),
  ]);
  const techs = (team ?? []).filter((t) => t.status === 'verified');

  return (
    <section className="sec pad"><div className="in">
      <AutoRefresh seconds={30} />
      <div className="eyebrow">{tr("Business office")}</div><h2 style={{ marginBottom: 4 }}>{co.name}</h2>
      <p className="mu sm" style={{ marginTop: 0 }}>{co.status === 'verified' ? <>{tr('Public page:')} <Link href={`/company/${co.slug}`}>/company/{co.slug}</Link></> : tr('Waiting for license verification. Your page goes public after the check.')} · <Link href="/business/profile">{tr("Edit company page")}</Link></p>
      <Link href="/business/board" className="btn" style={{ marginBottom: 18 }}>{tr("Open day board")}</Link>
      {sp.error && <div className="err" role="alert">{sp.error}</div>}

      <h3>{tr("Open jobs")}</h3>
      <div className="list">
        {(bookings ?? []).map((b: any) => (
          <div key={b.id} className="card formcard">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span><span className="status">{tr(STATUS[b.status])}</span>
                <h3 style={{ margin: '4px 0' }}>{svcName(serviceById(b.service_id ?? ''), lang) || tr('Estimate visit')} · {tr(TIERS[b.tier as Tier].name)}</h3>
                <span className="mu sm">{b.starts_at ? slotLabel(b.starts_at, tr).join(' · ') : `${tr('Preferred')}: ${tr(b.day_pref === 'week' ? 'this week' : b.day_pref ?? 'any day')}`} · {b.address} · {b.client?.full_name || tr('Client')}{b.client?.phone ? ` · ${b.client.phone}` : ''}</span>
                {b.notes && <span className="mu xs" style={{ display: 'block' }}>“{b.notes}”</span>}</span>
              <span className="sm">{b.pro ? <>{tr('Tech:')} <b>{b.pro.display_name}</b><br /><span className="mu xs">{tr(b.chosen_by === 'client' ? 'Chosen by client: changes need their OK' : 'Assigned by office')}</span></> : <span className="badge p">{tr("Unassigned")}</span>}</span>
            </div>
            {b.proposed && <div className="note">{tr('Waiting for the client to approve {name}.', { name: b.proposed.display_name })}</div>}
            <form action={assign} className="row2" style={{ alignItems: 'end' }}>
              <input type="hidden" name="id" value={b.id} />
              <label className="f">{tr(b.pro ? (b.chosen_by === 'client' ? 'Propose another technician' : 'Change technician') : 'Assign technician')}
                <select className="inp" name="pro" required defaultValue="">
                  <option value="" disabled>{tr("Choose…")}</option>
                  {techs.filter((t) => t.id !== b.pro?.id).map((t) => <option key={t.id} value={t.id}>{t.display_name}{t.online_until && new Date(t.online_until) > new Date() ? ` · ${tr('online')}` : ''}</option>)}
                </select></label>
              {!b.starts_at && <label className="f">{tr("Arrival time")}<input className="inp" type="datetime-local" name="time" /></label>}
              <button className="btn">{tr(b.pro && b.chosen_by === 'client' ? 'Send proposal' : 'Save')}</button>
            </form>
            {b.status === 'requested' && b.pro && <form action={setStatus}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value="confirmed" /><button className="btn ghost sm">{tr("Confirm for the technician")}</button></form>}
          </div>
        ))}
        {!(bookings ?? []).length && <div className="card empty">{tr("No open jobs.")}</div>}
      </div>

      <h3 style={{ marginTop: 30 }}>{tr("Team")}</h3>
      <div className="list">
        {(team ?? []).map((t) => <div key={t.id} className="card bk"><span><b>{t.display_name}</b> <span className="mu sm">· {tr(t.status === 'verified' ? 'verified pro' : 'waiting for verification')}</span></span><Link className="btn ghost sm" href={`/pro/${t.slug}`}>{tr("Profile")}</Link></div>)}
        {(invites ?? []).map((i) => <div key={i.code} className="card bk"><span className="sm">{tr(i.role === 'manager' ? 'Invite link (manager):' : 'Invite link (technician):')}<br /><code style={{ wordBreak: 'break-all' }}>{origin}/invite/{i.code}</code></span><span className="mu xs">{tr("Send by text or email")}</span></div>)}
        <form action={inviteTechnician} className="chips">
          <input type="hidden" name="company" value={co.id} />
          <button className="btn sm">{tr("New technician invite")}</button>
          <button className="btn ghost sm" formAction={inviteManager}>{tr("New manager invite")}</button>
        </form>
      </div>
    </div></section>
  );
}
