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
  const popular = pop.map((id) => pros.find((p) => p.id === id)).filter((p): p is (typeof pros)[number] => Boolean(p)).filter((p) => !online.some((o) => o.id === p.id)).slice(0, 4);
  return (
    <>
      <section className="hero pad"><div className="in">
        <div className="eyebrow">{t('Bay Area · San Francisco to San Jose')}</div>
        <h1>{t('Pick your pro.')}<br /><span>{t('Not a lead auction.')}</span></h1>
        <p>{t('Verified plumbers, electricians and handymen with real photos, their own work and honest reviews. You choose one pro. Your request goes only to them.')}</p>
        <SearchBox />
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
          <div className="card"><b>{t('One pro per request')}</b><span className="mu">{t('Your job is never sold to five contractors.')}</span></div>
          <div className="card"><b>{t('Verified licenses')}</b><span className="mu">{t('CSLB license and ID checked. One person, one profile.')}</span></div>
          <div className="card"><b>{t('Real work photos')}</b><span className="mu">{t('Pros show their own work, with before and after photos from every job.')}</span></div>
          <div className="card"><b>{t('Honest reviews')}</b><span className="mu">{t('Five skills rated after every job. Negative reviews are never deleted.')}</span></div>
        </div>
      </div></section>
    </>
  );
}
