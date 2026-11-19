import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { SERVICES, serviceById, TIERS, usd, type Tier } from '@/lib/catalog';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel, slotLabel } from '@/lib/time';
import PhotoPicker from '@/components/PhotoPicker';
import { CITIES } from '@/lib/areas';
import { noteText } from '@/lib/notes';
import { getLang } from '@/lib/i18n';
import { makeT, svcName, type T } from '@/lib/i18n-core';
import { rateClient } from './reviews/actions';
import { addPhotos, answerSwap, deletePhoto, hideJobPhotos, markRead, publishJobPhotos, setOnline, setStatus, setUrgent, submitReview } from './actions';

export const metadata = { title: 'My account' };
/* eslint-disable @typescript-eslint/no-explicit-any */
const STATUS: Record<string, string> = { assigning: 'Office is assigning a technician', requested: 'Waiting for the pro to confirm', confirmed: 'Confirmed', on_the_way: 'Pro is on the way', in_progress: 'Work in progress', done: 'Done', cancelled: 'Cancelled' };
const SKILLS = [['punctuality', 'Punctuality'], ['workmanship', 'Workmanship'], ['cleanliness', 'Cleanliness'], ['communication', 'Communication'], ['pricing', 'Pricing transparency']];
const when = (b: any, tr: T) => b.starts_at ? slotLabel(b.starts_at, tr).join(' · ') : b.day_pref ? `${tr('Preferred')}: ${tr(b.day_pref === 'week' ? 'this week' : b.day_pref === 'today' ? 'today' : 'tomorrow')}` : tr('Time to be agreed');
const PRO_FIELDS = 'id, slug, display_name, accent, photo_url';

