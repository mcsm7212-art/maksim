/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import Icon from '@/components/Icon';
import ProCard from '@/components/ProCard';
import SearchBox from '@/components/SearchBox';
import { TRADES, type Trade } from '@/lib/catalog';
import { listPros } from '@/lib/data';
import { popularIds } from '@/lib/social';
import { listQuestions } from '@/lib/community';
import { getT } from '@/lib/i18n';

export default async function Home() {
  const pros = await listPros(); const t = await getT();
  const online = pros.filter((p) => p.online).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4);
  const onlineCount = pros.filter((p) => p.online).length;
  const urgentCount = pros.filter((p) => p.urgent).length;
  const pop = await popularIds(6);
  const questions = (await listQuestions({}, 4));
  // Pros with a full-height figure: real pros first (best cautious score), demo examples only to fill the gap.
  const withFig = pros.filter((p) => p.figureUrl);
  const shown = [...withFig.filter((p) => !p.isDemo).sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0)), ...withFig.filter((p) => p.isDemo)].slice(0, 8);
  const lineup = shown.slice(0, 3);
  const anyDemo = shown.some((p) => p.isDemo);
  const first = (n: string) => n.split(' ')[0];
  const popular = pop.map((id) => pros.find((p) => p.id === id)).filter((p): p is (typeof pros)[number] => Boolean(p)).filter((p) => !online.some((o) => o.id === p.id)).slice(0, 4);
  return (
    <>
      <section className="hero pad"><div className="in hero-grid">
        <div>
          <div className="eyebrow">{t('Bay Area · San Francisco to San Jose')}</div>
          <h1>{t('Pick your pro.')}<br /><span>{t('Not a lead auction.')}</span></h1>
          <p>{t('Verified plumbers, electricians, handymen and builders with real photos, their own work and honest reviews. You choose one pro. Your request goes only to them.')}</p>
          <SearchBox />
        </div>
        {lineup.length > 0 && <div className="lineup" aria-label={t('Pros on NovaFides')}>
          {lineup.map((p, i) => (
            <Link key={p.id} href={`/${p.slug}`} className={`lu-fig lu-${i}`} style={{ ['--acc' as string]: p.accent }}>
              <img src={p.figureUrl!} alt={p.name} loading={i ? 'lazy' : 'eager'} />
              <span className="lu-tag"><b>{first(p.name)}</b>{t(TRADES[p.trade].name)}</span>
            </Link>
          ))}
          <i className="lu-floor" aria-hidden />
          {lineup.some((p) => p.isDemo) && <span className="lu-note">{t('Example profiles · real pros are joining now')}</span>}
        </div>}
      </div></section>

      <section className="pad" style={{ marginTop: 4 }}><div className="in">
        <div className="card urgent">
          <span className="urg-ic"><Icon name="bolt" size={22} /></span>
          <div className="urg-txt">
            <div className="eyebrow" style={{ margin: 0 }}>{t('Urgent help')}</div>
            <b>{t('Need help right now?')}</b>
            <span className="mu sm">{t('Burst pipe, power out, water heater leaking? See which verified pros are online and in which city.')}</span>
            {urgentCount > 0
              ? <span className="live xs"><i />{t(urgentCount === 1 ? '{n} pro ready for urgent calls now' : '{n} pros ready for urgent calls now', { n: urgentCount })}</span>
              : onlineCount > 0 && <span className="live xs"><i />{onlineCount === 1 ? t('{n} pro online now', { n: onlineCount }) : t('{n} pros online now', { n: onlineCount })}</span>}
            <span className="mu2 xs">{t('Smell gas? Leave the house first and call PG&E at 1-800-743-5000 or 911.')}</span>
          </div>
          <Link href={urgentCount > 0 ? '/online?urgent=1' : '/online'} className="btn">{t(urgentCount > 0 ? 'Find urgent help' : 'Find pros online')}</Link>
        </div>
      </div></section>
      <section className="pad" style={{ marginTop: 16 }}><div className="in grid3 grid4">
        {(Object.keys(TRADES) as Trade[]).map((k) => (
          <Link key={k} href={`/search?trade=${k}`} className="card trade">
            <span className="ic"><Icon name={TRADES[k].icon} size={24} /></span>
            <h3>{t(TRADES[k].name)}</h3>
            <span className="mu sm">{t(TRADES[k].blurb)}</span>
            <span className="xs mu2" style={{ marginTop: 'auto' }}>{TRADES[k].license ? t('Needs a CSLB {lic} license: each pro shows if it is checked', { lic: TRADES[k].license }) : t('No license needed for small jobs')}</span>
          </Link>
        ))}
      </div></section>


      <section className="sec pad"><div className="in">
        <div className="eyebrow">{t('How it works')}</div><h2>{t('Three steps, no lead auction')}</h2>
        <ol className="steps3">
          <li className="card"><span className="ic"><Icon name="camera" size={22} /></span><b>{t('Describe or take a photo')}</b><span className="mu sm">{t('Type it in your own words or snap the problem. We suggest the job and the typical price.')}</span></li>
          <li className="card"><span className="ic"><Icon name="shield" size={22} /></span><b>{t('Choose one pro')}</b><span className="mu sm">{t('Compare faces, checked licenses, real work photos, prices and honest reviews. Your request goes only to the pro you pick.')}</span></li>
          <li className="card"><span className="ic"><Icon name="chat" size={22} /></span><b>{t('Agree in the chat')}</b><span className="mu sm">{t('The pro sends a clear quote. You accept, pick a time, and everything stays in your order and in My home.')}</span></li>
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
              <span className="mu xs">{t(TRADES[p.trade].name)}{p.area ? ` · ${p.area}` : ''}</span>
              <span className="xs">{p.isDemo ? <span className="badge p">{t('Demo profile')}</span> : p.rating != null && p.reviewCount > 0 ? <>★ {p.rating.toFixed(1)} <span className="mu">· {t(p.reviewCount > 1 ? '{n} reviews' : '{n} review', { n: p.reviewCount })}</span></> : <span className="mu">{t('Just joined')}</span>}</span>
            </Link>
          ))}
        </div>
      </div></section>}

      <section className="sec pad"><div className="in">
        <div className="eyebrow">{t('Free answers from verified pros')}</div><h2>{t('Ask the pros')}</h2>
        <div className="list">{questions.map((q) => (
          <Link key={q.id} href={`/questions/${q.id}`} className="card qrow"><span className="qcount"><b className="num">{q.answers}</b><small>{t(q.answers === 1 ? 'answer' : 'answers')}</small></span>
            <span style={{ minWidth: 0 }}><b>{q.title}</b><br /><span className="mu xs">{q.name}{q.city ? ` · ${q.city}` : ''}</span></span></Link>))}
          <Link href="/questions" className="card bk" style={{ textDecoration: 'none' }}><span>{t('Not sure what is wrong or what it should cost? Ask here. Only verified local pros can answer, and you pick the most helpful answer.')}</span><span className="btn sm">{t('Ask a question')}</span></Link>
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
          <div className="card"><span className="ic"><Icon name="spark" size={20} /></span><b>{t('Honest reviews')}</b><span className="mu">{t('Five skills rated after every job. Negative reviews are never deleted.')}</span></div>
        </div>
        <div className="card procta">
          <div><div className="eyebrow" style={{ margin: 0 }}>{t('For pros & companies')}</div>
            <b>{t('Free during the launch. We never sell leads.')}</b>
            <span className="mu sm">{t('Clients choose you by your face, your work and your reviews. Pros who join now become Founding Pros. Any paid plan is announced at least 30 days ahead.')}</span></div>
          <Link href="/join" className="btn">{t('Become a Founding Pro')}</Link>
        </div>
      </div></section>
    </>
  );
}
