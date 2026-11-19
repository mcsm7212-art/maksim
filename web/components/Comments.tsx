import Link from 'next/link';
import { addComment, deleteComment } from '@/app/social/actions';
import type { T } from '@/lib/i18n-core';
import type { CommentView } from '@/lib/social';
import { dateLabel } from '@/lib/time';
import ActionForm from './ActionForm';

/** Comments under a post. In the feed only the last few are shown, with a link to the whole thread. */
export default function Comments({ postId, items, meId, isPostOwner, tr, lang, path, limit }: {
  postId: string; items: CommentView[]; meId: string | null; isPostOwner: boolean; tr: T; lang: string; path: string; limit?: number;
}) {
  const shown = limit ? items.slice(-limit) : items;
  return (
    <div className="comments">
      {limit && items.length > limit && <Link className="xs mu" href={`/feed/${postId}`}>{tr('All {n} comments', { n: items.length })}</Link>}
      {shown.map((c) => (
        <div key={c.id} className="cmt">
          <span>{c.slug ? <Link href={`/${c.slug}`}><b>{c.name}</b></Link> : <b>{c.name}</b>} {c.slug && <span className="badge cu" style={{ fontSize: 10, padding: '0 6px' }}>{tr('Pro')}</span>} <span style={{ whiteSpace: 'pre-wrap' }}>{c.body}</span></span>
          <span className="mu2 xs">{dateLabel(c.createdAt, lang)}
            {(c.userId === meId || isPostOwner) && <form action={deleteComment} style={{ display: 'inline' }}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="path" value={path} /> · <button className="linkbtn">{tr('Delete')}</button></form>}
          </span>
        </div>
      ))}
      {meId
        ? <ActionForm action={addComment} className="cmt-form"><input type="hidden" name="post" value={postId} /><input type="hidden" name="path" value={path} />
            <input className="inp" name="body" maxLength={500} placeholder={tr('Write a comment…')} aria-label={tr('Write a comment…')} required />
            <button className="btn ghost sm">{tr('Send')}</button></ActionForm>
        : <Link className="xs mu" href={`/login?next=${encodeURIComponent(path)}`}>{tr('Sign in to comment')}</Link>}
    </div>
  );
}
