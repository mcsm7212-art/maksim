import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProCard from '@/components/ProCard';
import { serviceById, SERVICES, TRADES, usd } from '@/lib/catalog';
import { listPros } from '@/lib/data';
import { getLang } from '@/lib/i18n';
import { makeT, svcName } from '@/lib/i18n-core';
import { SITE } from '@/lib/seo';
import { PRICE_FACTORS, TRADE_LICENSE_NOTE } from '@/lib/service-info';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const s = serviceById((await params).id);
  if (!s) return { title: 'Service not found', robots: { index: false } };
  return {
    title: `${s.name} in the Bay Area: typical price ${usd(s.lo)}–${usd(s.hi)}`,
    description: `${s.name}: typical Bay Area total ${usd(s.lo)}–${usd(s.hi)}${s.permit ? ', permit usually required' : ''}. What changes the price, and verified pros who do this job. You choose one pro; your request goes only to them.`,
    alternates: { canonical: `${SITE}/services/${s.id}` },
  };
}

/** One service: typical Bay Area price, what changes it, license rules, and verified pros who do it. */
export default async function ServicePage({ params }: Props) {
  const s = serviceById((await params).id); if (!s) notFound();
  const lang = await getLang(); const tr = makeT(lang);
  let pros = await listPros({ serviceId: s.id });
  if (s.permit || s.hi > 1000) pros = pros.filter((p) => p.trade !== 'handyman' && Boolean(p.license)); // jobs over $1,000 or with a permit need a CSLB license
  pros = [...pros].sort((a, b) => Number(b.accepting) - Number(a.accepting) || (b.rankScore ?? 0) - (a.rankScore ?? 0)).slice(0, 6);
  const related = SERVICES.filter((x) => x.group === s.group && x.trade === s.trade && x.id !== s.id).slice(0, 8);
  const ld = { '@context': 'https://schema.org', '@type': 'Service', name: s.name, serviceType: TRADES[s.trade].name, areaServed: 'San Francisco Bay Area', url: `${SITE}/services/${s.id}`,
    provider: { '@type': 'Organization', name: 'NovaFides Marketplace', url: SITE },
    offers: { '@type': 'AggregateOffer', priceCurrency: 'USD', lowPrice: s.lo, highPrice: s.hi } };
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 900 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <div className="eyebrow"><Link href="/services">{tr('Services and typical prices')}</Link> · {tr(TRADES[s.trade].name)}</div>
      <h2>{svcName(s, lang)}</h2>
      <div className="card svc-price">
        <div><span className="mu sm">{tr('Typical total in the Bay Area')}</span><br /><b className="num" style={{ fontSize: 'clamp(30px,6vw,44px)' }}>{usd(s.lo)}–{usd(s.hi)}</b>{s.unit !== 'job' && <span className="mu"> {tr(s.unit)}</span>}</div>
        <div className="chips">
          {s.permit && <span className="badge p">{tr('Permit usually required')}</span>}
          {s.emergency && <span className="badge urg">⚡ {tr('Same-day possible')}</span>}
          {s.handymanOk && !s.permit && s.hi <= 1000 && <span className="badge n">{tr('A handyman can do it')}</span>}
        </div>
        <div className="chips"><Link className="btn" href={`/search?svc=${s.id}`}>{tr('Find a pro')}</Link><Link className="btn ghost" href="/questions">{tr('Ask the pros')}</Link></div>
      </div>
      <p className="mu xs">{tr('Labor and standard parts. Your pro gives the exact price in a quote before the work starts.')}</p>

      <h3>{tr('What changes the price')}</h3>
      <ul className="mu" style={{ lineHeight: 1.7 }}>{PRICE_FACTORS[s.trade].map((f) => <li key={f}>{tr(f)}</li>)}</ul>
      <p className="note sm">⚖ {tr(TRADE_LICENSE_NOTE[s.trade])}</p>

      <h3 style={{ marginTop: 24 }}>{tr('Verified pros who do this job')}</h3>
      <div className="list">
        {pros.map((p) => <ProCard key={p.id} pro={p} serviceId={s.id} />)}
        {!pros.length && <div className="card empty">{tr('No verified pros for this job yet. Pros are joining now.')} <Link href={`/ask?q=${encodeURIComponent(s.name)}`}>{tr('Describe your job')}</Link></div>}
      </div>
      {pros.length > 0 && <p><Link href={`/search?svc=${s.id}`}>{tr('See all pros for this job')} →</Link></p>}

      {related.length > 0 && <><h3 style={{ marginTop: 24 }}>{tr('Related jobs')}</h3>
        <div className="chips">{related.map((r) => <Link key={r.id} className="chip" href={`/services/${r.id}`}>{svcName(r, lang)} · {usd(r.lo)}–{usd(r.hi)}</Link>)}</div></>}
    </div></section>
  );
}
