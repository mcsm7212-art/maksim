import Link from 'next/link';
import { TRADES, type Trade, TRADE_KEYS } from '@/lib/catalog';
import { listPros } from '@/lib/data';
import AskForm from './AskForm';
import { getT } from '@/lib/i18n';
import { CITIES } from '@/lib/areas';

export const metadata = { title: 'Describe your job' };
export default async function Ask({ searchParams }: { searchParams: Promise<{ trade?: string; q?: string }> }) {
  const sp = await searchParams; const tr = await getT();
  const trade = (sp.trade && sp.trade in TRADES ? sp.trade : 'plumbing') as Trade;
  const pros = (await listPros({ trade })).filter((p) => !p.isDemo && p.accepting).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 720 }}>
      <div className="eyebrow">{tr('Compare offers')}</div><h2>{tr('Describe your job')}</h2>
      <p className="mu" style={{ maxWidth: '60ch' }}>{tr('Describe the job once and choose up to 3 pros by name. Only they get it. To write to one pro, use the button on their page.')}</p>
      <div className="chips" style={{ marginBottom: 16 }}>{TRADE_KEYS.map((t) => <Link key={t} className="chip" aria-pressed={t === trade} href={`/ask?trade=${t}`}>{tr(TRADES[t].name)}</Link>)}</div>
      <AskForm key={trade} initial={sp.q} cities={CITIES.map((c) => c.name)} pros={pros.map((p) => ({ slug: p.slug, name: p.name, sub: `${p.company?.name ?? tr('Independent')} · ${p.area} · ★ ${p.rating?.toFixed(2) ?? tr('new')}` }))} />
    </div></section>
  );
}
