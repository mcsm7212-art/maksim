/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { TRADES, type Trade } from '@/lib/catalog';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';
import { approveCompany, approvePro, hideReview, keepReview, rejectCompany, rejectPro } from './actions';

export const metadata = { title: 'Admin' };
/* eslint-disable @typescript-eslint/no-explicit-any */
const cslb = (n: string) => `https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=${encodeURIComponent(n)}`;
const REASON: Record<string, string> = { not_a_customer: 'Not a real customer', extortion: 'Threat or demand', abuse: 'Abuse or hate', personal_data: 'Personal data', competitor: 'Competitor', other: 'Other' };

export default async function Admin() {
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>Admin</h2><p className="mu">Demo mode.</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/admin');
  if (me.role !== 'admin') redirect('/');
  const sb = await supabaseServer();
  const [{ data: pros }, { data: cos }, { data: reports }, { count: live }] = await Promise.all([
    sb.from('pros').select('id, slug, display_name, trade, license_no, photo_url, area, years_exp, insured, created_at, company:companies(name, license_no)').eq('status', 'pending').order('created_at'),
    sb.from('companies').select('id, slug, name, trade, license_no, city, owner_id, created_at').eq('status', 'pending').order('created_at'),
    sb.from('review_reports').select('id, reason, details, created_at, review:reviews(id, body, punctuality, workmanship, cleanliness, communication, pricing, author_name, pro:pros(display_name, slug))').eq('status', 'open').order('created_at'),
    sb.from('pros').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
  ]);
  return (
    <section className="sec pad"><div className="in">
      <div className="eyebrow">Moderation</div><h2>Admin</h2>
      <p className="mu sm">{live ?? 0} verified pros live. Check each license on the CSLB site before approving.</p>

      <h3>Pros waiting ({(pros ?? []).length})</h3>
      <div className="list">
        {(pros ?? []).map((p: any) => {
          const lic = p.license_no ?? p.company?.license_no;
          return (
            <form key={p.id} action={approvePro} className="card formcard">
              <input type="hidden" name="id" value={p.id} />
              <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 14 }}>
                {p.photo_url ? <img src={p.photo_url} alt="" style={{ width: 84, height: 104, objectFit: 'cover', borderRadius: 12 }} /> : <span className="badge e">No photo</span>}
                <div>
                  <b>{p.display_name}</b> <span className="mu sm">· {TRADES[p.trade as Trade].name} · {p.area} · {p.years_exp} yrs · signed up {dateLabel(p.created_at)}</span><br />
                  <span className="sm">{p.company ? `Technician at ${p.company.name}` : 'Independent'} · License: {lic ? <a href={cslb(lic)} target="_blank" rel="noreferrer">#{lic} (check on CSLB)</a> : 'none (handyman)'}</span><br />
                  <Link className="xs" href={`/pro/${p.slug}`}>Open profile</Link>
                </div>
              </div>
              <div className="chips">
                <label className="chk"><input type="checkbox" name="license_ok" defaultChecked={!lic} /> License active and name matches</label>
                <label className="chk"><input type="checkbox" name="id_ok" /> ID matches photo</label>
                <label className="chk"><input type="checkbox" name="insured_ok" defaultChecked={p.insured} /> Insurance seen</label>
              </div>
              <input className="inp" name="reason" placeholder="Reason if rejecting (sent to the pro)" />
              <div className="chips"><button className="btn sm">Approve</button><button className="btn ghost sm" formAction={rejectPro}>Reject</button></div>
            </form>
          );
        })}
        {!(pros ?? []).length && <div className="card empty">No pros waiting.</div>}
      </div>

      <h3 style={{ marginTop: 28 }}>Companies waiting ({(cos ?? []).length})</h3>
      <div className="list">
        {(cos ?? []).map((c: any) => (
          <form key={c.id} action={approveCompany} className="card formcard">
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="owner" value={c.owner_id} />
            <div><b>{c.name}</b> <span className="mu sm">· {TRADES[c.trade as Trade].name} · {c.city}</span><br />
              <span className="sm">License: {c.license_no ? <a href={cslb(c.license_no)} target="_blank" rel="noreferrer">#{c.license_no} (check on CSLB)</a> : 'none'}</span></div>
            <input className="inp" name="reason" placeholder="Reason if rejecting" />
            <div className="chips"><button className="btn sm">Approve</button><button className="btn ghost sm" formAction={rejectCompany}>Reject</button></div>
          </form>
        ))}
        {!(cos ?? []).length && <div className="card empty">No companies waiting.</div>}
      </div>

      <h3 style={{ marginTop: 28 }}>Review reports ({(reports ?? []).length})</h3>
      <p className="mu xs">Hide a review only if it breaks the rules (fake, threat, abuse, personal data, competitor). Honest negative reviews stay (FTC rule, California Civil Code §1670.8).</p>
      <div className="list">
        {(reports ?? []).map((r: any) => (
          <form key={r.id} action={keepReview} className="card formcard">
            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="review" value={r.review?.id} />
            <div><span className="status">{REASON[r.reason]}</span> <span className="mu xs">· {dateLabel(r.created_at)}</span></div>
            <div className="note">“{r.review?.body || '(no text)'}” <span className="mu xs">· {r.review?.author_name} about <Link href={`/pro/${r.review?.pro?.slug}`}>{r.review?.pro?.display_name}</Link></span></div>
            {r.details && <div className="sm">Pro says: {r.details}</div>}
            <div className="chips"><button className="btn sm" formAction={hideReview}>Hide review</button><button className="btn ghost sm">Keep review</button></div>
          </form>
        ))}
        {!(reports ?? []).length && <div className="card empty">No open reports.</div>}
      </div>
    </div></section>
  );
}
