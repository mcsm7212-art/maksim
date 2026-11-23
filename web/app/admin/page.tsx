import { resolveProblem } from '@/app/orders/actions';
import { PROBLEM_KINDS } from '@/lib/orders';
import { getLang, getT } from '@/lib/i18n';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { TRADES, type Trade } from '@/lib/catalog';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';
import { approveCompany, approvePro, countFlagged, hideFlagged, hideReview, keepFlagged, keepReview, rejectCompany, rejectPro } from './actions';

export const metadata = { title: 'Admin' };
/* eslint-disable @typescript-eslint/no-explicit-any */
const cslb = (n: string) => `https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=${encodeURIComponent(n)}`;
const REASON: Record<string, string> = { not_a_customer: 'Not a real customer', extortion: 'Threat or demand', abuse: 'Abuse or hate', personal_data: 'Personal data', competitor: 'Competitor', other: 'Other' };

export default async function Admin() {
  const tr = await getT(); const lang = await getLang();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr("Admin")}</h2><p className="mu">{tr("Demo mode.")}</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/admin');
  if (me.role !== 'admin') redirect('/');
  const sb = await supabaseServer();
  const [{ data: pros }, { data: cos }, { data: reports }, { count: live }, { data: problems }, { data: flagged }] = await Promise.all([
    sb.from('pros').select('id, slug, display_name, trade, license_no, photo_url, area, years_exp, insured, insurance_claimed, created_at, company:companies(name, license_no)').eq('status', 'pending').order('created_at'),
    sb.from('companies').select('id, slug, name, trade, license_no, city, owner_id, created_at').eq('status', 'pending').order('created_at'),
    sb.from('review_reports').select('id, reason, details, created_at, review:reviews(id, body, punctuality, workmanship, cleanliness, communication, pricing, author_name, pro:pros(display_name, slug))').eq('status', 'open').order('created_at'),
    sb.from('pros').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
    sb.from('problems').select('*').eq('status', 'open').order('created_at'),
    sb.from('reviews').select('id, client_id, author_name, body, punctuality, workmanship, cleanliness, communication, pricing, weight, weight_reason, created_at, pro:pros(display_name, slug)').eq('needs_review', true).order('created_at').limit(50),
  ]);
  const { data: tradeReqs } = await sb.from('trade_requests').select('name, created_at').order('created_at', { ascending: false }).limit(500);
  const tradeCounts = [...(tradeReqs ?? []).reduce((m: Map<string, number>, r: any) => { const k = String(r.name).trim().toLowerCase(); m.set(k, (m.get(k) ?? 0) + 1); return m; }, new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const authors = [...new Set((flagged ?? []).map((r: any) => r.client_id as string))];
  const { data: history } = authors.length ? await sb.from('reviews').select('client_id, punctuality, workmanship, cleanliness, communication, pricing, weight, pro:pros(display_name, slug)').in('client_id', authors) : { data: [] as any[] };
  const sc = (r: any) => ((r.punctuality + r.workmanship + r.cleanliness + r.communication + r.pricing) / 5).toFixed(1);
  const WHY: Record<string, string> = { competitor: 'Praises one pro, very low marks to well-rated others', harsh: 'Much lower than other clients give the same pros', praise: 'Much higher than other clients give the same pros' };
  return (
    <section className="sec pad"><div className="in">
      <div className="eyebrow">{tr("Moderation")}</div><h2>{tr("Admin")}</h2>
      <p className="mu sm">{tr('{n} verified pros live. Check each license on the CSLB site before approving.', { n: live ?? 0 })}</p>

      <h3>{tr('Pros waiting')} ({(pros ?? []).length})</h3>
      <div className="list">
        {(pros ?? []).map((p: any) => {
          const lic = p.license_no ?? p.company?.license_no;
          return (
            <form key={p.id} action={approvePro} className="card formcard">
              <input type="hidden" name="id" value={p.id} />
              <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 14 }}>
                {p.photo_url ? <img src={p.photo_url} alt="" style={{ width: 84, height: 104, objectFit: 'cover', borderRadius: 12 }} /> : <span className="badge e">{tr("No photo")}</span>}
                <div>
                  <b>{p.display_name}</b> <span className="mu sm">· {tr(TRADES[p.trade as Trade].name)} · {p.area} · {tr('{n} yrs', { n: p.years_exp })} · {tr('signed up')} {dateLabel(p.created_at, lang)}</span><br />
                  <span className="sm">{p.company ? `${tr('Technician at')} ${p.company.name}` : tr('Independent')} · {tr('License')}: {lic ? <a href={cslb(lic)} target="_blank" rel="noreferrer">#{lic} ({tr('check on CSLB')})</a> : tr('none (handyman)')}</span><br />
                  <Link className="xs" href={`/pro/${p.slug}`}>{tr("Open profile")}</Link>
                </div>
              </div>
              <div className="chips">
                <label className="chk"><input type="checkbox" name="license_ok" defaultChecked={!lic} /> {tr("License active and name matches")}</label>
                <label className="chk"><input type="checkbox" name="id_ok" /> {tr("ID matches photo")}</label>
                <label className="chk"><input type="checkbox" name="insured_ok" defaultChecked={p.insured} /> {tr("Insurance seen")}{p.insurance_claimed && <span className="mu xs"> · {tr("the pro says they are insured")}</span>}</label>
              </div>
              <input className="inp" name="reason" placeholder={tr('Reason if rejecting (sent to the pro)')} />
              <div className="chips"><button className="btn sm">{tr("Approve")}</button><button className="btn ghost sm" formAction={rejectPro}>{tr("Reject")}</button></div>
            </form>
          );
        })}
        {!(pros ?? []).length && <div className="card empty">{tr("No pros waiting.")}</div>}
      </div>

      <h3 style={{ marginTop: 28 }}>{tr('Companies waiting')} ({(cos ?? []).length})</h3>
      <div className="list">
        {(cos ?? []).map((c: any) => (
          <form key={c.id} action={approveCompany} className="card formcard">
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="owner" value={c.owner_id} />
            <div><b>{c.name}</b> <span className="mu sm">· {tr(TRADES[c.trade as Trade].name)} · {c.city}</span><br />
              <span className="sm">{tr('License')}: {c.license_no ? <a href={cslb(c.license_no)} target="_blank" rel="noreferrer">#{c.license_no} ({tr('check on CSLB')})</a> : tr('none')}</span></div>
            <input className="inp" name="reason" placeholder={tr('Reason if rejecting')} />
            <div className="chips"><button className="btn sm">{tr("Approve")}</button><button className="btn ghost sm" formAction={rejectCompany}>{tr("Reject")}</button></div>
          </form>
        ))}
        {!(cos ?? []).length && <div className="card empty">{tr("No companies waiting.")}</div>}
      </div>

      <h3 style={{ marginTop: 28 }}>{tr('Review reports')} ({(reports ?? []).length})</h3>
      <p className="mu xs">{tr("Hide a review only if it breaks the rules (fake, threat, abuse, personal data, competitor). Honest negative reviews stay (FTC rule, California Civil Code §1670.8).")}</p>
      <div className="list">
        {(reports ?? []).map((r: any) => (
          <form key={r.id} action={keepReview} className="card formcard">
            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="review" value={r.review?.id} />
            <div><span className="status">{tr(REASON[r.reason])}</span> <span className="mu xs">· {dateLabel(r.created_at, lang)}</span></div>
            <div className="note">“{r.review?.body || tr('(no text)')}” <span className="mu xs">· {r.review?.author_name} → <Link href={`/pro/${r.review?.pro?.slug}`}>{r.review?.pro?.display_name}</Link></span></div>
            {r.details && <div className="sm">{tr('Pro says:')} {r.details}</div>}
            <div className="chips"><button className="btn sm" formAction={hideReview}>{tr("Hide review")}</button><button className="btn ghost sm">{tr("Keep review")}</button></div>
          </form>
        ))}
        {!(reports ?? []).length && <div className="card empty">{tr("No open reports.")}</div>}
      </div>

      <h3 style={{ marginTop: 28 }}>{tr('Suspicious review patterns')} ({(flagged ?? []).length})</h3>
      <p className="mu xs">{tr('Found automatically. The review stays visible; only its weight in the rating changes. Count in full if the pattern is explained (for example, the author really had bad luck). Hide only if a rule is broken.')}</p>
      <div className="list">
        {(flagged ?? []).map((r: any) => (
          <form key={r.id} action={keepFlagged} className="card formcard">
            <input type="hidden" name="review" value={r.id} />
            <div><span className="status">{tr(WHY[r.weight_reason] ?? 'Unusual pattern')}</span> <span className="mu xs">· {tr('counts')} {Math.round(Number(r.weight) * 100)}% · {dateLabel(r.created_at, lang)}</span></div>
            <div className="note">★ {sc(r)} “{r.body || tr('(no text)')}” <span className="mu xs">· {r.author_name} → <Link href={`/${r.pro?.slug}`}>{r.pro?.display_name}</Link></span></div>
            <div className="sm mu">{tr('All reviews by this author')}: {(history ?? []).filter((h: any) => h.client_id === r.client_id).map((h: any) => `${h.pro?.display_name} ★${sc(h)}`).join(' · ')}</div>
            <div className="chips"><button className="btn sm" formAction={countFlagged}>{tr('Count in full')}</button><button className="btn ghost sm">{tr('Keep reduced')}</button><button className="btn ghost sm" formAction={hideFlagged}>{tr('Hide (rule broken)')}</button></div>
          </form>
        ))}
        {!(flagged ?? []).length && <div className="card empty">{tr('Nothing suspicious right now.')}</div>}
      </div>

      <h3 style={{ marginTop: 28 }}>{tr('Trades pros asked for')} ({tradeCounts.length})</h3>
      {tradeCounts.length ? <div className="chips">{tradeCounts.map(([n, k]) => <span key={n} className="chip">{n} · {k}</span>)}</div> : <p className="mu sm">{tr('No requests yet.')}</p>}

      <h3 style={{ marginTop: 28 }}>{tr('Problems on orders')} ({(problems ?? []).length})</h3>
      <div className="list">
        {(problems ?? []).map((p: any) => (
          <form key={p.id} action={resolveProblem} className="card formcard"><input type="hidden" name="id" value={p.id} />
            <span><b>{tr(PROBLEM_KINDS[p.kind as keyof typeof PROBLEM_KINDS] ?? p.kind)}</b> · <Link href={`/orders/${p.booking_id}`}>{tr('Open order')}</Link> <span className="mu xs">· {new Date(p.created_at).toLocaleString('en-US')}</span></span>
            <span className="sm" style={{ whiteSpace: 'pre-wrap' }}>{p.body}</span>
            <textarea className="inp" name="resolution" maxLength={1000} placeholder={tr('Answer to both sides (they will see it on the order)')} style={{ minHeight: 60 }} />
            <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Mark answered')}</button>
          </form>))}
        {!(problems ?? []).length && <div className="card empty">{tr('No open problems.')}</div>}
      </div>
    </div></section>
  );
}
