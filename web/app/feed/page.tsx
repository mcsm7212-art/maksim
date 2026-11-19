import Link from 'next/link';
import PostCard from '@/components/PostCard';
import PostForm from '@/components/PostForm';
import { getMe } from '@/lib/auth';
import { getLang, getT } from '@/lib/i18n';
import { feed, POST_TAGS } from '@/lib/social';
import { isLive } from '@/lib/supabase/config';

export const metadata = { title: 'Feed' };
export const dynamic = 'force-dynamic';

export default async function Feed({ searchParams }: { searchParams: Promise<{ tab?: string; tag?: string }> }) {
  const tr = await getT(); const lang = await getLang();
  const me = await getMe();
  const sp = await searchParams;
  const tab = sp.tab === 'following' && me ? 'following' : 'discover';
  const tag = sp.tag && sp.tag in POST_TAGS ? sp.tag : null;
  const posts = await feed(tab, 30, tag);
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 680 }}>
      <div className="eyebrow">{tr('Real work from real pros')}</div>
      <h2>{tr('Feed')}</h2>
      <div className="tabs-row">
        <Link className="chip" aria-pressed={tab === 'discover'} href="/feed">{tr('New')}</Link>
        {me && <Link className="chip" aria-pressed={tab === 'following'} href="/feed?tab=following">♥ {tr('My pros')}</Link>}
        <Link className="chip" href="/questions">{tr('Ask the pros')}</Link>
        {me?.pro && <Link className="chip" href="/lounge">{tr('Pro Lounge')}</Link>}
      </div>
      <div className="chips" style={{ margin: '8px 0 14px' }}>
        <Link className="chip" aria-pressed={!tag} href={`/feed${tab === 'following' ? '?tab=following' : ''}`}>{tr('All')}</Link>
        {Object.entries(POST_TAGS).map(([k, v]) => <Link key={k} className="chip" aria-pressed={tag === k} href={`/feed?${new URLSearchParams({ ...(tab === 'following' ? { tab } : {}), tag: k })}`}>{tr(v)}</Link>)}
      </div>
      {!isLive() && <p className="note">{tr('Demo mode: the feed turns on when the database is connected.')}</p>}
      {me?.pro && <div style={{ marginBottom: 16 }}><PostForm /></div>}
      <div className="list">
        {posts.map((p) => <PostCard key={p.id} p={p} tr={tr} lang={lang} mine={p.pro.id === me?.id} meId={me?.id ?? null} path={tab === 'following' ? '/feed?tab=following' : '/feed'} />)}
        {isLive() && !posts.length && <div className="card empty">{tab === 'following'
          ? <>{tr('Save pros with ♥ on their page and their new work will show up here.')} <Link href="/search">{tr('Find a pro')}</Link></>
          : tr('No posts yet. Pros will share their work here.')}</div>}
      </div>
    </div></section>
  );
}
