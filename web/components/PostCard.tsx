/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { deletePost, togglePin } from '@/app/social/actions';
import { TRADES, type Trade } from '@/lib/catalog';
import type { T } from '@/lib/i18n-core';
import { POST_TAGS, type PostView } from '@/lib/social';
import { dateLabel } from '@/lib/time';
import Figure from './Figure';
import LikeButton from './LikeButton';
import Comments from './Comments';
import { supabaseServer } from '@/lib/supabase/server';
import { isLive } from '@/lib/supabase/config';

export default async function PostCard({ p, tr, lang, mine, meId = null, path = '/feed', full }: { p: PostView; tr: T; lang: string; mine?: boolean; meId?: string | null; path?: string; full?: boolean }) {
  // the pro sees how many people asked them after seeing this work
  const asked = mine && isLive() ? (await (await supabaseServer()).from('work_requests').select('id', { count: 'exact', head: true }).eq('post_id', p.id)).count ?? 0 : 0;
  return (
    <article className="card post" id={`post-${p.id}`} style={{ ['--acc' as string]: p.pro.accent }}>
      <header className="post-head">
        <Link href={`/${p.pro.slug}`} className="post-ava"><Figure name={p.pro.name} accent={p.pro.accent} photo={p.pro.photoUrl} /></Link>
        <span><Link href={`/${p.pro.slug}`}><b>{p.pro.name}</b></Link><br /><span className="mu xs">{tr(TRADES[p.pro.trade as Trade]?.name ?? '')} · {dateLabel(p.createdAt, lang)}</span></span>
        <span className="chips" style={{ marginLeft: 'auto', alignSelf: 'flex-start' }}>{p.pinned && <span className="badge cu">📌 {tr('Pinned')}</span>}<span className={`badge ${p.tag === 'partner' ? 'p' : 'n'}`}>{tr(POST_TAGS[p.tag])}</span></span>
      </header>
      {p.body && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{p.body}</p>}
      {p.photos.length > 0 && <div className={`post-photos n${Math.min(p.photos.length, 4)}`}>{p.photos.slice(0, 4).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /></a>)}</div>}
      <footer className="chips" style={{ alignItems: 'center' }}>
        <LikeButton postId={p.id} liked={p.liked} count={p.likes} />
        <Link className="btn ghost sm" href={`/feed/${p.id}`}>💬 {p.comments.length}</Link>
        {!mine && <Link className="btn sm same" href={`/book?pro=${p.pro.slug}&estimate=1&ref=post:${p.id}`}>🙋 {tr('I have the same')}</Link>}
        {mine && asked > 0 && <span className="badge cu">🙋 {tr('{n} requests from this work', { n: asked })}</span>}
        {mine && <form action={togglePin}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="on" value={p.pinned ? '0' : '1'} /><button className="btn ghost sm">📌 {tr(p.pinned ? 'Unpin' : 'Pin to my page')}</button></form>}
        {mine && <form action={deletePost}><input type="hidden" name="id" value={p.id} /><button className="btn ghost sm">{tr('Delete')}</button></form>}
      </footer>
      <Comments postId={p.id} items={p.comments} meId={meId} isPostOwner={Boolean(mine)} tr={tr} lang={lang} path={path} limit={full ? undefined : 3} />
    </article>
  );
}
