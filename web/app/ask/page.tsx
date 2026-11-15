import Link from 'next/link';
import { TRADES, type Trade } from '@/lib/catalog';
import { listPros } from '@/lib/data';
import AskForm from './AskForm';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'Describe your job' };
export default async function Ask({ searchParams }: { searchParams: Promise<{ trade?: string }> }) {
  const sp = await searchParams; const tr = await getT();
  const trade = (sp.trade && sp.trade in TRADES ? sp.trade : 'plumbing') as Trade;
  const pros = (await listPros({ trade })).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 720 }}>
      <div className="eyebrow">{tr('Not in the catalog?')}</div><h2>{tr('Describe your job')}</h2>
      <div className="chips" style={{ marginBottom: 16 }}>{(Object.keys(TRADES) as Trade[]).map((t) => <Link key={t} className="chip" aria-pressed={t === trade} href={`/ask?trade=${t}`}>{tr(TRADES[t].name)}</Link>)}</div>
      <AskForm key={trade} pros={pros.map((p) => ({ slug: p.slug, name: p.name, sub: `${p.company?.name ?? tr('Independent')} · ${p.area} · ★ ${p.rating?.toFixed(2) ?? tr('new')}` }))} />
    </div></section>
  );
}
