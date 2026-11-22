import Link from 'next/link';
import { marketMid, roundPrice, serviceById, TRADES, usd } from '@/lib/catalog';
import { svcName } from '@/lib/i18n-core';
import type { Pro } from '@/lib/types';
import Figure from './Figure';
import { getLang } from '@/lib/i18n';
import { makeT } from '@/lib/i18n-core';

/** The pro's own price for a job, or the Bay Area typical price when the pro has not set one. One price, no levels. */
export function priceFor(pro: Pro, serviceId: string, _tier?: unknown): number | null {
  const s = serviceById(serviceId); if (!s) return null;
  const own = pro.services.find((x) => x.id === serviceId)?.price;
  return roundPrice(own ?? marketMid(s));
}

export default async function ProCard({ pro, serviceId, saved, reasons }: { pro: Pro; serviceId?: string | null; tier?: unknown; saved?: boolean; reasons?: string[] }) {
  const lang = await getLang(); const tr = makeT(lang);
  const price = serviceId ? priceFor(pro, serviceId) : null;
  const from = pro.services.length ? Math.min(...pro.services.map((s) => priceFor(pro, s.id) ?? 1e9)) : null;
  const q = new URLSearchParams(); if (serviceId) q.set('svc', serviceId);
  return (
    <Link href={`/pro/${pro.slug}${q.size ? `?${q}` : ''}`} className="card pc" style={{ textDecoration: 'none', ['--acc' as string]: pro.accent }}>
      <span className="fig"><Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3>{pro.name}</h3>{pro.online && <span className="badge ok"><span className="dot" style={{ width: 6, height: 6 }} />{tr('Online')}</span>}{pro.urgent && <span className="badge urg">⚡ {tr('Urgent calls')}</span>}{pro.isDemo ? <span className="badge p">{tr('Demo profile')}</span> : !pro.accepting && <span className="badge n">{tr('Not taking jobs now')}</span>}
        </span>
        <span className="mu sm" style={{ display: 'block' }}>{tr(TRADES[pro.trade].name)} · {pro.company ? pro.company.name : tr('Independent')}{pro.area ? ` · ${pro.area}` : ''}{pro.years ? ` · ${tr('{n} yrs', { n: pro.years })}` : ''}</span>
        {pro.bio && <span className="sm" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 4 }}>{pro.bio}</span>}
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {pro.reviewCount > 0 && pro.rating != null ? <span className="badge cu">★ {pro.rating.toFixed(1)} · {pro.reviewCount}</span> : <span className="badge n">{tr('New')}</span>}
          {pro.verified.license && pro.license && <span className="badge ok">{tr('License')} ✓</span>}
          {!pro.license && <span className="badge n" title={tr('Without a CSLB license: jobs under $1,000 with materials, no permit')}>{tr('Jobs under $1,000')}</span>}
          {saved && <span className="badge cu">♥ {tr('My pro')}</span>}
          {pro.founding && <span className="badge cu">★ {tr('Founding Pro')}</span>}
          {pro.photos.length > 0 && <span className="badge n">{tr('{n} work photos', { n: pro.photos.length })}</span>}
        </span>
        {reasons && reasons.length > 0 && <span className="why xs">{reasons.map((r) => <span key={r}>{r}</span>)}</span>}
      </span>
      <span className="side">
        {price != null ? <><span className="mu xs">{svcName(serviceById(serviceId!), lang)}</span><span className="price">≈ {usd(price)}</span></>
          : from != null && from < 1e9 ? <span className="mu sm">{tr('from')} <b className="price" style={{ fontSize: 17 }}>{usd(from)}</b></span> : null}
      </span>
    </Link>
  );
}
