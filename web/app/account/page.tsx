import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { serviceById, TIERS, usd, type Tier } from '@/lib/catalog';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel, slotLabel } from '@/lib/time';
import PhotoPicker from '@/components/PhotoPicker';
import { CITIES } from '@/lib/areas';
import { rateClient } from './reviews/actions';
import { addPhotos, answerSwap, deletePhoto, markRead, setOnline, setStatus, submitReview } from './actions';

export const metadata = { title: 'My account' };
/* eslint-disable @typescript-eslint/no-explicit-any */
const STATUS: Record<string, string> = { assigning: 'Office is assigning a technician', requested: 'Waiting for the pro to confirm', confirmed: 'Confirmed', on_the_way: 'Pro is on the way', in_progress: 'Work in progress', done: 'Done', cancelled: 'Cancelled' };
const SKILLS = [['punctuality', 'Punctuality'], ['workmanship', 'Workmanship'], ['cleanliness', 'Cleanliness'], ['communication', 'Communication'], ['pricing', 'Pricing transparency']];
const when = (b: any) => b.starts_at ? slotLabel(b.starts_at).join(' · ') : b.day_pref ? `Preferred: ${b.day_pref === 'week' ? 'this week' : b.day_pref}` : 'Time to be agreed';
const PRO_FIELDS = 'id, slug, display_name, accent, photo_url';

