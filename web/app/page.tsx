/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import Icon from '@/components/Icon';
import ProCard from '@/components/ProCard';
import SearchBox from '@/components/SearchBox';
import { TRADES, type Trade, TRADE_KEYS, tradeLabel } from '@/lib/catalog';
import { listPros, openSlots } from '@/lib/data';
import { getLoc } from '@/lib/loc';
import { supabaseServer } from '@/lib/supabase/server';
import { isLive } from '@/lib/supabase/config';
import { showDemo } from '@/lib/demo-view';
import { popularIds } from '@/lib/social';
import { listQuestions } from '@/lib/community';
import { getT } from '@/lib/i18n';

export default async function Home() {
  const pros = await listPros(); const t = await getT();
  const online = pros.filter((p) => p.online).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4);
  const onlineCount = pros.filter((p) => p.online).length;
  const urgentCount = pros.filter((p) => p.urgent).length;
  const todayCount = pros.filter((p) => !p.isDemo && openSlots(p, 1).length > 0).length;
  const loc = await getLoc();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let works: any[] = []; let answered: { id: string; title: string; city: string | null; body: string; by: string; slug: string | null; n: number }[] = [];
  if (isLive()) {
    const sb = await supabaseServer(); const demoOk = await showDemo();
    const [{ data: ph }, { data: qs }] = await Promise.all([
      sb.from('pro_photos').select('id, url, caption, kind, created_at, pro:pros(slug, display_name, trade, accent, is_demo)').or('kind.eq.portfolio,public.eq.true').order('created_at', { ascending: false }).limit(24),
      sb.from('questions').select('id, title, city, best_answer_id, answers!answers_question_id_fkey(id, body, author_name, created_at, pro:pros(slug))').order('created_at', { ascending: false }).limit(20),
    ]);
    works = (ph ?? []).filter((x: any) => x.pro && (demoOk || !x.pro.is_demo)).slice(0, 8);
    answered = (qs ?? []).filter((q: any) => (q.answers ?? []).length).slice(0, 2).map((q: any) => {
      const a = (q.answers as any[]).find((x) => x.id === q.best_answer_id) ?? [...q.answers].sort((x: any, y: any) => x.created_at.localeCompare(y.created_at))[0];
      return { id: q.id, title: q.title, city: q.city, body: String(a.body).slice(0, 220), by: a.author_name, slug: a.pro?.slug ?? null, n: q.answers.length };
    });
  }
  const pop = await popularIds(6);
  const questions = (await listQuestions({}, 4));
  // Pros with a full-height figure: real pros first (best cautious score), demo examples only to fill the gap.
  const withFig = pros.filter((p) => p.figureUrl);
  const shown = [...withFig.filter((p) => !p.isDemo).sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0)), ...withFig.filter((p) => p.isDemo).sort((a, b) => b.id.localeCompare(a.id))].slice(0, 10);
  // Hero line-up: up to 3 pros of different trades.
  const lineup = shown.filter((p, i) => shown.findIndex((x) => x.trade === p.trade) === i).slice(0, 3);
  const anyDemo = shown.some((p) => p.isDemo);
  const first = (n: string) => n.split(' ')[0];
  const popular = pop.map((id) => pros.find((p) => p.id === id)).filter((p): p is (typeof pros)[number] => Boolean(p)).filter((p) => !online.some((o) => o.id === p.id)).slice(0, 4);
  return (
    <>
      <section className="hero pad"><div className={`in hero-grid${lineup.length ? '' : ' solo'}`}>
        <div>
          <div className="eyebrow">{t('Bay Area · San Francisco to San Jose')}</div>
          <h1>{t('Pick your pro.')}<br /><span>{t('Only they will call you.')}</span></h1>
          <p>{t('Verified plumbers, electricians, handymen and builders with real photos, their own work and honest reviews. You choose one pro. Your request goes only to them.')}</p>
          <SearchBox loc={loc.text} />
          <p className="sbox-only">{t('Your request goes only to the pro you choose.')}</p>
        </div>
        {lineup.length > 0 && <div className="lineup" aria-label={t('Pros on NovaFides')}>
          {lineup.map((p, i) => (
            <Link key={p.id} href={`/${p.slug}`} className={`lu-fig lu-${i}`} style={{ ['--acc' as string]: p.accent }}>
              <img src={p.figureUrl!} alt={p.name} loading={i ? 'lazy' : 'eager'} />
              <span className="lu-tag" title={t(tradeLabel(p))}><b>{first(p.name)}</b></span>
            </Link>
          ))}
          <i className="lu-floor" aria-hidden />
          {lineup.some((p) => p.isDemo) && <span className="lu-note">{t('Example profiles · real pros are joining now')}</span>}
        </div>}
      </div></section>

      <section className="pad" style={{ marginTop: 4 }}><div className="in">
        <div className="card urgent urg2">
          <img className="ic3d urg3d" src="/icons/3d/emergency.webp" alt="" width={56} height={56} />
          <div className="urg-txt">
            <b>{t('Need a pro today?')}</b>
            <span className="urg-stats">
              {/* Only numbers above zero: a row of zeros tells a visitor the site is empty. */}
              {urgentCount > 0 && <Link href="/online?urgent=1"><b className="num">{urgentCount}</b> {t('take urgent calls now')}</Link>}
              {todayCount > 0 && <Link href="/search?today=1"><b className="num">{todayCount}</b> {t('have open hours today')}</Link>}
              {onlineCount > 0 && <Link href="/online"><b className="num">{onlineCount}</b> {t('online on the site')}</Link>}
            </span>
            <span className="mu2 xs">{t('“Online” only means the pro is on the site now. The pro confirms if they can come. Smell gas? Leave the house first and call PG&E at 1-800-743-5000 or 911.')}</span>
          </div>
          <Link href={urgentCount > 0 ? '/online?urgent=1' : '/search?today=1'} className="btn">{t('Urgent help')}</Link>
        </div>
      </div></section>
      <section className="pad" style={{ marginTop: 16 }}><div className="in grid3 grid4">
        {TRADE_KEYS.map((k) => (
          <Link key={k} href={`/search?trade=${k}`} className="card trade">
            <img className="ic3d" src={`/icons/3d/${k}.webp`} alt="" width={84} height={84} loading="lazy" />
            <h3>{t(TRADES[k].name)}</h3>
            <span className="mu sm">{t(TRADES[k].blurb)}</span>
            <span className="xs mu2" style={{ marginTop: 'auto' }}>{TRADES[k].license ? t('Needs a CSLB {lic} license: each pro shows if it is checked', { lic: TRADES[k].license }) : t('No license only for jobs under $1,000 total, with no permit and no hired workers')}</span>
          </Link>
        ))}
      </div></section>


      <section className="sec pad"><div className="in">
        <div className="eyebrow">{t('How it works')}</div><h2>{t('Three simple steps')}</h2>
        <ol className="steps3">
          <li className="card"><img className="ic3d sm" src="/icons/3d/photo-search.webp" alt="" width={60} height={60} loading="lazy" /><b>{t('Describe or take a photo')}</b><span className="mu sm">{t('Type it in your own words or snap the problem. We suggest the job and the typical price.')}</span></li>
          <li className="card"><img className="ic3d sm" src="/icons/3d/verified.webp" alt="" width={60} height={60} loading="lazy" /><b>{t('Choose one pro')}</b><span className="mu sm">{t('Compare faces, checked licenses, real work photos, prices and honest reviews. Your request goes only to the pro you pick.')}</span></li>
          <li className="card"><img className="ic3d sm" src="/icons/3d/chat.webp" alt="" width={60} height={60} loading="lazy" /><b>{t('Agree in the chat')}</b><span className="mu sm">{t('The pro sends a clear quote. You accept, pick a time, and everything stays in your order and in My home.')}</span></li>
        </ol>
      </div></section>

      {shown.length > 0 && <section className="sec pad"><div className="in">
        <div className="eyebrow">{anyDemo ? t('Example profiles · real pros are joining now') : t('Verified pros')}</div>
        <div className="sec-head"><h2>{t('Pros on NovaFides')}</h2><Link href="/search" className="btn ghost sm">{t('See all pros')} →</Link></div>
        <div className="figrow">
          {shown.map((p) => (
            <Link key={p.id} href={`/${p.slug}`} className="card figcard" style={{ ['--acc' as string]: p.accent }}>
              <span className="fc-stage"><img src={p.figureUrl!} alt="" loading="lazy" /></span>
              <b>{p.name}</b>
              <span className="mu xs">{t(tradeLabel(p))}{p.area ? ` · ${p.area}` : ''}</span>
              <span className="xs">{p.isDemo ? <span className="badge p">{t('Demo profile')}</span> : p.rating != null && p.reviewCount > 0 ? <>★ {p.rating.toFixed(1)} <span className="mu">· {t(p.reviewCount > 1 ? '{n} reviews' : '{n} review', { n: p.reviewCount })}</span></> : <span className="mu">{t('Just joined')}</span>}</span>
            </Link>
          ))}
        </div>
      </div></section>}

      {works.length > 0 && <section className="sec pad"><div className="in">
        <div className="eyebrow">{t('Real jobs, real authors')}</div><h2>{t('Recent work')}</h2>
        <div className="works2">{works.map((w) => (
          <Link key={w.id} href={`/${w.pro.slug}`} className="card work2" style={{ ['--acc' as string]: w.pro.accent ?? '#B57A50' }}>
            <img src={w.url} alt={w.caption ?? ''} loading="lazy" />
            <span className="xs">{w.kind === 'before' ? t('Before') : w.kind === 'after' ? t('After') : ''}{w.kind !== 'portfolio' && w.caption ? ' · ' : ''}{w.caption}</span>
            <span className="xs mu">{w.pro.display_name} · {t(TRADES[w.pro.trade as Trade]?.name ?? '')}</span>
          </Link>))}</div>
      </div></section>}

      <section className="sec pad"><div className="in">
        <div className="eyebrow">{t('Free answers from verified pros')}</div><h2>{t('Ask the pros')}</h2>
        {answered.length > 0 && <div className="qa2">{answered.map((q) => (
          <Link key={q.id} href={`/questions/${q.id}`} className="card qa2-card">
            <b>❓ {q.title}</b>{q.city && <span className="mu xs"> · {q.city}</span>}
            <span className="qa2-ans">“{q.body}{q.body.length >= 220 ? '…' : ''}”</span>
            <span className="xs mu">{t('Answered by {name}', { name: q.by })}{q.n > 1 ? ` · ${t('{n} answers', { n: q.n })}` : ''}</span>
          </Link>))}</div>}
        <div className="list">{questions.filter((q) => !answered.some((a) => a.id === q.id)).slice(0, 2).map((q) => (
          <Link key={q.id} href={`/questions/${q.id}`} className="card qrow"><span className="qcount"><b className="num">{q.answers}</b><small>{t(q.answers === 1 ? 'answer' : 'answers')}</small></span>
            <span style={{ minWidth: 0 }}><b>{q.title}</b><br /><span className="mu xs">{q.name}{q.city ? ` · ${q.city}` : ''}</span></span></Link>))}
          <Link href="/questions" className="card bk" style={{ textDecoration: 'none' }}><span>{t('Not sure what is wrong or what it should cost? Ask here. Only verified local pros can answer, and you pick the most helpful answer.')}<br /><span className="mu xs">{t('A question is public: every pro can see and answer it. To write to one pro privately, open their profile.')}</span></span><span className="btn sm">{t('Ask a question')}</span></Link>
        </div>
      </div></section>

      {popular.length > 0 && <section className="sec pad"><div className="in">
        <div className="eyebrow">{t('Most booked in the last 90 days')}</div><h2>{t('Popular now')}</h2>
        <div className="list">{popular.map((p) => <ProCard key={p.id} pro={p} />)}</div>
      </div></section>}

      {online.length > 0 && <section className="sec pad"><div className="in">
        <div className="eyebrow">{t('Online now')}</div><h2>{t('Available pros')}</h2>
        <div className="list">{online.map((p) => <ProCard key={p.id} pro={p} />)}</div>
      </div></section>}

      <section className="sec pad"><div className="in">
        <div className="eyebrow">{t('Why NovaFides')}</div><h2>{t('Fair for clients. Fair for pros.')}</h2>
        <div className="trust">
          <div className="card"><span className="ic"><Icon name="pin" size={20} /></span><b>{t('One pro per request')}</b><span className="mu">{t('Your job is never sold to five contractors.')}</span></div>
          <div className="card"><span className="ic"><Icon name="shield" size={20} /></span><b>{t('Verified licenses')}</b><span className="mu">{t('CSLB license and ID checked. One person, one profile.')}</span></div>
          <div className="card"><span className="ic"><Icon name="camera" size={20} /></span><b>{t('Real work photos')}</b><span className="mu">{t('Pros show their own work, with before and after photos from every job.')}</span></div>
          <div className="card"><span className="ic"><Icon name="spark" size={20} /></span><b>{t('Honest reviews')}</b><span className="mu">{t('Five skills rated after every job. A review is never removed for being negative; fake, threatening or abusive ones are hidden by published rules.')}</span></div>
        </div>
        <div className="card procta">
          <div><div className="eyebrow" style={{ margin: 0 }}>{t('For pros & companies')}</div>
            <b>{t('Free during the launch. We never sell leads.')}</b>
            <span className="mu sm">{t('Clients choose you by your face, your work and your reviews. Pros who join now keep special terms. Any paid plan is announced at least 30 days ahead.')}</span></div>
          <Link href="/join" className="btn">{t('Join as a pro')}</Link>
        </div>
      </div></section>
    </>
  );
}
