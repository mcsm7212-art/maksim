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
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>Business</h2><p className="mu">Demo mode: the business office turns on when the database is connected.</p></div></section>;
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
      <div className="eyebrow">Business office</div><h2 style={{ marginBottom: 4 }}>{co.name}</h2>
      <p className="mu sm" style={{ marginTop: 0 }}>{co.status === 'verified' ? <>Public page: <Link href={`/company/${co.slug}`}>/company/{co.slug}</Link></> : 'Waiting for license verification. Your page goes public after the check.'} · <Link href="/business/profile">Edit company page</Link></p>
      <Link href="/business/board" className="btn" style={{ marginBottom: 18 }}>Open day board</Link>
      {sp.error && <div className="err" role="alert">{sp.error}</div>}

      <h3>Open jobs</h3>
      <div className="list">
        {(bookings ?? []).map((b: any) => (
          <div key={b.id} className="card formcard">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span><span className="status">{STATUS[b.status]}</span>
                <h3 style={{ margin: '4px 0' }}>{serviceById(b.service_id)?.name ?? 'Estimate visit'} · {TIERS[b.tier as Tier].name}</h3>
                <span className="mu sm">{b.starts_at ? slotLabel(b.starts_at).join(' · ') : `Preferred: ${b.day_pref ?? 'any'}`} · {b.address} · {b.client?.full_name || 'Client'}{b.client?.phone ? ` · ${b.client.phone}` : ''}</span>
                {b.notes && <span className="mu xs" style={{ display: 'block' }}>“{b.notes}”</span>}</span>
              <span className="sm">{b.pro ? <>Tech: <b>{b.pro.display_name}</b><br /><span className="mu xs">{b.chosen_by === 'client' ? 'Chosen by client: changes need their OK' : 'Assigned by office'}</span></> : <span className="badge p">Unassigned</span>}</span>
            </div>
            {b.proposed && <div className="note">Waiting for the client to approve {b.proposed.display_name}.</div>}
            <form action={assign} className="row2" style={{ alignItems: 'end' }}>
              <input type="hidden" name="id" value={b.id} />
              <label className="f">{b.pro ? (b.chosen_by === 'client' ? 'Propose another technician' : 'Change technician') : 'Assign technician'}
                <select className="inp" name="pro" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {techs.filter((t) => t.id !== b.pro?.id).map((t) => <option key={t.id} value={t.id}>{t.display_name}{t.online_until && new Date(t.online_until) > new Date() ? ' · online' : ''}</option>)}
                </select></label>
              {!b.starts_at && <label className="f">Arrival time<input className="inp" type="datetime-local" name="time" /></label>}
              <button className="btn">{b.pro && b.chosen_by === 'client' ? 'Send proposal' : 'Save'}</button>
            </form>
            {b.status === 'requested' && b.pro && <form action={setStatus}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value="confirmed" /><button className="btn ghost sm">Confirm for the technician</button></form>}
          </div>
        ))}
        {!(bookings ?? []).length && <div className="card empty">No open jobs.</div>}
      </div>

      <h3 style={{ marginTop: 30 }}>Team</h3>
      <div className="list">
        {(team ?? []).map((t) => <div key={t.id} className="card bk"><span><b>{t.display_name}</b> <span className="mu sm">· {t.status === 'verified' ? 'verified' : 'waiting for verification'}</span></span><Link className="btn ghost sm" href={`/pro/${t.slug}`}>Profile</Link></div>)}
        {(invites ?? []).map((i) => <div key={i.code} className="card bk"><span className="sm">Invite link ({i.role}):<br /><code style={{ wordBreak: 'break-all' }}>{origin}/invite/{i.code}</code></span><span className="mu xs">Send by text or email</span></div>)}
        <form action={inviteTechnician} className="chips">
          <input type="hidden" name="company" value={co.id} />
          <button className="btn sm">New technician invite</button>
          <button className="btn ghost sm" formAction={inviteManager}>New manager invite</button>
        </form>
      </div>
    </div></section>
  );
}
