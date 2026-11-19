import Link from 'next/link';
import type { LegalDoc } from '@/lib/legal';

export default function LegalPage({ doc, other, otherLabel }: { doc: LegalDoc; other: string; otherLabel: string }) {
  return (
    <section className="sec pad"><div className="in legal" style={{ maxWidth: 760 }}>
      <div className="eyebrow">NovaFides Marketplace</div>
      <h2>{doc.title}</h2>
      <p className="mu xs">{doc.updated}</p>
      <p>{doc.intro}</p>
      {doc.sections.map((s) => (
        <div key={s.h}><h3>{s.h}</h3>{s.p.map((t) => <p key={t.slice(0, 40)}>{t}</p>)}</div>
      ))}
      <p style={{ marginTop: 24 }}><Link href={other}>{otherLabel} →</Link></p>
    </div></section>
  );
}
