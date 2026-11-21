/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { TRADES, type Trade } from '@/lib/catalog';
import type { Project } from '@/lib/projects';
import { dateLabel } from '@/lib/time';

/** A client's finished project with the pro who did it (shown publicly only after the pro confirmed). */
export default function ProjectCard({ p, tr, lang, children }: { p: Project; tr: (s: string, v?: Record<string, string | number>) => string; lang: string; children?: React.ReactNode }) {
  return (
    <article className="card post proj" style={{ ['--acc' as string]: p.pro.accent }}>
      <div className="mu xs proj-head">
        <span className="badge cu">📸 {tr('Client project')}</span>
        <Link href={`/client/${p.clientId}`}><b>{p.author}</b></Link> · {dateLabel(p.createdAt, lang)}
      </div>
      {p.photos.length > 0 && <div className="jobstrip">{p.photos.slice(0, 4).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /></a>)}</div>}
      {p.body && <div>{p.body}</div>}
      <div className="sm">{tr('Work by')} <Link href={`/${p.pro.slug}`}><b>{p.pro.name}</b></Link> · {tr(TRADES[p.pro.trade as Trade]?.name ?? '')}
        {p.status === 'confirmed' && <span className="tchip" style={{ marginLeft: 8 }}>✓ {tr('Confirmed by the pro')}</span>}</div>
      {children}
    </article>
  );
}
