import { getLang, getT } from '@/lib/i18n';
import { svcName } from '@/lib/i18n-core';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { serviceById } from '@/lib/catalog';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { slotLabel } from '@/lib/time';
import { setStatus } from '../account/actions';
import AutoRefresh from '@/components/AutoRefresh';
import { addTechnician, assign, inviteManager, inviteTechnician } from './actions';
import InviteShare from '@/components/InviteShare';
import { TRADES, type Trade } from '@/lib/catalog';

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
    sb.from('company_invites').select('code, role, expires_at, prefill').eq('company_id', co.id).is('used_by', null).gt('expires_at', new Date().toISOString()),
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
                <h3 style={{ margin: '4px 0' }}>{svcName(serviceById(b.service_id ?? ''), lang) || tr('Estimate visit')}</h3>
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
        {(invites ?? []).map((i: any) => (
          <div key={i.code} className="card formcard">
            <span className="sm"><b>{i.prefill?.name || tr(i.role === 'manager' ? 'Invite link (manager):' : 'Invite link (technician):')}</b>
              {i.prefill?.trade && <span className="mu"> · {tr(TRADES[i.prefill.trade as Trade]?.name ?? '')}{i.prefill.area ? ` · ${i.prefill.area}` : ''}</span>}
              <span className="mu xs"> · {tr('waiting to join')}</span><br /><code style={{ wordBreak: 'break-all' }} className="xs">{origin}/invite/{i.code}</code></span>
            <InviteShare url={`${origin}/invite/${i.code}`} company={co.name} who={i.prefill?.name?.split(' ')[0]} />
          </div>))}
        <details className="card formcard">
          <summary style={{ cursor: 'pointer' }}><b>+ {tr('Add a technician')}</b> <span className="mu xs">{tr('fill in the basics, the technician finishes the profile')}</span></summary>
          <form action={addTechnician} className="list" style={{ marginTop: 10 }}>
            <input type="hidden" name="company" value={co.id} />
            <div className="row2">
              <label className="f">{tr('Name clients see')}<input className="inp" name="name" required minLength={3} maxLength={60} placeholder="Mike Reyes" /></label>
              <label className="f">{tr('Trade')}<select className="inp" name="trade" defaultValue="plumbing">{(Object.keys(TRADES) as Trade[]).map((t) => <option key={t} value={t}>{tr(TRADES[t].name)}</option>)}</select></label>
            </div>
            <div className="row2">
              <label className="f">{tr('Area you serve')}<input className="inp" name="area" maxLength={60} placeholder="Redwood City" /></label>
              <label className="f">{tr('Years of experience')}<input className="inp" name="years" type="number" min={0} max={60} /></label>
            </div>
            <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Create the invite link')}</button>
            <span className="mu xs">{tr('Then send the link by SMS or email. The technician signs in with their own email, adds a real photo and their services, and joins your team. Reviews and job counts always belong to the technician.')}</span>
          </form>
        </details>
        <form action={inviteTechnician} className="chips">
          <input type="hidden" name="company" value={co.id} />
          <button className="btn ghost sm">{tr("New technician invite")}</button>
          <button className="btn ghost sm" formAction={inviteManager}>{tr("New manager invite")}</button>
        </form>
      </div>
    </div></section>
  );
}
