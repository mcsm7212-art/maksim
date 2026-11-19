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
import { colorWord } from '@/lib/colors';
import { levelOf, showStats, STATS_MIN_JOBS, STATS_MIN_REVIEWS } from '@/lib/levels';
import { dateLabel, slotLabel } from '@/lib/time';
import { getLang } from '@/lib/i18n';
import { getTheme } from '@/lib/theme';
import { makeT, svcName } from '@/lib/i18n-core';
import { SERVICES } from '@/lib/catalog';
import SaveButton from '@/components/SaveButton';
import PostCard from '@/components/PostCard';
import { getMe } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { colleaguesOf, mySaves, postsOf, saveCount } from '@/lib/social';
import { recommendPro, unrecommendPro } from '@/app/social/actions';

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
  const lang = await getLang(); const tr = makeT(lang); const theme = await getTheme();
  const svcLabel = (name: string) => svcName(SERVICES.find((x) => x.name === name), lang) || name;
  const tier: Tier = sp.tier && pro.tiers.includes(sp.tier as Tier) ? (sp.tier as Tier) : pro.tiers.includes('standard') ? 'standard' : pro.tiers[0];
  const svcId = sp.svc && pro.services.some((s) => s.id === sp.svc) ? sp.svc : undefined;
  const slots = openSlots(pro).slice(0, 14);
  const first = pro.name.split(' ')[0];
  const stats = showStats(pro);
  const fromPrice = pro.services.length ? Math.min(...pro.services.map((x) => priceFor(pro, x.id, tier) ?? 1e9)) : null;
  const [me, saves, saved, posts, colleagues] = await Promise.all([getMe(), mySaves(), saveCount(pro.id), postsOf(pro.id), colleaguesOf(pro.id)]);
  const isOwner = me?.id === pro.id;
  const myRec = me?.pro && !isOwner ? (await (await supabaseServer()).from('pro_recommendations').select('colleague_id').eq('pro_id', me.id).eq('colleague_id', pro.id).maybeSingle()).data : null;
  const bookHref = (t?: string) => `/book?pro=${pro.slug}&tier=${tier}${svcId ? `&svc=${svcId}` : ''}${t ? `&t=${encodeURIComponent(t)}` : ''}`;
  const q = (patch: Record<string, string>) => `/pro/${pro.slug}?${new URLSearchParams({ tier, ...(svcId ? { svc: svcId } : {}), ...patch })}`;
  const sk = pro.skills;
  const rows: SkillRow[] = stats && sk ? [
    { key: 'p', name: tr('Punctuality'), icon: 'clock', score: sk.punctuality, desc: tr('Arrives within the agreed time window and warns in advance about any change.'), sample: tr('{n}% on-time score', { n: Math.round(sk.punctuality * 20) }) },
    { key: 'q', name: tr('Workmanship'), icon: 'tool', score: sk.workmanship, desc: tr('Work done right the first time, to code, and explained clearly.'), sample: tr('{n} verified jobs on NovaFides', { n: pro.jobs }) },
    { key: 'c', name: tr('Cleanliness'), icon: 'spark', score: sk.cleanliness, desc: tr('Protects floors and furniture and leaves the space cleaner than before.'), sample: tr('Rated {n} of 5', { n: sk.cleanliness.toFixed(1) }) },
    { key: 'r', name: tr('Communication'), icon: 'chat', score: sk.communication, desc: tr('Clear updates before, during and after the visit.'), sample: pro.responseMin ? tr('Replies in about {n} minutes', { n: pro.responseMin }) : '' },
    { key: 't', name: tr('Pricing transparency'), icon: 'tag', score: sk.pricing, desc: tr('The final bill matches the quote. No surprise fees.'), sample: tr('Rated {n} of 5', { n: sk.pricing.toFixed(1) }) },
  ] : [];

  return (
    <div className={`themed ${theme === 'light' ? 'light' : pro.base} has-sticky`} style={{ ['--acc' as string]: pro.accent }}>
      <div className="pad"><div className="in" style={{ maxWidth: 1040, paddingBottom: 40 }}>

        <div className="ph3 phero2">
          <div style={{ minWidth: 0 }}>
            <div className="eyerow"><i />{tr('Your pro. Their reputation.')}</div>
            <h1 className="pname">{pro.name}</h1>
            {pro.company
              ? <Link className="pco" href={`/company/${pro.company.slug}`}>{pro.company.name.toUpperCase()}<br />{tr(TRADES[pro.trade].name).toUpperCase()}<b>.</b></Link>
              : <span className="pco">{tr('INDEPENDENT')}<br />{tr(({ plumbing: 'PLUMBING', electrical: 'ELECTRICAL', handyman: 'HANDYMAN' } as const)[pro.trade])}<b>.</b></span>}
            <p className="ptag">{tr('Behind every rating is a job.')}<br />{tr('Behind every job is a person.')}</p>
            {pro.area && <div className="locline"><Icon name="pin" size={18} /> {pro.area} · San Francisco Bay Area</div>}
            {pro.online && <div className="onl"><span className="dot" />{pro.onlineArea ? tr('Online in {city}', { city: pro.onlineArea }) : tr('Online now')}</div>}
            {pro.urgent && <div className="badge urg" style={{ marginTop: 8 }}>⚡ {pro.urgentFee ? tr('Takes urgent calls · +${fee} call-out', { fee: pro.urgentFee }) : tr('Takes urgent calls')}</div>}
            {stats
              ? <div className="hexlvl"><i /><div><small>{tr('Pro level')}</small><b style={{ color: 'var(--cu-l)' }}>{tr(levelOf(pro.jobs, pro.rating).n)}</b></div></div>
              : pro.founding && <div className="hexlvl" title={tr('Joined NovaFides during the launch')}><i /><div><small>NovaFides</small><b style={{ color: 'var(--cu-l)' }}>{tr('Founding Pro')}</b></div></div>}
          </div>
          <div className="figcol">
            <div className="lbl">{tr(TRADES[pro.trade].name).toUpperCase()} / {tr(colorWord(pro.accent))}</div>
            <Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} figure={pro.figureUrl} big />
          </div>
        </div>

        <div className="kp3">
          <div>{pro.reviewCount > 0 && pro.rating != null
            ? <><span className="num">{pro.rating.toFixed(1)}</span><small><span className="stars">★★★★★</span><br />{tr(pro.reviewCount > 1 ? '{n} reviews' : '{n} review', { n: pro.reviewCount })}</small></>
            : <><span className="num">0</span><small>{tr('No reviews yet')}</small></>}</div>
          <div>{stats
            ? <><span className="num">{pro.jobs}</span><small>{tr('jobs on NovaFides')}</small></>
            : <><span className="num">{pro.years || '—'}</span><small>{tr('years of experience')}</small></>}</div>
          <div><span className="num">{pro.responseMin ?? '—'}{pro.responseMin != null && <span style={{ fontSize: '.45em' }}> {tr('min')}</span>}</span><small>{tr('typical response')}</small></div>
        </div>

        <div className="tchips">
          {pro.verified.license && pro.license && <span className="tchip"><Icon name="shield" size={16} /> CSLB #{pro.license}</span>}
          {pro.verified.id && <span className="tchip">{tr('ID checked')}</span>}
          {pro.verified.insured && <span className="tchip">{tr('Insured')}</span>}
          {pro.languages.length > 0 && <span className="tchip">{pro.languages.join(', ')}</span>}
          {pro.company && <span className="tchip">{tr('Technician at')} {pro.company.name}</span>}
        </div>

        <div className="pricebox2">
          {fromPrice != null && fromPrice < 1e9 && <div><div className="mu">{tr('Starting at')}</div><div className="big num">{usd(fromPrice)}</div></div>}
          <div className="cta2" style={{ flex: 1 }}>
            <Link className="btn" href={bookHref()}>{tr('Book {name}', { name: first })} <Icon name="arrow" /></Link>
            <Link className="btn ghost" href={`/book?pro=${pro.slug}&estimate=1`}>{tr('Ask for estimate')}</Link>
            <form action={startChat} style={{ gridColumn: '1/-1' }}><input type="hidden" name="pro" value={pro.slug} /><button className="btn ghost" style={{ width: '100%' }}><Icon name="chat" /> {tr('Message {name}', { name: first })}</button></form>
          </div>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          {!isOwner && <SaveButton proId={pro.id} initial={saves.get(pro.id) ?? null} count={saved} />}
          {isOwner && saved > 0 && <span className="badge cu">♥ {tr('{n} people saved you', { n: saved })}</span>}
          <a className="btn ghost sm" href={`/api/vcard/${pro.slug}`}>{tr('Save to contacts')}</a>
          <a className="btn ghost sm" href={`/api/qr/${pro.slug}?format=png`}>{tr('QR code')}</a>
        </div>
        {sp.chat === 'demo' && <p className="note">{tr('Demo mode: chat turns on when the database is connected.')}</p>}

        {(pro.bio || pro.experience) && <div className="blk">
          <h2>{tr('About {name}', { name: first })}</h2>
          {pro.bio && <p style={{ margin: '0 0 10px' }}>{pro.bio}</p>}
          {pro.experience && <p className="mu" style={{ margin: 0 }}>{pro.experience}</p>}
        </div>}

        {pro.skillTags.length > 0 && <div className="blk">
          <h2>{tr('Skills')}</h2>
          <div className="tags">{pro.skillTags.map((t) => <span key={t}>{t}</span>)}</div>
        </div>}

        <div className="blk">
          <h2>{tr('Work photos')} <small>{tr(pro.photos.length === 1 ? '{n} photo' : '{n} photos', { n: pro.photos.length })}</small></h2>
          {pro.photos.length ? <WorkPhotos photos={pro.photos} /> : <p className="mu">{tr('No work photos yet.')}</p>}
        </div>

        {(posts.length > 0 || isOwner) && <div className="blk">
          <h2>{tr('Posts')} <small><a href="/feed">{tr('Feed')} →</a></small></h2>
          {isOwner && <p className="mu sm" style={{ marginTop: 0 }}>{tr('Share new work in the')} <a href="/feed">{tr('Feed')}</a>.</p>}
          <div className="list">{posts.map((p) => <PostCard key={p.id} p={p} tr={tr} lang={lang} mine={isOwner} />)}</div>
        </div>}

        {(colleagues.length > 0 || isOwner) && <div className="blk">
          <h2>{tr('{name} recommends', { name: first })} <small>{tr('trusted colleagues')}</small></h2>
          {isOwner && !colleagues.length && <p className="mu sm">{tr('Open another pro’s page and press “Recommend” to vouch for a colleague you trust: an electrician, a handyman, a drain specialist.')}</p>}
          <div className="colls">{colleagues.map((c) => (
            <div key={c.id} className="card coll" style={{ ['--acc' as string]: c.accent }}>
              <a href={`/${c.slug}`} className="ava"><Figure name={c.name} accent={c.accent} photo={c.photoUrl} /></a>
              <span style={{ minWidth: 0 }}><a href={`/${c.slug}`}><b>{c.name}</b></a><br /><span className="mu xs">{tr(TRADES[c.trade as keyof typeof TRADES]?.name ?? '')}{c.note ? ` · “${c.note}”` : ''}</span></span>
              {isOwner && <form action={unrecommendPro} style={{ marginLeft: 'auto' }}><input type="hidden" name="colleague" value={c.id} /><input type="hidden" name="path" value={`/${pro.slug}`} /><button className="btn ghost sm" aria-label={tr('Remove')}>✕</button></form>}
            </div>))}</div>
        </div>}

        {me?.pro && me.pro.status === 'verified' && !isOwner && !myRec && <div className="blk">
          <form action={recommendPro} className="card formcard">
            <b>{tr('Do you trust {name}? Recommend them on your page.', { name: first })}</b>
            <input type="hidden" name="colleague" value={pro.id} /><input type="hidden" name="path" value={`/${pro.slug}`} />
            <input className="inp" name="note" maxLength={140} placeholder={tr('Why? E.g. “My go-to electrician, always on time.”')} />
            <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Recommend')}</button>
          </form>
        </div>}

        <div className="blk">
          <h2>{tr('Services and prices')}</h2>
          {pro.tiers.length > 1 && <div className="seg" role="group" aria-label={tr('Service level')} style={{ marginBottom: 6 }}>
            {pro.tiers.map((t) => <Link key={t} href={q({ tier: t })} scroll={false} aria-pressed={t === tier}>{tr(TIERS[t].name)}</Link>)}
          </div>}
          <p className="mu xs" style={{ margin: '4px 0 6px' }}>{tr(TIERS[tier].name)}: {tr(TIERS[tier].blurb)} {tr('Trip fee {fee}, credited if you hire.', { fee: usd(pro.tripFee) })}</p>
          {pro.services.map((s) => {
            const sv = serviceById(s.id); if (!sv) return null;
            return <Link key={s.id} className="prow" href={q({ svc: s.id })} scroll={false} aria-current={s.id === svcId}><span>{svcName(sv, lang)}</span><b>{usd(priceFor(pro, s.id, tier) ?? 0)}</b></Link>;
          })}
        </div>

        <div className="blk">
          <h2>{tr('Available times')} <small>{tr('next 7 days')}</small></h2>
          <div className="slots">
            {slots.map((t) => { const [d, h] = slotLabel(t, tr); return <Link key={t} className="slot" href={bookHref(t)} style={{ textDecoration: 'none' }}><b>{h}</b>{d}</Link>; })}
            {!slots.length && <span className="mu">{tr('No open times this week. Ask for an estimate and {name} will suggest a time.', { name: first })}</span>}
          </div>
        </div>

        {stats && <div className="blk">
          <h2>{tr('NovaFides record')}</h2>
          <div className="kp3" style={{ marginTop: 0 }}>
            <div><span className="num">{pro.rating?.toFixed(2)}</span><small>{tr('Rating')} · {tr('{n} reviews', { n: pro.reviewCount })}</small></div>
            <div><span className="num">{pro.jobs}</span><small>{tr('Jobs on NovaFides')}</small></div>
            <div><span className="num" style={{ fontSize: 'clamp(22px,5vw,32px)' }}>{tr(levelOf(pro.jobs, pro.rating).n)}</span><small>{tr('Level')}</small></div>
          </div>
          <SkillPassport rows={rows} />
        </div>}

        <div className="blk">
          <h2>{tr('Reviews')} <small>{pro.reviewCount}</small></h2>
          <div className="list">
            {pro.reviews.map((r) => {
              const avg = (r.scores.punctuality + r.scores.workmanship + r.scores.cleanliness + r.scores.communication + r.scores.pricing) / 5;
              return (
                <div key={r.id} className="card rv">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><b>{r.who}</b>{stars(avg)}</div>
                  <div className="mu xs">{svcLabel(r.service)} · {tr(TIERS[r.tier].name)} · {dateLabel(r.date, lang)}{r.resolved && <span className="badge ok" style={{ marginLeft: 8 }}>{tr('Resolved with the pro')}</span>}</div>
                  <div>{r.text}</div>
                  {r.reply && <div className="reply"><b className="xs" style={{ display: 'block', color: 'var(--acc)' }}>{tr('Reply from {name}', { name: first })}</b>{r.reply}</div>}
                </div>
              );
            })}
            {!pro.reviews.length && <p className="mu">{tr('No reviews yet. Reviews come only from clients who booked {name} here.', { name: first })}</p>}
          </div>
          {!stats && <p className="mu xs" style={{ marginTop: 14 }}>{tr('Level and detailed skill scores appear after {jobs} jobs and {reviews} reviews on NovaFides.', { jobs: STATS_MIN_JOBS, reviews: STATS_MIN_REVIEWS })}</p>}
        </div>
      </div></div>
      <div className="stick3"><span><span className="mu xs" style={{ display: 'block' }}>{pro.name}</span>{pro.rating != null && pro.reviewCount > 0 ? <span>★ {pro.rating.toFixed(1)}</span> : <span className="mu sm">{tr('New')}</span>}</span><Link className="btn" href={bookHref()}>{tr('Book {name}', { name: first })}</Link></div>
    </div>
  );
}
