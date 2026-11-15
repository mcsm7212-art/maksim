import Link from 'next/link';
import { notFound } from 'next/navigation';
import Figure from '@/components/Figure';
import Icon from '@/components/Icon';
import { priceFor } from '@/components/ProCard';
import SkillPassport, { type SkillRow } from '@/components/SkillPassport';
import WorkPhotos from '@/components/WorkPhotos';
import { startChat } from '@/app/messages/actions';
import { serviceById, TIERS, TRADES, usd, type Tier } from '@/lib/catalog';
import { getPro, openSlots } from '@/lib/data';
import { levelOf, showStats, STATS_MIN_JOBS, STATS_MIN_REVIEWS } from '@/lib/levels';
import { dateLabel, slotLabel } from '@/lib/time';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props) {
  const pro = await getPro((await params).slug);
  return { title: pro ? `${pro.name} · ${TRADES[pro.trade].name}` : 'Pro not found' };
}

const stars = (n: number) => <span className="stars">{'★'.repeat(Math.round(n))}<span className="mu2">{'★'.repeat(5 - Math.round(n))}</span></span>;

export default async function ProPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const pro = await getPro(slug);
  if (!pro) notFound();
  const tier: Tier = sp.tier && pro.tiers.includes(sp.tier as Tier) ? (sp.tier as Tier) : pro.tiers.includes('standard') ? 'standard' : pro.tiers[0];
  const svcId = sp.svc && pro.services.some((s) => s.id === sp.svc) ? sp.svc : undefined;
  const slots = openSlots(pro).slice(0, 14);
  const first = pro.name.split(' ')[0];
  const stats = showStats(pro);
  const bookHref = (t?: string) => `/book?pro=${pro.slug}&tier=${tier}${svcId ? `&svc=${svcId}` : ''}${t ? `&t=${encodeURIComponent(t)}` : ''}`;
  const q = (patch: Record<string, string>) => `/pro/${pro.slug}?${new URLSearchParams({ tier, ...(svcId ? { svc: svcId } : {}), ...patch })}`;
  const sk = pro.skills;
  const rows: SkillRow[] = stats && sk ? [
    { key: 'p', name: 'Punctuality', icon: 'clock', score: sk.punctuality, desc: 'Arrives within the agreed time window and warns in advance about any change.', sample: `${Math.round(sk.punctuality * 20)}% on-time score` },
    { key: 'q', name: 'Workmanship', icon: 'tool', score: sk.workmanship, desc: 'Work done right the first time, to code, and explained clearly.', sample: `${pro.jobs} verified jobs on NovaFides` },
    { key: 'c', name: 'Cleanliness', icon: 'spark', score: sk.cleanliness, desc: 'Protects floors and furniture and leaves the space cleaner than before.', sample: `Rated ${sk.cleanliness.toFixed(1)} of 5` },
    { key: 'r', name: 'Communication', icon: 'chat', score: sk.communication, desc: 'Clear updates before, during and after the visit.', sample: pro.responseMin ? `Replies in about ${pro.responseMin} minutes` : '' },
    { key: 't', name: 'Pricing transparency', icon: 'tag', score: sk.pricing, desc: 'The final bill matches the quote. No surprise fees.', sample: `Rated ${sk.pricing.toFixed(1)} of 5` },
  ] : [];

  return (
    <div className={`themed ${pro.base} has-sticky`} style={{ ['--acc' as string]: pro.accent }}>
      <div className="pad"><div className="in" style={{ maxWidth: 860, paddingBottom: 40 }}>

        <div className="lhead">
          <span className="ava"><Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} /></span>
          <div>
            <div className="eyerow"><i />{TRADES[pro.trade].name}</div>
            <h1>{pro.name}</h1>
            <div className="sm">{pro.company ? <>Technician at <Link href={`/company/${pro.company.slug}`}>{pro.company.name}</Link></> : 'Independent pro'}</div>
            <div className="meta">
              {pro.area && <span><Icon name="pin" size={14} /> {pro.area}</span>}
              {pro.years > 0 && <span>{pro.years} years experience</span>}
              {pro.languages.length > 0 && <span>{pro.languages.join(', ')}</span>}
            </div>
            <div className="trustrow">
              {pro.reviewCount > 0 && pro.rating != null
                ? <span className="badge cu">★ {pro.rating.toFixed(1)} · {pro.reviewCount} review{pro.reviewCount > 1 ? 's' : ''}</span>
                : <span className="newbadge">New on NovaFides</span>}
              {pro.verified.license && pro.license && <span className="badge ok">CSLB #{pro.license}</span>}
              {pro.verified.id && <span className="badge ok">ID checked</span>}
              {pro.verified.insured && <span className="badge ok">Insured</span>}
              {pro.online && <span className="badge ok"><span className="dot" style={{ width: 6, height: 6 }} /> Online now</span>}
            </div>
          </div>
          <div className="cta2 lcta">
            <Link className="btn" href={bookHref()}>Book {first} <Icon name="arrow" /></Link>
            <Link className="btn ghost" href={`/book?pro=${pro.slug}&estimate=1`}>Ask for estimate</Link>
            <form action={startChat} style={{ gridColumn: '1/-1' }}><input type="hidden" name="pro" value={pro.slug} /><button className="btn ghost" style={{ width: '100%' }}><Icon name="chat" /> Message {first}</button></form>
          </div>
          {sp.chat === 'demo' && <p className="note" style={{ gridColumn: '1/-1' }}>Demo mode: chat turns on when the database is connected.</p>}
        </div>

        {(pro.bio || pro.experience) && <div className="blk">
          <h2>About {first}</h2>
          {pro.bio && <p style={{ margin: '0 0 10px' }}>{pro.bio}</p>}
          {pro.experience && <p className="mu" style={{ margin: 0 }}>{pro.experience}</p>}
        </div>}

        {pro.skillTags.length > 0 && <div className="blk">
          <h2>Skills</h2>
          <div className="tags">{pro.skillTags.map((t) => <span key={t}>{t}</span>)}</div>
        </div>}

        <div className="blk">
          <h2>Work photos <small>{pro.photos.length} photo{pro.photos.length === 1 ? '' : 's'}</small></h2>
          {pro.photos.length ? <WorkPhotos photos={pro.photos} /> : <p className="mu">No work photos yet.</p>}
        </div>

        <div className="blk">
          <h2>Services and prices</h2>
          {pro.tiers.length > 1 && <div className="seg" role="group" aria-label="Service level" style={{ marginBottom: 6 }}>
            {pro.tiers.map((t) => <Link key={t} href={q({ tier: t })} scroll={false} aria-pressed={t === tier}>{TIERS[t].name}</Link>)}
          </div>}
          <p className="mu xs" style={{ margin: '4px 0 6px' }}>{TIERS[tier].name}: {TIERS[tier].blurb} Trip fee {usd(pro.tripFee)}, credited if you hire.</p>
          {pro.services.map((s) => {
            const sv = serviceById(s.id); if (!sv) return null;
            return <Link key={s.id} className="prow" href={q({ svc: s.id })} scroll={false} aria-current={s.id === svcId}><span>{sv.name}</span><b>{usd(priceFor(pro, s.id, tier) ?? 0)}</b></Link>;
          })}
        </div>

        <div className="blk">
          <h2>Available times <small>next 7 days</small></h2>
          <div className="slots">
            {slots.map((t) => { const [d, h] = slotLabel(t); return <Link key={t} className="slot" href={bookHref(t)} style={{ textDecoration: 'none' }}><b>{h}</b>{d}</Link>; })}
            {!slots.length && <span className="mu">No open times this week. Ask for an estimate and {first} will suggest a time.</span>}
          </div>
        </div>

        {stats && <div className="blk">
          <h2>NovaFides record</h2>
          <div className="kp3" style={{ marginTop: 0 }}>
            <div><span className="num">{pro.rating?.toFixed(2)}</span><small>Rating · {pro.reviewCount} reviews</small></div>
            <div><span className="num">{pro.jobs}</span><small>Jobs on NovaFides</small></div>
            <div><span className="num" style={{ fontSize: 'clamp(22px,5vw,32px)' }}>{levelOf(pro.jobs, pro.rating).n}</span><small>Level</small></div>
          </div>
          <SkillPassport rows={rows} />
        </div>}

        <div className="blk">
          <h2>Reviews <small>{pro.reviewCount}</small></h2>
          <div className="list">
            {pro.reviews.map((r) => {
              const avg = (r.scores.punctuality + r.scores.workmanship + r.scores.cleanliness + r.scores.communication + r.scores.pricing) / 5;
              return (
                <div key={r.id} className="card rv">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><b>{r.who}</b>{stars(avg)}</div>
                  <div className="mu xs">{r.service} · {TIERS[r.tier].name} · {dateLabel(r.date)}{r.resolved && <span className="badge ok" style={{ marginLeft: 8 }}>Resolved with the pro</span>}</div>
                  <div>{r.text}</div>
                  {r.reply && <div className="reply"><b className="xs" style={{ display: 'block', color: 'var(--acc)' }}>Reply from {first}</b>{r.reply}</div>}
                </div>
              );
            })}
            {!pro.reviews.length && <p className="mu">No reviews yet. Reviews come only from clients who booked {first} here.</p>}
          </div>
          {!stats && <p className="mu xs" style={{ marginTop: 14 }}>Level and detailed skill scores appear after {STATS_MIN_JOBS} jobs and {STATS_MIN_REVIEWS} reviews on NovaFides.</p>}
        </div>
      </div></div>
      <div className="stick3"><span><span className="mu xs" style={{ display: 'block' }}>{pro.name}</span>{pro.rating != null && pro.reviewCount > 0 ? <span>★ {pro.rating.toFixed(1)}</span> : <span className="mu sm">New</span>}</span><Link className="btn" href={bookHref()}>Book {first}</Link></div>
    </div>
  );
}
