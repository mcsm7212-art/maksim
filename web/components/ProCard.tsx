import Link from 'next/link';
import { marketMid, roundPrice, serviceById, TIERS, TRADES, usd, type Tier } from '@/lib/catalog';
import type { Pro } from '@/lib/types';
import Figure from './Figure';
import { getLang } from '@/lib/i18n';
import { makeT } from '@/lib/i18n-core';

export function priceFor(pro: Pro, serviceId: string, tier: Tier): number | null {
  const s = serviceById(serviceId); if (!s) return null;
  const own = pro.services.find((x) => x.id === serviceId)?.price;
  return roundPrice((own ?? marketMid(s)) * TIERS[tier].multiplier);
}

export default async function ProCard({ pro, serviceId, tier }: { pro: Pro; serviceId?: string | null; tier?: Tier | null }) {
  const tr = makeT(await getLang());
  const t = tier && pro.tiers.includes(tier) ? tier : pro.tiers.includes('standard') ? 'standard' : pro.tiers[0];
  const price = serviceId ? priceFor(pro, serviceId, t) : null;
  const from = pro.services.length ? Math.min(...pro.services.map((s) => priceFor(pro, s.id, pro.tiers[0]) ?? 1e9)) : null;
  const q = new URLSearchParams(); if (serviceId) q.set('svc', serviceId); if (tier) q.set('tier', t);
  return (
    <Link href={`/pro/${pro.slug}${q.size ? `?${q}` : ''}`} className="card pc" style={{ textDecoration: 'none', ['--acc' as string]: pro.accent }}>
      <span className="fig"><Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3>{pro.name}</h3>{pro.online && <span className="badge ok"><span className="dot" style={{ width: 6, height: 6 }} />{tr('Online')}</span>}
        </span>
        <span className="mu sm" style={{ display: 'block' }}>{tr(TRADES[pro.trade].name)} · {pro.company ? pro.company.name : tr('Independent')}{pro.area ? ` · ${pro.area}` : ''}{pro.years ? ` · ${tr('{n} yrs', { n: pro.years })}` : ''}</span>
        {pro.bio && <span className="sm" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 4 }}>{pro.bio}</span>}
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {pro.reviewCount > 0 && pro.rating != null ? <span className="badge cu">★ {pro.rating.toFixed(1)} · {pro.reviewCount}</span> : <span className="badge n">{tr('New')}</span>}
          {pro.verified.license && pro.license && <span className="badge ok">{tr('License')} ✓</span>}
          {pro.founding && <span className="badge cu">★ {tr('Founding Pro')}</span>}
          {pro.photos.length > 0 && <span className="badge n">{tr('{n} work photos', { n: pro.photos.length })}</span>}
        </span>
      </span>
      <span className="side">
        {price != null ? <><span className="mu xs">{tr(TIERS[t].name)}</span><span className="price">{usd(price)}</span></>
          : from != null && from < 1e9 ? <span className="mu sm">{tr('from')} <b className="price" style={{ fontSize: 17 }}>{usd(from)}</b></span> : null}
      </span>
    </Link>
  );
}
