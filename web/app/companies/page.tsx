import Link from 'next/link';
import { TRADES } from '@/lib/catalog';
import { listCompanies } from '@/lib/data';

export const metadata = { title: 'Companies' };
export default async function Companies() {
  const list = await listCompanies();
  return (
    <section className="sec pad"><div className="in">
      <div className="eyebrow">Licensed companies</div><h2>Companies</h2>
      <p className="mu">Chat with the office, pick a specific technician, or let the office assign one.</p>
      <div className="grid3" style={{ marginTop: 16 }}>
        {list.map((c) => (
          <Link key={c.id} href={`/company/${c.slug}`} className="card trade" style={{ ['--acc' as string]: c.accent }}>
            <span className="cmono" style={{ width: 52, height: 52, fontSize: 20, borderRadius: 14 }}>{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
            <h3>{c.name}</h3>
            <span className="mu sm">{TRADES[c.trade].name} · {c.city}{c.since ? ` · since ${c.since}` : ''}</span>
            {c.rating != null && <span className="badge cu" style={{ alignSelf: 'flex-start' }}>★ {c.rating.toFixed(2)} · {c.reviewCount} reviews</span>}
          </Link>
        ))}
        {!list.length && <div className="card empty">No companies yet.</div>}
      </div>
    </div></section>
  );
}
