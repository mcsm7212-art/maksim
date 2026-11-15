import Link from 'next/link';
import Icon from '@/components/Icon';
import ProCard from '@/components/ProCard';
import SearchBox from '@/components/SearchBox';
import { TRADES, type Trade } from '@/lib/catalog';
import { listPros } from '@/lib/data';

export default async function Home() {
  const pros = await listPros();
  const online = pros.filter((p) => p.online).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4);
  return (
    <>
      <section className="hero pad"><div className="in">
        <div className="eyebrow">Bay Area · San Francisco to San Jose</div>
        <h1>Pick your pro.<br /><span>Not a lead auction.</span></h1>
        <p>Verified plumbers, electricians and handymen with real photos, their own work and honest reviews. You choose one pro. Your request goes only to them.</p>
        <SearchBox />
      </div></section>

      <section className="pad"><div className="in grid3">
        {(Object.keys(TRADES) as Trade[]).map((t) => (
          <Link key={t} href={`/search?trade=${t}`} className="card trade">
            <span className="ic"><Icon name={TRADES[t].icon} size={24} /></span>
            <h3>{TRADES[t].name}</h3>
            <span className="mu sm">{TRADES[t].blurb}</span>
            <span className="xs mu2" style={{ marginTop: 'auto' }}>{TRADES[t].license ? `CSLB ${TRADES[t].license} license checked` : 'No license needed for small jobs'}</span>
          </Link>
        ))}
      </div></section>

      <section className="pad" style={{ marginTop: 16 }}><div className="in">
        <div className="card emerg">
          <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Icon name="siren" size={26} /><span><b>Emergency? Burst pipe, no power, gas smell?</b><br /><span className="mu sm">See pros who are online right now near you.</span></span></span>
          <Link href="/search?online=1" className="btn red">Online now</Link>
        </div>
      </div></section>

      {online.length > 0 && <section className="sec pad"><div className="in">
        <div className="eyebrow">Online now</div><h2>Available pros</h2>
        <div className="list">{online.map((p) => <ProCard key={p.id} pro={p} />)}</div>
      </div></section>}

      <section className="sec pad"><div className="in">
        <div className="eyebrow">Why NovaFides</div><h2>Fair for clients. Fair for pros.</h2>
        <div className="trust">
          <div className="card"><b>One pro per request</b><span className="mu">Your job is never sold to five contractors.</span></div>
          <div className="card"><b>Verified licenses</b><span className="mu">CSLB license and ID checked. One person, one profile.</span></div>
          <div className="card"><b>Real work photos</b><span className="mu">Pros show their own work, with before and after photos from every job.</span></div>
          <div className="card"><b>Honest reviews</b><span className="mu">Five skills rated after every job. Negative reviews are never deleted.</span></div>
        </div>
      </div></section>
    </>
  );
}