export default async function Account({ searchParams }: { searchParams: Promise<{ booked?: string; joined?: string }> }) {
  const lang = await getLang(); const tr = makeT(lang);
  const svc = (id: string | null) => svcName(serviceById(id ?? ''), lang) || tr('Estimate visit');
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('My account')}</h2><p className="mu">{tr('Demo mode: accounts turn on when the database is connected.')}</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/account');
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data: notes }, { data: mine }, { data: jobs }, { data: reviewed }, { data: proRow }] = await Promise.all([
    sb.from('notifications').select('*').eq('user_id', me.id).order('created_at', { ascending: false }).limit(8),
    sb.from('bookings').select(`*, pro:pros!bookings_pro_id_fkey(${PRO_FIELDS}), proposed:pros!bookings_swap_proposed_pro_fkey(${PRO_FIELDS}), company:companies(slug, name)`).eq('client_id', me.id).order('created_at', { ascending: false }).limit(30),
    me.pro ? sb.from('bookings').select('*, client:profiles!bookings_client_id_fkey(full_name, phone)').eq('pro_id', me.id).neq('status', 'cancelled').order('starts_at', { ascending: true }).limit(30) : Promise.resolve({ data: [] as any[] }),
    sb.from('reviews').select('booking_id').eq('client_id', me.id),
    me.pro ? sb.from('pros').select('online_until, online_area, area, status, license_status, urgent_ok, urgent_fee, trade').eq('id', me.id).maybeSingle() : Promise.resolve({ data: null as any }),
  ]);
  // Photos: my portfolio (if pro) and before/after photos on my jobs and my bookings
  const bookingIds = [...(mine ?? []), ...(jobs ?? [])].map((b: any) => b.id);
  const [{ data: portfolio }, { data: jobPhotos }] = await Promise.all([
    me.pro ? sb.from('pro_photos').select('id, url, caption').eq('pro_id', me.id).eq('kind', 'portfolio').order('created_at', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    bookingIds.length ? sb.from('pro_photos').select('id, url, kind, booking_id, public, client_hidden').in('booking_id', bookingIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const { data: myRatings } = me.pro ? await sb.from('client_ratings').select('booking_id').eq('pro_id', me.id) : { data: [] as any[] };
  const rated = new Set((myRatings ?? []).map((r: any) => r.booking_id));
  const { data: invs } = bookingIds.length ? await sb.from('invoices').select('id, number, status, total, booking_id').in('booking_id', bookingIds).neq('status', 'void') : { data: [] as any[] };
  const invOf = (id: string) => (invs ?? []).find((x: any) => x.booking_id === id);
  const photosOf = (id: string) => (jobPhotos ?? []).filter((p: any) => p.booking_id === id);
  const done = new Set((reviewed ?? []).map((r) => r.booking_id));
  const unread = (notes ?? []).filter((n) => !n.read_at).length;
  const online = proRow?.online_until && new Date(proRow.online_until) > new Date();

  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div><div className="eyebrow">{tr(me.role === 'client' ? 'Client' : me.role === 'pro' ? 'Pro' : me.role === 'company' ? 'Company' : 'Admin')}</div><h2 style={{ margin: '6px 0' }}>{me.name || me.email}</h2></div>
        <form action="/auth/signout" method="post"><button className="btn ghost sm">{tr('Sign out')}</button></form>
      </div>
      {sp.booked && <div className="note" style={{ marginBottom: 14 }}>{tr('Request sent. You will get a notification when it is confirmed.')}</div>}
      {sp.joined && <div className="note" style={{ marginBottom: 14 }}>{tr('Profile created. We will check your license and ID, then your profile goes public.')}</div>}

      {(notes ?? []).length > 0 && <div className="card formcard" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{tr('Notifications')} {unread > 0 && <span className="badge cu">{tr('{n} new', { n: unread })}</span>}</b>
          {unread > 0 && <form action={markRead}><button className="btn ghost sm">{tr('Mark read')}</button></form>}</div>
        {(notes ?? []).map((n) => <div key={n.id} className={n.read_at ? 'mu sm' : 'sm'}>{noteText(n.body, tr)} <span className="mu2 xs">· {dateLabel(n.created_at, lang)}</span></div>)}
      </div>}

      {me.pro && <>
        <h3>{tr('My pro profile')}</h3>
        <div className="card bk" style={{ marginBottom: 12 }}>
          <span><b>{tr('Status')}: {tr(me.pro.status === 'verified' ? 'Public' : 'Waiting for verification')}</b><br />
            <span className="mu sm">{tr('License check')}: {tr(proRow?.license_status ?? 'none')} · <Link href={`/pro/${me.pro.slug}`}>{tr('View my page')}</Link> · <Link href="/account/profile">{tr('Edit profile')}</Link> · <Link href="/account/reviews">{tr('My reviews')}</Link> · <Link href="/account/work">{tr('Work & chat settings')}</Link> · <Link href="/account/calendar">{tr('Calendar')}</Link> · <Link href="/account/card">{tr('Business card')}</Link></span></span>
          {online
            ? <form action={setOnline}><input type="hidden" name="hours" value={0} /><button className="btn ghost sm">● {proRow?.online_area ? tr('Online in {city}', { city: proRow.online_area }) : tr('Online')} · {tr('go offline')}</button></form>
            : <form action={setOnline} className="chips"><select className="inp" name="area" defaultValue={proRow?.online_area ?? proRow?.area ?? ''} aria-label={tr('City you are in now')} style={{ width: 'auto', padding: '7px 10px' }}>
                {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
                <input type="hidden" name="hours" value={4} /><button className="btn sm">{tr('Go online for 4 h')}</button></form>}
        </div>
        <div className="card bk urgent-set" style={{ marginBottom: 12 }}>
          <span><b>⚡ {tr('Urgent calls')}: {tr(proRow?.urgent_ok ? 'on' : 'off')}</b><br />
            <span className="mu sm">{proRow?.urgent_ok
              ? (proRow?.urgent_fee != null ? tr('Clients see you as ready for urgent calls while you are online. Urgent call-out: +${fee}.', { fee: Number(proRow.urgent_fee) }) : tr('Clients see you as ready for urgent calls while you are online.'))
              : tr('Turn on if you can come fast: you will show up first in “Urgent help” while you are online.')}</span></span>
          {proRow?.urgent_ok
            ? <form action={setUrgent}><input type="hidden" name="take" value="0" /><button className="btn ghost sm">{tr('Turn off')}</button></form>
            : <form action={setUrgent} className="chips"><input type="hidden" name="take" value="1" />
                <input className="inp" name="fee" inputMode="numeric" placeholder={tr('Extra fee, $ (optional)')} aria-label={tr('Extra fee for urgent call-out, $')} style={{ width: 190, padding: '7px 10px' }} />
                <button className="btn sm">⚡ {tr('I take urgent calls')}</button></form>}
        </div>
        <h3>{tr('My work photos')} <span className="mu sm">({(portfolio ?? []).length})</span></h3>
        <div className="card formcard" style={{ marginBottom: 18 }}>
          {(portfolio ?? []).length > 0 && <div className="works" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))' }}>
            {(portfolio ?? []).map((p: any) => (
              <form key={p.id} action={deletePhoto} className="work"><input type="hidden" name="id" value={p.id} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" style={{ aspectRatio: '1', objectFit: 'cover', display: 'block', width: '100%' }} /><button className="btn ghost sm" style={{ width: '100%', borderRadius: 0 }}>{tr('Delete')}</button></form>
            ))}</div>}
          <form action={addPhotos} className="list"><PhotoPicker name="work_url" prefix="work" max={24} label={tr('Add work photos')} />
            <select className="inp" name="service" defaultValue="" style={{ width: 'auto' }} aria-label={tr('What job is this?')}><option value="">{tr('What job is this? (helps photo search)')}</option>
              {SERVICES.filter((s) => s.trade === proRow?.trade).map((s) => <option key={s.id} value={s.id}>{svcName(s, lang)}</option>)}</select>
            <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Save photos')}</button></form>
        </div>
        <h3>{tr('My jobs')}</h3>
        <div className="list" style={{ marginBottom: 26 }}>
          {(jobs ?? []).map((b: any) => (
            <div key={b.id} className="card bk">
              <span><span className="status">{tr(STATUS[b.status])}</span><h3>{svc(b.service_id)} · {tr(TIERS[b.tier as Tier].name)}</h3>
                <span className="mu sm">{when(b, tr)} · {b.address}{b.client?.full_name ? ` · ${b.client.full_name}` : ''}</span>
                {b.notes && <span className="mu xs" style={{ display: 'block' }}>“{b.notes}”</span>}</span>
              <span className="chips">
                {b.status === 'requested' && <StatusBtn id={b.id} s="confirmed" l={tr('Confirm')} />}
                {b.status === 'confirmed' && <StatusBtn id={b.id} s="on_the_way" l={tr('On my way')} />}
                {['confirmed', 'on_the_way'].includes(b.status) && <StatusBtn id={b.id} s="in_progress" l={tr('Start')} />}
                {b.status === 'in_progress' && <StatusBtn id={b.id} s="done" l={tr('Done')} />}
              </span>
              {['in_progress', 'done'].includes(b.status) && <div style={{ gridColumn: '1/-1' }}><InvoiceLink inv={invOf(b.id)} booking={b.id} tr={tr} biller /></div>}
              {b.status === 'done' && !rated.has(b.id) && <form action={rateClient} className="list" style={{ gridColumn: '1/-1', gap: 8 }}>
                <input type="hidden" name="booking" value={b.id} /><input type="hidden" name="client" value={b.client_id} />
                <b className="sm">{tr('Rate this client (private, only pros see it)')}</b>
                <div className="row2">{[['agreements', 'Kept agreements'], ['access', 'Access to the job'], ['payment', 'Paid on time']].map(([k, l]) => <label key={k} className="f">{tr(l)}<select className="inp" name={k} defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>)}</div>
                <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>{tr('Save rating')}</button>
                <span className="mu xs">{tr('The client’s review of you is published once you both have rated.')}</span>
              </form>}
              {['confirmed', 'on_the_way', 'in_progress', 'done'].includes(b.status) && <div style={{ gridColumn: '1/-1' }} className="list">
                <JobPhotos photos={photosOf(b.id)} tr={tr} />
                {photosOf(b.id).length > 0 && (photosOf(b.id).some((p: any) => p.client_hidden)
                  ? <span className="mu xs">{tr('The client asked to keep these photos private.')}</span>
                  : <form action={publishJobPhotos} className="chips" style={{ alignItems: 'center' }}><input type="hidden" name="booking" value={b.id} /><input type="hidden" name="on" value={photosOf(b.id).some((p: any) => p.public) ? '0' : '1'} />
                      <button className="btn ghost sm">{photosOf(b.id).some((p: any) => p.public) ? `✓ ${tr('Shown on my page')} · ${tr('Hide')}` : tr('Show these photos on my page')}</button>
                      <span className="mu xs">{tr('Only if there are no faces, house numbers, addresses or personal items. Clients find you by photo search.')}</span></form>)}
                <form action={addPhotos} className="list">
                  <input type="hidden" name="booking" value={b.id} /><input type="hidden" name="kind" value={b.status === 'done' || b.status === 'in_progress' ? 'after' : 'before'} />
                  <PhotoPicker name="work_url" prefix="job" max={8} label={tr(b.status === 'done' || b.status === 'in_progress' ? 'Add AFTER photos' : 'Add BEFORE photos')} />
                  <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>{tr('Save job photos')}</button>
                </form>
              </div>}
            </div>
          ))}
          {!(jobs ?? []).length && <div className="card empty">{tr('No jobs yet.')}</div>}
        </div>
      </>}

      {me.companies.some((c) => c.role !== 'technician') && <div className="note" style={{ marginBottom: 18 }}>{tr('Manage your company jobs and team on the')} <Link href="/business">{tr('Business page')}</Link>.</div>}

      <h3>{tr('My bookings')}</h3>
      <div className="list">
        {(mine ?? []).map((b: any) => (
          <div key={b.id} className="card formcard">
            <div><span className="status">{tr(STATUS[b.status])}</span>
              <h3 style={{ margin: '4px 0' }}>{svc(b.service_id)} · {tr(TIERS[b.tier as Tier].name)}{b.price_estimate ? ` · ~${usd(b.price_estimate)}` : ''}</h3>
              <span className="mu sm">{when(b, tr)}{b.company ? ` · ${b.company.name}` : ''}</span></div>
            {b.pro ? <div className="sm">{tr('Your pro')}: <Link href={`/pro/${b.pro.slug}`}><b>{b.pro.display_name}</b></Link>{b.chosen_by === 'office' && <span className="mu xs"> · {tr('assigned by the office')}</span>}</div>
              : <div className="mu sm">{tr('The office will assign a technician. You will see who is coming here.')}</div>}
            {invOf(b.id) && <InvoiceLink inv={invOf(b.id)} booking={b.id} tr={tr} />}
            {photosOf(b.id).length > 0 && <JobPhotos photos={photosOf(b.id)} tr={tr} />}
            {photosOf(b.id).some((p: any) => p.public) && <form action={hideJobPhotos} className="chips" style={{ alignItems: 'center' }}><input type="hidden" name="booking" value={b.id} />
              <span className="mu xs">{tr('Your pro shows these photos on their page (no faces or addresses).')}</span><button className="btn ghost sm">{tr('Keep them private')}</button></form>}
            {b.proposed && <div className="note">
              {tr('{company} asks to change your technician to', { company: b.company?.name ?? '' })} <Link href={`/pro/${b.proposed.slug}`}><b>{b.proposed.display_name}</b></Link>.
              <div className="chips" style={{ marginTop: 8 }}>
                <form action={answerSwap}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="accept" value="1" /><button className="btn sm">{tr('Accept')}</button></form>
                <form action={answerSwap}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="accept" value="0" /><button className="btn ghost sm">{tr('Keep my pro')}</button></form>
              </div></div>}
            {['requested', 'assigning', 'confirmed'].includes(b.status) && <form action={setStatus}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value="cancelled" /><button className="btn ghost sm">{tr('Cancel')}</button></form>}
            {b.status === 'done' && b.pro && !done.has(b.id) && (
              <form action={submitReview} className="list">
                <input type="hidden" name="id" value={b.id} />
                <b>{tr('Rate {name}', { name: b.pro.display_name })}</b>
                {SKILLS.map(([k, l]) => <label key={k} className="f">{tr(l)}<select className="inp" name={k} defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} {n}</option>)}</select></label>)}
                <label className="f">{tr('What went well or wrong?')}<textarea className="inp" name="body" maxLength={2000} /></label>
                <label className="f">{tr('Would you hire again? (private)')}<select className="inp" name="again"><option value="1">{tr('Yes')}</option><option value="0">{tr('No')}</option></select></label>
                <button className="btn">{tr('Post review')}</button>
                <span className="mu xs">{tr('Your review is published when the pro rates the visit too, or after 14 days. Honest reviews are never removed.')}</span>
              </form>
            )}
          </div>
        ))}
        {!(mine ?? []).length && <div className="card empty">{tr('No bookings yet.')} <Link href="/search">{tr('Find a pro')}</Link></div>}
      </div>
    </div></section>
  );
}

