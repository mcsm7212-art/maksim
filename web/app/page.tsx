import Link from 'next/link';
import Icon from '@/components/Icon';
import ProCard from '@/components/ProCard';
import SearchBox from '@/components/SearchBox';
import { TRADES, type Trade } from '@/lib/catalog';
import { listPros } from '@/lib/data';
import { popularIds } from '@/lib/social';
import { getT } from '@/lib/i18n';

export default async function Home() {
  const pros = await listPros(); const t = await getT();
  const online = pros.filter((p) => p.online).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4);
  const pop = await popularIds(6);
  const popular = pop.map((id) => pros.find((p) => p.id === id)).filter((p): p is (typeof pros)[number] => Boolean(p)).filter((p) => !online.some((o) => o.id === p.id)).slice(0, 4);
  return (
    <>
      <section className="hero pad"><div className="in">
        <div className="eyebrow">{t('Bay Area · San Francisco to San Jose')}</div>
        <h1>{t('Pick your pro.')}<br /><span>{t('Not a lead auction.')}</span></h1>
        <p>{t('Verified plumbers, electricians and handymen with real photos, their own work and honest reviews. You choose one pro. Your request goes only to them.')}</p>
        <SearchBox />
      </div></section>

      <section className="pad"><div className="in grid3">
        {(Object.keys(TRADES) as Trade[]).map((k) => (
          <Link key={k} href={`/search?trade=${k}`} className="card trade">
            <span className="ic"><Icon name={TRADES[k].icon} size={24} /></span>
            <h3>{t(TRADES[k].name)}</h3>
            <span className="mu sm">{t(TRADES[k].blurb)}</span>
            <span className="xs mu2" style={{ marginTop: 'auto' }}>{TRADES[k].license ? t('CSLB {lic} license checked', { lic: TRADES[k].license }) : t('No license needed for small jobs')}</span>
          </Link>
        ))}
      </div></section>

      <section className="pad" style={{ marginTop: 16 }}><div className="in">
        <div className="card emerg">
          <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Icon name="siren" size={26} /><span><b>{t('Emergency? Burst pipe, no power, gas smell?')}</b><br /><span className="mu sm">{t('See on the map which pros are online right now and in which city.')}</span></span></span>
          <Link href="/online" className="btn red">{t('See who is online')}</Link>
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
