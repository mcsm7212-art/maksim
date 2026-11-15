/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import ProCard from '@/components/ProCard';
import { TRADES } from '@/lib/catalog';
import { getCompany, listPros } from '@/lib/data';

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const c = await getCompany((await params).slug);
  return { title: c?.name ?? 'Company not found' };
}

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params;
  const c = await getCompany(slug);
  if (!c) notFound();
  const team = await listPros({ companySlug: slug });
  return (
    <div className={`themed ${c.base}`} style={{ ['--acc' as string]: c.accent, minHeight: '70vh' }}>
      <div className="pad"><div className="in" style={{ paddingBottom: 40 }}>
        <div className="cban">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {c.logoUrl ? <img src={c.logoUrl} alt="" width={74} height={74} style={{ borderRadius: 18, objectFit: 'cover' }} />
              : <span className="cmono">{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>}
            <div>
              <div className="eyerow"><i />{TRADES[c.trade].name} company</div>
              <h1 style={{ margin: '6px 0 0', fontSize: 'clamp(28px,5vw,44px)' }}>{c.name}</h1>
              <div className="mu sm">{c.city}{c.since ? ` · since ${c.since}` : ''}{c.license ? ` · CSLB #${c.license}` : ''}</div>
            </div>
          </div>
          <p style={{ maxWidth: '62ch' }}>{c.about}</p>
          <div className="tchips">
            {c.license && <span className="tchip"><Icon name="shield" size={15} />License verified</span>}
            {c.warrantyMonths > 0 && <span className="tchip"><Icon name="shield" size={15} />{c.warrantyMonths}-month labor warranty</span>}
            {c.rating != null && <span className="tchip">★ {c.rating.toFixed(2)} · {c.reviewCount} reviews</span>}
          </div>
          <div className="cta2" style={{ maxWidth: 520 }}>
            <Link className="btn" href={`/book?company=${c.slug}`}>Request a visit <Icon name="arrow" /></Link>
            <Link className="btn ghost" href={`/book?company=${c.slug}&estimate=1`}>Get an estimate</Link>
          </div>
          <p className="mu xs" style={{ marginBottom: 0 }}>“Request a visit”: the office picks a technician and you see who is coming in your account. Or choose a technician below.</p>
        </div>
        <div className="sec" style={{ paddingBottom: 0 }}>
          <div className="eyebrow" style={{ color: 'var(--acc)' }}>Team</div><h2>Choose a technician</h2>
          <div className="list">{team.map((p) => <ProCard key={p.id} pro={p} />)}</div>
          {!team.length && <p className="mu">Technicians appear here after verification.</p>}
        </div>
      </div></div>
    </div>
  );
}
