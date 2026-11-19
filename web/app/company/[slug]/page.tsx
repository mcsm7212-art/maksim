import { getTheme } from '@/lib/theme';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import ProCard from '@/components/ProCard';
import { TRADES } from '@/lib/catalog';
import { getCompany, listPros } from '@/lib/data';
import { startChat } from '@/app/messages/actions';
import { getT } from '@/lib/i18n';

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const c = await getCompany((await params).slug);
  return { title: c?.name ?? 'Company not found' };
}

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params;
  const c = await getCompany(slug);
  if (!c) notFound();
  const team = await listPros({ companySlug: slug }); const tr = await getT();
  return (
    <div className={`themed ${(await getTheme()) === 'light' ? 'light' : c.base}`} style={{ ['--acc' as string]: c.accent, minHeight: '70vh' }}>
      <div className="pad"><div className="in" style={{ paddingBottom: 40 }}>
        <div className="cban">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {c.logoUrl ? <img src={c.logoUrl} alt="" width={74} height={74} style={{ borderRadius: 18, objectFit: 'cover' }} />
              : <span className="cmono">{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>}
            <div>
              <div className="eyerow"><i />{tr('{trade} company', { trade: tr(TRADES[c.trade].name) })}</div>
              <h1 style={{ margin: '6px 0 0', fontSize: 'clamp(28px,5vw,44px)' }}>{c.name}</h1>
              <div className="mu sm">{c.city}{c.since ? ` · ${tr('since {y}', { y: c.since })}` : ''}{c.license ? ` · CSLB #${c.license}` : ''}</div>
            </div>
          </div>
          <p style={{ maxWidth: '62ch' }}>{c.about}</p>
          <div className="tchips">
            {c.license && <span className="tchip"><Icon name="shield" size={15} />{tr('License verified')}</span>}
            {c.warrantyMonths > 0 && <span className="tchip"><Icon name="shield" size={15} />{tr('{n}-month labor warranty', { n: c.warrantyMonths })}</span>}
            {c.rating != null && <span className="tchip">★ {c.rating.toFixed(2)} · {tr('{n} reviews', { n: c.reviewCount })}</span>}
          </div>
          <div className="cta2" style={{ maxWidth: 520 }}>
            <Link className="btn" href={`/book?company=${c.slug}`}>{tr('Request a visit')} <Icon name="arrow" /></Link>
            <Link className="btn ghost" href={`/book?company=${c.slug}&estimate=1`}>{tr('Get an estimate')}</Link>
            <form action={startChat} style={{ gridColumn: '1/-1' }}><input type="hidden" name="company" value={c.slug} /><button className="btn ghost" style={{ width: '100%' }}><Icon name="chat" /> {tr('Chat with the office')}</button></form>
          </div>
          <p className="mu xs" style={{ marginBottom: 0 }}>{tr('“Request a visit”: the office picks a technician and you see who is coming in your account. Or choose a technician below.')}</p>
        </div>
        <div className="sec" style={{ paddingBottom: 0 }}>
          <div className="eyebrow" style={{ color: 'var(--acc)' }}>{tr('Team')}</div><h2>{tr('Choose a technician')}</h2>
          <div className="list">{team.map((p) => <ProCard key={p.id} pro={p} />)}</div>
          {!team.length && <p className="mu">{tr('Technicians appear here after verification.')}</p>}
        </div>
      </div></div>
    </div>
  );
}