function StatusBtn({ id, s, l }: { id: string; s: string; l: string }) {
  return <form action={setStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} /><button className="btn sm">{l}</button></form>;
}

/* eslint-disable @next/next/no-img-element */
function JobPhotos({ photos, tr }: { photos: { id: string; url: string; kind: string }[]; tr: T }) {
  if (!photos.length) return null;
  return (
    <div className="list" style={{ gap: 6 }}>
      {(['before', 'after'] as const).map((k) => {
        const list = photos.filter((p) => p.kind === k); if (!list.length) return null;
        return <div key={k}><span className="status">{tr(k === 'before' ? 'Before' : 'After')}</span>
          <div className="works" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', marginTop: 6 }}>
            {list.map((p) => <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="work"><img src={p.url} alt={`${k} photo`} style={{ aspectRatio: '1', objectFit: 'cover' }} /></a>)}
          </div></div>;
      })}
    </div>
  );
}

function InvoiceLink({ inv, booking, tr, biller }: { inv?: { id: string; number: string; status: string; total: number }; booking: string; tr: T; biller?: boolean }) {
  if (!inv) return biller ? <Link className="btn ghost sm" href={`/invoice/new?booking=${booking}`}>{tr('Create invoice')}</Link> : null;
  const st = tr(inv.status === 'draft' ? 'Draft' : inv.status === 'sent' ? 'Awaiting payment' : 'Paid');
  return <Link className="btn ghost sm" href={`/invoice/${inv.id}`}>{tr('Invoice')} {inv.number} · ${Number(inv.total).toFixed(2)} · {st}</Link>;
}
