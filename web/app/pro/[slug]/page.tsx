import Link from 'next/link';
import { notFound } from 'next/navigation';
import Figure from '@/components/Figure';
import Icon from '@/components/Icon';
import { priceFor } from '@/components/ProCard';
import SkillPassport, { type SkillRow } from '@/components/SkillPassport';
import { serviceById, TIERS, TRADES, usd, type Tier } from '@/lib/catalog';
import { getPro, openSlots } from '@/lib/data';
import { dateLabel, slotLabel } from '@/lib/time';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props) {
  const pro = await getPro((await params).slug);
  return { title: pro ? `${pro.name} · ${TRADES[pro.trade].name}` : 'Pro not found' };
}

function levelOf(jobs: number, rating: number | null) {
  if (jobs >= 150 && (rating ?? 0) >= 4.8) return { n: 'Gold Specialist', rule: '150+ jobs on NovaFides, rating 4.8+' };
  if (jobs >= 60 && (rating ?? 0) >= 4.6) return { n: 'Silver Pro', rule: '60+ jobs, rating 4.6+' };
  return { n: 'Rising Pro', rule: 'New on NovaFides, fewer than 60 jobs' };
}

export default async function ProPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const pro = await getPro(slug);
  if (!pro) notFound();
  const tier: Tier = sp.tier && pro.tiers.includes(sp.tier as Tier) ? (sp.tier as Tier) : pro.tiers[pro.tiers.length > 1 ? 1 : 0];
  const svcId = sp.svc && pro.services.some((s) => s.id === sp.svc) ? sp.svc : pro.services[0]?.id;
  const slots = openSlots(pro).slice(0, 14);
  const lvl = levelOf(pro.jobs, pro.rating);
  const [first, ...rest] = pro.name.split(' ');
  const sk = pro.skills;
  const rows: SkillRow[] = sk ? [
    { key: 'p', name: 'Punctuality', icon: 'clock', score: sk.punctuality, desc: 'Arrives within the agreed time window and warns in advance about any change.', sample: `${Math.round(sk.punctuality * 20)}% of clients rated on-time arrival 5/5` },
    { key: 'q', name: 'Workmanship', icon: 'tool', score: sk.workmanship, desc: 'Work done right the first time, to code, and explained clearly.', sample: `${pro.jobs} verified jobs on NovaFides` },
    { key: 'c', name: 'Cleanliness', icon: 'spark', score: sk.cleanliness, desc: 'Protects floors and furniture and leaves the space cleaner than before.', sample: `Rated ${sk.cleanliness.toFixed(1)} of 5 for cleanliness` },
    { key: 'r', name: 'Communication', icon: 'chat', score: sk.communication, desc: 'Clear updates before, during and after the visit. Explains options before starting.', sample: pro.responseMin ? `Replies in about ${pro.responseMin} minutes` : 'Response time not measured yet' },
    { key: 't', name: 'Pricing transparency', icon: 'tag', score: sk.pricing, desc: 'The final bill matches the quote. No surprise fees.', sample: `Rated ${sk.pricing.toFixed(1)} of 5 for honest pricing` },
  ] : [];
  const fromPrice = svcId ? priceFor(pro, svcId, tier) : null;
  const bookHref = (t?: string) => `/book?pro=${pro.slug}&tier=${tier}${svcId ? `&svc=${svcId}` : ''}${t ? `&t=${encodeURIComponent(t)}` : ''}`;
  const tierLink = (t: Tier) => `/pro/${pro.slug}?tier=${t}${svcId ? `&svc=${svcId}` : ''}`;

  return (
    <div className={`themed ${pro.base} has-sticky`} style={{ ['--acc' as string]: pro.accent }}>
      <div className="pad"><div className="in">
        <div className="ph3">
          <div>
            <div className="eyerow"><i />{TRADES[pro.trade].name}{pro.license ? ` · CSLB ${TRADES[pro.trade].license}` : ''}</div>
            <h1 className="pname">{first}<br />{rest.join(' ')}</h1>
            {pro.company
              ? <Link className="pco" href={`/company/${pro.company.slug}`} style={{ fontSize: 'clamp(30px,6vw,52px)' }}>{pro.company.name.split(' ')[0]} <b>{pro.company.name.split(' ').slice(1).join(' ')}</b></Link>
              : <div className="pco" style={{ fontSize: 'clamp(30px,6vw,52px)' }}>Independent <b>Pro</b></div>}
            <p className="ptag">{pro.bio}</p>
            <div className="locline"><Icon name="pin" size={16} />{[pro.area, `${pro.years} years`, pro.languages.join(', ')].filter(Boolean).join(' · ')}</div>
            {pro.online && <div className="onl"><span className="dot" />Online now <small>REPLIES ~{pro.responseMin ?? 15} MIN</small></div>}
            <div className="hexlvl"><i /><span><small>Level</small><b>{lvl.n}</b></span></div>
          </div>
          <div className="figcol"><span className="lbl">ID-VERIFIED PHOTO</span><Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} big /></div>
        </div>

        <div className="kp3">
          <div><span className="num">{pro.rating != null ? pro.rating.toFixed(2) : '—'}</span><small>Rating · {pro.reviewCount} reviews</small></div>
          <div><span className="num">{pro.jobs}</span><small>Jobs on NovaFides</small></div>
          <div><span className="num">{sk ? `${Math.round(sk.punctuality * 20)}%` : '—'}</span><small>On-time score</small></div>
        </div>

        <div className="tchips">
          {pro.verified.license && pro.license && <span className="tchip"><Icon name="shield" size={15} />License #{pro.license} verified</span>}
          {pro.verified.id && <span className="tchip"><Icon name="shield" size={15} />ID checked</span>}
          {pro.verified.insured && <span className="tchip"><Icon name="shield" size={15} />Insured</span>}
          {pro.company && pro.company.warrantyMonths > 0 && <span className="tchip"><Icon name="shield" size={15} />{pro.company.warrantyMonths}-month warranty</span>}
        </div>

        <div className="seg" style={{ marginTop: 22 }} role="group" aria-label="Service level">
          {pro.tiers.map((t) => <Link key={t} href={tierLink(t)} scroll={false} aria-pressed={t === tier}>{TIERS[t].name}</Link>)}
        </div>
        <p className="mu sm" style={{ margin: '8px 0 0' }}>{TIERS[tier].blurb}</p>
        <div className="pricebox">
          <div><div className="mu sm">{svcId ? serviceById(svcId)?.name : 'Visit'}</div><div className="big">{fromPrice != null ? usd(fromPrice) : usd(pro.tripFee)}</div></div>
          <div className="mu xs" style={{ textAlign: 'right' }}>Trip fee {usd(pro.tripFee)}<br />credited if you hire</div>
        </div>
        <div className="cta2">
          <Link className="btn" href={bookHref()}>Book {first} <Icon name="arrow" /></Link>
          <Link className="btn ghost" href={`/book?pro=${pro.slug}&estimate=1`}>Request estimate</Link>
        </div>

        <div className="passhead"><span>SKILL PASSPORT</span><span>5 SKILLS</span></div>
        <h2 className="h2big">Rated by <b>real clients</b></h2>
        {rows.length ? <SkillPassport rows={rows} /> : <p className="mu">No reviews yet. Skills appear after the first finished jobs.</p>}

        <div className="passhead"><span>SERVICES</span><span>{pro.services.length}</span></div>
        <h2 className="h2big">What {first} <b>does</b></h2>
        <div className="svcgrid">
          {pro.services.slice(0, 12).map((s, i) => {
            const sv = serviceById(s.id); if (!sv) return null;
            return (
              <Link key={s.id} href={`/pro/${pro.slug}?tier=${tier}&svc=${s.id}`} scroll={false} style={{ all: 'unset', cursor: 'pointer', background: 'var(--pcard)', border: `1px solid ${s.id === svcId ? 'var(--acc)' : 'var(--pline)'}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 130, position: 'relative' }}>
                <span className="no">{String(i + 1).padStart(2, '0')}</span>
                <span className="num" style={{ fontSize: 34, color: 'var(--acc)' }}>{s.jobs}</span>
                <b style={{ fontWeight: 600, fontSize: 16, marginTop: 'auto' }}>{sv.name}</b>
                <small className="mu">{s.jobs} done · {usd(priceFor(pro, s.id, tier) ?? 0)}</small>
              </Link>
            );
          })}
        </div>

        <div className="passhead"><span>SCHEDULE</span><span>NEXT 7 DAYS</span></div>
        <h2 className="h2big">Pick a <b>time</b></h2>
        <div className="slots">
          {slots.map((t) => { const [d, h] = slotLabel(t); return <Link key={t} className="slot" href={bookHref(t)} style={{ textDecoration: 'none' }}><b>{h}</b>{d}</Link>; })}
          {!slots.length && <span className="mu">No open times this week. Send a request and {first} will suggest a time.</span>}
        </div>

        <div className="passhead"><span>REVIEWS</span><span>{pro.reviewCount}</span></div>
        <h2 className="h2big">What clients <b>say</b></h2>
        <div className="list" style={{ marginBottom: 40 }}>
          {pro.reviews.map((r) => {
            const avg = (r.scores.punctuality + r.scores.workmanship + r.scores.cleanliness + r.scores.communication + r.scores.pricing) / 5;
            return (
              <div key={r.id} className="card rv">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <b>{r.who}</b><span className="stars">{'★'.repeat(Math.round(avg))}<span className="mu2">{'★'.repeat(5 - Math.round(avg))}</span></span>
                </div>
                <div className="mu xs">{r.service} · {TIERS[r.tier].name} · {dateLabel(r.date)}{r.resolved && <span className="badge ok" style={{ marginLeft: 8 }}>Resolved with the pro</span>}</div>
                <div>{r.text}</div>
                {r.reply && <div className="reply"><b className="xs" style={{ display: 'block', color: 'var(--acc)' }}>Reply from {first}</b>{r.reply}</div>}
              </div>
            );
          })}
          {!pro.reviews.length && <p className="mu">No reviews yet.</p>}
        </div>
      </div></div>
      <div className="stick3"><span><span className="mu xs" style={{ display: 'block' }}>{TIERS[tier].name}</span><span className="big">{fromPrice != null ? usd(fromPrice) : usd(pro.tripFee)}</span></span><Link className="btn" href={bookHref()}>Book {first}</Link></div>
    </div>
  );
}
