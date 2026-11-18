/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { deletePost } from '@/app/social/actions';
import { TRADES, type Trade } from '@/lib/catalog';
import type { T } from '@/lib/i18n-core';
import type { PostView } from '@/lib/social';
import { dateLabel } from '@/lib/time';
import Figure from './Figure';
import LikeButton from './LikeButton';

export default function PostCard({ p, tr, lang, mine }: { p: PostView; tr: T; lang: string; mine?: boolean }) {
  return (
    <article className="card post" style={{ ['--acc' as string]: p.pro.accent }}>
      <header className="post-head">
        <Link href={`/${p.pro.slug}`} className="post-ava"><Figure name={p.pro.name} accent={p.pro.accent} photo={p.pro.photoUrl} /></Link>
        <span><Link href={`/${p.pro.slug}`}><b>{p.pro.name}</b></Link><br /><span className="mu xs">{tr(TRADES[p.pro.trade as Trade]?.name ?? '')} · {dateLabel(p.createdAt, lang)}</span></span>
      </header>
      {p.body && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{p.body}</p>}
      {p.photos.length > 0 && <div className={`post-photos n${Math.min(p.photos.length, 4)}`}>{p.photos.slice(0, 4).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /></a>)}</div>}
      <footer className="chips" style={{ alignItems: 'center' }}>
        <LikeButton postId={p.id} liked={p.liked} count={p.likes} />
        <Link className="btn ghost sm" href={`/book?pro=${p.pro.slug}`}>{tr('Book {name}', { name: p.pro.name.split(' ')[0] })}</Link>
        {mine && <form action={deletePost}><input type="hidden" name="id" value={p.id} /><button className="btn ghost sm">{tr('Delete')}</button></form>}
      </footer>
    </article>
  );
}