export default async function Account({ searchParams }: { searchParams: Promise<{ booked?: string; joined?: string }> }) {
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>My account</h2><p className="mu">Demo mode: accounts turn on when the database is connected.</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/account');
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data: notes }, { data: mine }, { data: jobs }, { data: reviewed }, { data: proRow }] = await Promise.all([
    sb.from('notifications').select('*').eq('user_id', me.id).order('created_at', { ascending: false }).limit(8),
    sb.from('bookings').select(`*, pro:pros!bookings_pro_id_fkey(${PRO_FIELDS}), proposed:pros!bookings_swap_proposed_pro_fkey(${PRO_FIELDS}), company:companies(slug, name)`).eq('client_id', me.id).order('created_at', { ascending: false }).limit(30),
    me.pro ? sb.from('bookings').select('*, client:profiles!bookings_client_id_fkey(full_name, phone)').eq('pro_id', me.id).neq('status', 'cancelled').order('starts_at', { ascending: true }).limit(30) : Promise.resolve({ data: [] as any[] }),
    sb.from('reviews').select('booking_id').eq('client_id', me.id),
    me.pro ? sb.from('pros').select('online_until, online_area, area, status, license_status').eq('id', me.id).maybeSingle() : Promise.resolve({ data: null as any }),
  ]);
  // Photos: my portfolio (if pro) and before/after photos on my jobs and my bookings
  const bookingIds = [...(mine ?? []), ...(jobs ?? [])].map((b: any) => b.id);
  const [{ data: portfolio }, { data: jobPhotos }] = await Promise.all([
    me.pro ? sb.from('pro_photos').select('id, url, caption').eq('pro_id', me.id).eq('kind', 'portfolio').order('created_at', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    bookingIds.length ? sb.from('pro_photos').select('id, url, kind, booking_id').in('booking_id', bookingIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const { data: myRatings } = me.pro ? await sb.from('client_ratings').select('booking_id').eq('pro_id', me.id) : { data: [] as any[] };
  const rated = new Set((myRatings ?? []).map((r: any) => r.booking_id));
  const photosOf = (id: string) => (jobPhotos ?? []).filter((p: any) => p.booking_id === id);
  const done = new Set((reviewed ?? []).map((r) => r.booking_id));
  const unread = (notes ?? []).filter((n) => !n.read_at).length;
  const online = proRow?.online_until && new Date(proRow.online_until) > new Date();

  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div><div className="eyebrow">{me.role === 'client' ? 'Client' : me.role}</div><h2 style={{ margin: '6px 0' }}>{me.name || me.email}</h2></div>
        <form action="/auth/signout" method="post"><button className="btn ghost sm">Sign out</button></form>
      </div>
      {sp.booked && <div className="note" style={{ marginBottom: 14 }}>Request sent. You will get a notification when it is confirmed.</div>}
      {sp.joined && <div className="note" style={{ marginBottom: 14 }}>Profile created. We will check your license and ID, then your profile goes public.</div>}

      {(notes ?? []).length > 0 && <div className="card formcard" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>Notifications {unread > 0 && <span className="badge cu">{unread} new</span>}</b>
          {unread > 0 && <form action={markRead}><button className="btn ghost sm">Mark read</button></form>}</div>
        {(notes ?? []).map((n) => <div key={n.id} className={n.read_at ? 'mu sm' : 'sm'}>{n.body} <span className="mu2 xs">· {dateLabel(n.created_at)}</span></div>)}
      </div>}

      {me.pro && <>
        <h3>My pro profile</h3>
        <div className="card bk" style={{ marginBottom: 12 }}>
          <span><b>Status: {me.pro.status === 'verified' ? 'Public' : 'Waiting for verification'}</b><br />
            <span className="mu sm">License check: {proRow?.license_status ?? "none"} · <Link href={`/pro/${me.pro.slug}`}>View my page</Link> · <Link href="/account/profile">Edit profile</Link> · <Link href="/account/reviews">My reviews</Link></span></span>
          {online
            ? <form action={setOnline}><input type="hidden" name="hours" value={0} /><button className="btn ghost sm">● Online{proRow?.online_area ? ` in ${proRow.online_area}` : ''} · go offline</button></form>
            : <form action={setOnline} className="chips"><select className="inp" name="area" defaultValue={proRow?.online_area ?? proRow?.area ?? ''} aria-label="City you are in now" style={{ width: 'auto', padding: '7px 10px' }}>
                {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
                <input type="hidden" name="hours" value={4} /><button className="btn sm">Go online for 4 h</button></form>}
        </div>
        <h3>My work photos <span className="mu sm">({(portfolio ?? []).length})</span></h3>
        <div className="card formcard" style={{ marginBottom: 18 }}>
          {(portfolio ?? []).length > 0 && <div className="works" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))' }}>
            {(portfolio ?? []).map((p: any) => (
              <form key={p.id} action={deletePhoto} className="work"><input type="hidden" name="id" value={p.id} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" style={{ aspectRatio: '1', objectFit: 'cover', display: 'block', width: '100%' }} /><button className="btn ghost sm" style={{ width: '100%', borderRadius: 0 }}>Delete</button></form>
            ))}</div>}
          <form action={addPhotos} className="list"><PhotoPicker name="work_url" prefix="work" max={24} label="Add work photos" /><button className="btn sm" style={{ alignSelf: 'flex-start' }}>Save photos</button></form>
        </div>
        <h3>My jobs</h3>
        <div className="list" style={{ marginBottom: 26 }}>
          {(jobs ?? []).map((b: any) => (
            <div key={b.id} className="card bk">
              <span><span className="status">{STATUS[b.status]}</span><h3>{serviceById(b.service_id)?.name ?? 'Estimate visit'} · {TIERS[b.tier as Tier].name}</h3>
                <span className="mu sm">{when(b)} · {b.address}{b.client?.full_name ? ` · ${b.client.full_name}` : ''}</span>
                {b.notes && <span className="mu xs" style={{ display: 'block' }}>“{b.notes}”</span>}</span>
              <span className="chips">
                {b.status === 'requested' && <StatusBtn id={b.id} s="confirmed" l="Confirm" />}
                {b.status === 'confirmed' && <StatusBtn id={b.id} s="on_the_way" l="On my way" />}
                {['confirmed', 'on_the_way'].includes(b.status) && <StatusBtn id={b.id} s="in_progress" l="Start" />}
                {b.status === 'in_progress' && <StatusBtn id={b.id} s="done" l="Done" />}
              </span>
              {b.status === 'done' && !rated.has(b.id) && <form action={rateClient} className="list" style={{ gridColumn: '1/-1', gap: 8 }}>
                <input type="hidden" name="booking" value={b.id} /><input type="hidden" name="client" value={b.client_id} />
                <b className="sm">Rate this client (private, only pros see it)</b>
                <div className="row2">{[['agreements', 'Kept agreements'], ['access', 'Access to the job'], ['payment', 'Paid on time']].map(([k, l]) => <label key={k} className="f">{l}<select className="inp" name={k} defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>)}</div>
                <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>Save rating</button>
                <span className="mu xs">The client&apos;s review of you is published once you both have rated.</span>
              </form>}
              {['confirmed', 'on_the_way', 'in_progress', 'done'].includes(b.status) && <div style={{ gridColumn: '1/-1' }} className="list">
                <JobPhotos photos={photosOf(b.id)} />
                <form action={addPhotos} className="list">
                  <input type="hidden" name="booking" value={b.id} /><input type="hidden" name="kind" value={b.status === 'done' || b.status === 'in_progress' ? 'after' : 'before'} />
                  <PhotoPicker name="work_url" prefix="job" max={8} label={b.status === 'done' || b.status === 'in_progress' ? 'Add AFTER photos' : 'Add BEFORE photos'} />
                  <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>Save job photos</button>
                </form>
              </div>}
            </div>
          ))}
          {!(jobs ?? []).length && <div className="card empty">No jobs yet.</div>}
        </div>
      </>}

      {me.companies.some((c) => c.role !== 'technician') && <div className="note" style={{ marginBottom: 18 }}>Manage your company jobs and team on the <Link href="/business">Business page</Link>.</div>}

      <h3>My bookings</h3>
      <div className="list">
        {(mine ?? []).map((b: any) => (
          <div key={b.id} className="card formcard">
            <div><span className="status">{STATUS[b.status]}</span>
              <h3 style={{ margin: '4px 0' }}>{serviceById(b.service_id)?.name ?? 'Estimate visit'} · {TIERS[b.tier as Tier].name}{b.price_estimate ? ` · ~${usd(b.price_estimate)}` : ''}</h3>
              <span className="mu sm">{when(b)}{b.company ? ` · ${b.company.name}` : ''}</span></div>
            {b.pro ? <div className="sm">Your pro: <Link href={`/pro/${b.pro.slug}`}><b>{b.pro.display_name}</b></Link>{b.chosen_by === 'office' && <span className="mu xs"> · assigned by the office</span>}</div>
              : <div className="mu sm">The office will assign a technician. You will see who is coming here.</div>}
            {photosOf(b.id).length > 0 && <JobPhotos photos={photosOf(b.id)} />}
            {b.proposed && <div className="note">
              {b.company?.name} asks to change your technician to <Link href={`/pro/${b.proposed.slug}`}><b>{b.proposed.display_name}</b></Link>.
              <div className="chips" style={{ marginTop: 8 }}>
                <form action={answerSwap}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="accept" value="1" /><button className="btn sm">Accept</button></form>
                <form action={answerSwap}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="accept" value="0" /><button className="btn ghost sm">Keep my pro</button></form>
              </div></div>}
            {['requested', 'assigning', 'confirmed'].includes(b.status) && <form action={setStatus}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value="cancelled" /><button className="btn ghost sm">Cancel</button></form>}
            {b.status === 'done' && b.pro && !done.has(b.id) && (
              <form action={submitReview} className="list">
                <input type="hidden" name="id" value={b.id} />
                <b>Rate {b.pro.display_name}</b>
                {SKILLS.map(([k, l]) => <label key={k} className="f">{l}<select className="inp" name={k} defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} {n}</option>)}</select></label>)}
                <label className="f">What went well or wrong?<textarea className="inp" name="body" maxLength={2000} /></label>
                <label className="f">Would you hire again? (private)<select className="inp" name="again"><option value="1">Yes</option><option value="0">No</option></select></label>
                <button className="btn">Post review</button>
                <span className="mu xs">Your review is published when the pro rates the visit too, or after 14 days. Honest reviews are never removed.</span>
              </form>
            )}
          </div>
        ))}
        {!(mine ?? []).length && <div className="card empty">No bookings yet. <Link href="/search">Find a pro</Link></div>}
      </div>
    </div></section>
  );
}

function StatusBtn({ id, s, l }: { id: string; s: string; l: string }) {
  return <form action={setStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} /><button className="btn sm">{l}</button></form>;
}

/* eslint-disable @next/next/no-img-element */
function JobPhotos({ photos }: { photos: { id: string; url: string; kind: string }[] }) {
  if (!photos.length) return null;
  return (
    <div className="list" style={{ gap: 6 }}>
      {(['before', 'after'] as const).map((k) => {
        const list = photos.filter((p) => p.kind === k); if (!list.length) return null;
        return <div key={k}><span className="status">{k}</span>
          <div className="works" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', marginTop: 6 }}>
            {list.map((p) => <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="work"><img src={p.url} alt={`${k} photo`} style={{ aspectRatio: '1', objectFit: 'cover' }} /></a>)}
          </div></div>;
      })}
    </div>
  );
}
