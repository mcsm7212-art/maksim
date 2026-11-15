import Link from 'next/link';
import { marketMid, roundPrice, serviceById, TIERS, usd, type Tier } from '@/lib/catalog';
import type { Pro } from '@/lib/types';
import Figure from './Figure';

export function priceFor(pro: Pro, serviceId: string, tier: Tier): number | null {
  const s = serviceById(serviceId); if (!s) return null;
  const own = pro.services.find((x) => x.id === serviceId)?.price;
  return roundPrice((own ?? marketMid(s)) * TIERS[tier].multiplier);
}

export default function ProCard({ pro, serviceId, tier }: { pro: Pro; serviceId?: string | null; tier?: Tier | null }) {
  const t = tier && pro.tiers.includes(tier) ? tier : pro.tiers[0];
  const price = serviceId ? priceFor(pro, serviceId, t) : null;
  const jobsHere = serviceId ? pro.services.find((s) => s.id === serviceId)?.jobs : null;
  const q = new URLSearchParams(); if (serviceId) q.set('svc', serviceId); if (tier) q.set('tier', t);
  return (
    <Link href={`/pro/${pro.slug}${q.size ? `?${q}` : ''}`} className="card pc" style={{ textDecoration: 'none', ['--acc' as string]: pro.accent }}>
      <span className="fig"><Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3>{pro.name}</h3>{pro.online && <span className="badge ok"><span className="dot" style={{ width: 6, height: 6 }} />Online</span>}
        </span>
        <span className="mu sm" style={{ display: 'block' }}>{pro.company ? pro.company.name : 'Independent pro'} · {pro.area} · {pro.years} yrs</span>
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {pro.rating != null ? <span className="badge cu">★ {pro.rating.toFixed(2)} · {pro.reviewCount} reviews</span> : <span className="badge n">New on NovaFides</span>}
          {pro.verified.license && pro.license && <span className="badge ok">License #{pro.license}</span>}
          {jobsHere ? <span className="badge n">{jobsHere} done here</span> : <span className="badge n">{pro.jobs} jobs</span>}
        </span>
      </span>
      <span className="side">
        <span className="lvl" style={{ color: 'var(--cu-l)' }}>{pro.tiers.map((x) => TIERS[x].name).join(' · ')}</span>
        {price != null ? <span className="price">{usd(price)}</span> : <span className="mu sm">from {usd(Math.min(...pro.services.map((s) => priceFor(pro, s.id, pro.tiers[0]) ?? 1e9)))}</span>}
      </span>
    </Link>
  );
}
