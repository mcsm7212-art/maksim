import Link from 'next/link';
import { TRADES, type Trade } from '@/lib/catalog';
import { listPros } from '@/lib/data';
import AskForm from './AskForm';

export const metadata = { title: 'Describe your job' };
export default async function Ask({ searchParams }: { searchParams: Promise<{ trade?: string }> }) {
  const sp = await searchParams;
  const trade = (sp.trade && sp.trade in TRADES ? sp.trade : 'plumbing') as Trade;
  const pros = (await listPros({ trade })).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 720 }}>
      <div className="eyebrow">Not in the catalog?</div><h2>Describe your job</h2>
      <div className="chips" style={{ marginBottom: 16 }}>{(Object.keys(TRADES) as Trade[]).map((t) => <Link key={t} className="chip" aria-pressed={t === trade} href={`/ask?trade=${t}`}>{TRADES[t].name}</Link>)}</div>
      <AskForm key={trade} pros={pros.map((p) => ({ slug: p.slug, name: p.name, sub: `${p.company?.name ?? 'Independent'} · ${p.area} · ★ ${p.rating?.toFixed(2) ?? 'new'}` }))} />
    </div></section>
  );
}
