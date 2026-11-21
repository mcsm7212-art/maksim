/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { TRADES } from '@/lib/catalog';
import { getLang } from '@/lib/i18n';
import { makeT } from '@/lib/i18n-core';
import type { Pro } from '@/lib/types';
import Figure from './Figure';

/** Pros that clients with similar picks chose, with how many such clients (3+ only, no names). */
export default async function PeerPicks({ pros, counts, title, note }: { pros: Pro[]; counts: Map<string, number>; title: string; note?: string }) {
  if (!pros.length) return null;
  const tr = makeT(await getLang());
  return (
    <div className="peer">
      <h3 style={{ margin: '0 0 4px' }}>👥 {title}</h3>
      {note && <p className="mu xs" style={{ margin: '0 0 10px' }}>{note}</p>}
      <div className="figrow">
        {pros.map((p) => (
          <Link key={p.id} href={`/${p.slug}`} className="card figcard" style={{ ['--acc' as string]: p.accent }}>
            <span className="fc-stage">{p.figureUrl ? <img src={p.figureUrl} alt="" loading="lazy" /> : <span className="fc-photo"><Figure name={p.name} accent={p.accent} photo={p.photoUrl} /></span>}</span>
            <b>{p.name}</b>
            <span className="mu xs">{tr(TRADES[p.trade].name)}{p.area ? ` · ${p.area}` : ''}</span>
            <span className="xs">{tr('Liked by {n} clients with picks like yours', { n: counts.get(p.id) ?? 0 })}</span>
          </Link>))}
      </div>
    </div>
  );
}
