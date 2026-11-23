/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Figure from '@/components/Figure';
import PostCard from '@/components/PostCard';
import PostForm from '@/components/PostForm';
import { startChat } from '@/app/messages/actions';
import { toggleColleague } from '@/app/account/work/actions';
import { getMe } from '@/lib/auth';
import { tradeLabel, type Trade } from '@/lib/catalog';
import { getLang, getT } from '@/lib/i18n';
import { friendsFeed, myFriends, type Friend } from '@/lib/social';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'My pro friends', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** The pro's own corner: avatar, friends (who is online), friend requests, a feed and photos that only friends see. */
export default async function Friends({ searchParams }: { searchParams: Promise<{ find?: string; tab?: string }> }) {
  const tr = await getT(); const lang = await getLang();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('My pro friends')}</h2><p className="mu">{tr('Demo mode.')}</p></div></section>;
  const me = await getMe(); if (!me) redirect('/login?next=/friends');
  if (!me.pro) redirect('/join/pro');
  const sp = await searchParams; const sb = await supabaseServer();
  const [{ data: row }, all] = await Promise.all([
    sb.from('pros').select('display_name, trade, custom_trade, photo_url, accent, area, online_until').eq('id', me.id).single(),
    myFriends(),
  ]);
  const friends = all.filter((f) => f.kind === 'friend'), incoming = all.filter((f) => f.kind === 'incoming'), outgoing = all.filter((f) => f.kind === 'outgoing');
  const posts = await friendsFeed([me.id, ...friends.map((f) => f.id)]);
  const mine = posts.filter((p) => p.pro.id === me.id);
  const privatePhotos = mine.filter((p) => p.audience === 'friends').flatMap((p) => p.photos);
  const find = (sp.find ?? '').trim();
  const { data: found } = find.length >= 2
    ? await sb.from('pros').select('id, slug, display_name, trade, custom_trade, photo_url, accent, area').eq('status', 'verified').eq('is_demo', false).neq('id', me.id).ilike('display_name', `%${find.replace(/[%_]/g, '')}%`).limit(10)
    : { data: null as any[] | null };
  const known = new Map(all.map((f) => [f.id, f.kind]));
  const acc = row?.accent ?? '#B57A50';
  const online = Boolean(row?.online_until && new Date(row.online_until) > new Date());
  const label = (f: { trade: string; customTrade?: string | null }) => tr(tradeLabel({ trade: f.trade as Trade, customTrade: f.customTrade }));
  const tab = sp.tab === 'photos' ? 'photos' : sp.tab === 'mine' ? 'mine' : 'feed';
  const shown = tab === 'mine' ? mine : posts;

  const Person = ({ f, children }: { f: Friend; children?: React.ReactNode }) => (
    <div className="fr-row" style={{ ['--acc' as string]: f.accent }}>
      <Link href={`/${f.slug}`} className="post-ava fr-ava"><Figure name={f.name} accent={f.accent} photo={f.photoUrl} />{f.online && <i className="fr-on" title={tr('Online')} />}</Link>
      <span className="fr-name"><Link href={`/${f.slug}`}><b>{f.name}</b></Link><br /><span className="mu xs">{label(f)}{f.area ? ` · ${f.area}` : ''}</span></span>
      <span className="chips">{children}</span>
    </div>
  );
  const Toggle = ({ id, on, text, ghost }: { id: string; on: boolean; text: string; ghost?: boolean }) => (
    <form action={toggleColleague}><input type="hidden" name="id" value={id} /><input type="hidden" name="on" value={on ? '1' : '0'} /><input type="hidden" name="path" value="/friends" /><button className={`btn sm${ghost ? ' ghost' : ''}`}>{text}</button></form>
  );

  return (
    <section className="sec pad"><div className="in fr" style={{ ['--acc' as string]: acc }}>
      {/* my card */}
      <header className="card fr-me">
        <span className="fr-me-ava"><Figure name={row?.display_name ?? me.name} accent={acc} photo={row?.photo_url} />{online && <i className="fr-on" title={tr('Online')} />}</span>
        <div className="fr-me-t">
          <div className="eyebrow">{tr('My pro friends')}</div>
          <h2 style={{ margin: '2px 0' }}>{row?.display_name ?? me.name}</h2>
          <span className="mu sm">{label({ trade: row?.trade ?? 'plumbing', customTrade: row?.custom_trade })}{row?.area ? ` · ${row.area}` : ''}</span>
          <div className="fr-stats"><span><b>{friends.length}</b> {tr('friends')}</span><span><b>{mine.length}</b> {tr('posts')}</span><span><b>{privatePhotos.length}</b> {tr('photos for friends')}</span></div>
        </div>
        <span className="chips fr-me-btn"><Link className="btn ghost sm" href={`/pro/${me.pro.slug}`}>👁 {tr('My page as clients see it')}</Link><Link className="btn ghost sm" href="/account">{tr('My account')}</Link></span>
      </header>

      <div className="fr-grid">
        {/* left: people */}
        <aside className="fr-side">
          {incoming.length > 0 && <div className="card fr-box pulse-green">
            <b>{tr('Friend requests')} <span className="badge ok">{incoming.length}</span></b>
            {incoming.map((f) => <Person key={f.id} f={f}><Toggle id={f.id} on text={`✓ ${tr('Add back')}`} /></Person>)}
          </div>}
          <div className="card fr-box">
            <b>{tr('Friends')} <span className="mu sm">({friends.length})</span></b>
            {friends.map((f) => <Person key={f.id} f={f}>
              <form action={startChat}><input type="hidden" name="pro" value={f.slug} /><button className="btn ghost sm" title={tr('Message')}>💬</button></form>
              <Toggle id={f.id} on={false} text="✕" ghost />
            </Person>)}
            {!friends.length && <span className="mu sm">{tr('No friends yet. Find a pro below and add them: when they add you back, you are friends.')}</span>}
          </div>
          <div className="card fr-box">
            <b>{tr('Find a pro')}</b>
            <form className="chips" action="/friends" method="get"><input className="inp" name="find" defaultValue={find} placeholder={tr('Find a pro by name')} aria-label={tr('Find a pro by name')} style={{ flex: '1 1 140px' }} /><button className="btn ghost sm">{tr('Find')}</button></form>
            {found?.map((p: any) => { const k = known.get(p.id); return (
              <Person key={p.id} f={{ id: p.id, slug: p.slug, name: p.display_name, trade: p.trade, customTrade: p.custom_trade, photoUrl: p.photo_url, accent: p.accent ?? '#B57A50', area: p.area, online: false, kind: 'outgoing' }}>
                {k === 'friend' ? <span className="mu xs">✓ {tr('Friend')}</span> : k === 'outgoing' ? <span className="mu xs">{tr('Request sent')}</span> : <Toggle id={p.id} on text={k === 'incoming' ? `✓ ${tr('Add back')}` : `+ ${tr('Add')}`} />}
              </Person>); })}
            {found && !found.length && <span className="mu sm">{tr('Nobody found by that name.')}</span>}
            {outgoing.length > 0 && <><span className="mu xs">{tr('Waiting for an answer')}:</span>
              {outgoing.map((f) => <Person key={f.id} f={f}><Toggle id={f.id} on={false} text={tr('Cancel')} ghost /></Person>)}</>}
          </div>
          <Link className="card fr-box fr-lounge" href="/lounge"><b>🛠 {tr('Pro Lounge')}</b><span className="mu sm">{tr('Questions, job passes and talk with all verified pros.')}</span></Link>
        </aside>

        {/* right: feed */}
        <main className="fr-main">
          <PostForm friends />
          <nav className="chips">
            <Link className="chip" aria-pressed={tab === 'feed'} href="/friends">{tr('Feed')}</Link>
            <Link className="chip" aria-pressed={tab === 'mine'} href="/friends?tab=mine">{tr('My posts')}</Link>
            <Link className="chip" aria-pressed={tab === 'photos'} href="/friends?tab=photos">🔒 {tr('My photos for friends')} ({privatePhotos.length})</Link>
          </nav>
          {tab === 'photos'
            ? (privatePhotos.length
                ? <div className="fr-photos">{privatePhotos.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /></a>)}</div>
                : <div className="card empty">{tr('No photos for friends yet. Post a photo above and choose “Friends only”: clients will not see it.')}</div>)
            : <div className="list">
                {shown.map((p) => <PostCard key={p.id} p={p} tr={tr} lang={lang} mine={p.pro.id === me.id} meId={me.id} path="/friends" />)}
                {!shown.length && <div className="card empty">{tr('Nothing here yet. Write the first post: your friends will see it.')}</div>}
              </div>}
        </main>
      </div>
    </div></section>
  );
}
