/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Figure from '@/components/Figure';
import PostCard from '@/components/PostCard';
import PostForm from '@/components/PostForm';
import { startChat } from '@/app/messages/actions';
import { addHelper, addTip, deleteTip, removeHelper, saveHelperNote, voteTip } from './actions';
import { setColleagueChat, toggleColleague } from '@/app/account/work/actions';
import { getMe } from '@/lib/auth';
import { tradeLabel, type Trade } from '@/lib/catalog';
import { getLang, getT } from '@/lib/i18n';
import { friendsFeed, myFriends, type Friend } from '@/lib/social';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'My pro friends', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** The pro's own corner: avatar, friends (who is online), friend requests, a feed and photos that only friends see. */
export default async function Friends({ searchParams }: { searchParams: Promise<{ find?: string; tab?: string; v?: string; err?: string }> }) {
  const tr = await getT(); const lang = await getLang();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('My pro friends')}</h2><p className="mu">{tr('Demo mode.')}</p></div></section>;
  const me = await getMe(); if (!me) redirect('/login?next=/friends');
  if (!me.pro) redirect('/join/pro');
  const sp = await searchParams; const sb = await supabaseServer();
  const [{ data: row }, all] = await Promise.all([
    sb.from('pros').select('display_name, trade, custom_trade, photo_url, accent, area, online_until, colleague_chat').eq('id', me.id).single(),
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
  type Tab = 'feed' | 'friends' | 'helpers' | 'stores' | 'tools';
  const tab: Tab = (['friends', 'helpers', 'stores', 'tools'] as const).find((x) => x === sp.tab) ?? 'feed';
  const view = sp.tab === 'photos' || sp.v === 'photos' ? 'photos' : sp.tab === 'mine' || sp.v === 'mine' ? 'mine' : 'feed';
  const shown = view === 'mine' ? mine : posts;

  // Pros I need: my private list (any trade), with my note
  const { data: hRows } = await sb.from('pro_helpers').select('helper_id, note, created_at').order('created_at');
  const hIds = (hRows ?? []).map((h) => h.helper_id);
  const { data: hPros } = hIds.length ? await sb.from('pros').select('id, slug, display_name, trade, custom_trade, photo_url, accent, area, online_until').in('id', hIds) : { data: [] as any[] };
  const helpers = (hRows ?? []).flatMap((h) => { const p = (hPros ?? []).find((x: any) => x.id === h.helper_id); return p ? [{ note: h.note as string, f: { id: p.id, slug: p.slug, name: p.display_name, trade: p.trade, customTrade: p.custom_trade, photoUrl: p.photo_url, accent: p.accent ?? '#B57A50', area: p.area, online: Boolean(p.online_until && new Date(p.online_until) > new Date()), kind: 'outgoing' } as Friend }] : []; });
  const helperSet = new Set(hIds);
  const byTrade = new Map<string, typeof helpers>();
  for (const h of helpers) { const k = label(h.f); byTrade.set(k, [...(byTrade.get(k) ?? []), h]); }

  // Stores and tools: advice from pros of my trade, best first
  const kind = tab === 'tools' ? 'tool' : 'store';
  const verified = me.pro.status === 'verified';
  const { data: tipRows } = tab === 'stores' || tab === 'tools'
    ? await sb.from('pro_tips').select('id, pro_id, name, place, note, url, created_at, pros!pro_tips_pro_id_fkey(display_name, slug), pro_tip_votes(user_id)').eq('kind', kind).limit(200)
    : { data: null as any[] | null };
  const tips = (tipRows ?? []).map((x: any) => ({ ...x, votes: (x.pro_tip_votes ?? []).length as number, voted: (x.pro_tip_votes ?? []).some((v: any) => v.user_id === me.id), by: Array.isArray(x.pros) ? x.pros[0] : x.pros }))
    .sort((a, b) => b.votes - a.votes || (a.created_at < b.created_at ? 1 : -1));
  const myTrade = label({ trade: row?.trade ?? 'plumbing', customTrade: row?.custom_trade });
  const ERR: Record<string, string> = {
    name: 'Write the name.', words: 'Please remove rude or offensive words. Clients see this text.', english: 'Write in English (Latin letters), please.',
    url: 'The link looks wrong. Copy it from the address bar.', limit: 'You have reached the limit of 40 tips.', verified: 'Tips open once your profile is verified.', save: 'Could not save. Try again.',
  };

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
          <div className="eyebrow">🛠 {tr('Pro Lounge')}</div>
          <h2 style={{ margin: '2px 0' }}>{row?.display_name ?? me.name}</h2>
          <span className="mu sm">{label({ trade: row?.trade ?? 'plumbing', customTrade: row?.custom_trade })}{row?.area ? ` · ${row.area}` : ''}</span>
          <div className="fr-stats"><span><b>{friends.length}</b> {tr('friends')}</span><span><b>{mine.length}</b> {tr('posts')}</span><span><b>{privatePhotos.length}</b> {tr('photos for friends')}</span></div>
        </div>
        <span className="chips fr-me-btn"><Link className="btn ghost sm" href={`/pro/${me.pro.slug}`}>👁 {tr('My page as clients see it')}</Link><Link className="btn ghost sm" href="/account">{tr('My account')}</Link></span>
      </header>

      <nav className="fr-tabs">
        <Link aria-current={tab === 'feed' ? 'page' : undefined} href="/friends">📰 {tr('Feed')}</Link>
        <Link aria-current={tab === 'friends' ? 'page' : undefined} href="/friends?tab=friends" className={incoming.length ? 'pulse-green' : undefined}>🤝 {tr('Friends')} <span className="mu">{friends.length}</span>{incoming.length > 0 && <span className="badge ok">+{incoming.length}</span>}</Link>
        <Link aria-current={tab === 'helpers' ? 'page' : undefined} href="/friends?tab=helpers">🧰 {tr('Pros I need')} <span className="mu">{helpers.length}</span></Link>
        <Link aria-current={tab === 'stores' ? 'page' : undefined} href="/friends?tab=stores">🏪 {tr('Stores')}</Link>
        <Link aria-current={tab === 'tools' ? 'page' : undefined} href="/friends?tab=tools">🔧 {tr('Tools')}</Link>
        <Link href="/lounge" title={tr('Questions, job passes and talk with all verified pros.')}>💬 {tr('All pros')}</Link>
      </nav>

      {tab === 'feed' && <div className="fr-grid">
        <aside className="fr-side">
          <div className="card fr-box">
            <b><Link href="/friends?tab=friends">{tr('Friends')}</Link> <span className="mu sm">({friends.length})</span></b>
            {friends.slice(0, 8).map((f) => <Person key={f.id} f={f}>
              <form action={startChat}><input type="hidden" name="pro" value={f.slug} /><button className="btn ghost sm" title={tr('Message')}>💬</button></form>
            </Person>)}
            {!friends.length && <span className="mu sm">{tr('No friends yet.')}</span>}
            <Link className="xs" href="/friends?tab=friends">{tr(friends.length > 8 ? 'All friends' : 'Find and add friends')} →</Link>
          </div>
        </aside>
        {/* right: feed */}
        <main className="fr-main">
          <PostForm friends />
          <nav className="chips">
            <Link className="chip" aria-pressed={view === 'feed'} href="/friends">{tr('All posts')}</Link>
            <Link className="chip" aria-pressed={view === 'mine'} href="/friends?v=mine">{tr('My posts')}</Link>
            <Link className="chip" aria-pressed={view === 'photos'} href="/friends?v=photos">🔒 {tr('My photos for friends')} ({privatePhotos.length})</Link>
          </nav>
          {view === 'photos'
            ? (privatePhotos.length
                ? <div className="fr-photos">{privatePhotos.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /></a>)}</div>
                : <div className="card empty">{tr('No photos for friends yet. Post a photo above and choose “Friends only”: clients will not see it.')}</div>)
            : <div className="list">
                {shown.map((p) => <PostCard key={p.id} p={p} tr={tr} lang={lang} mine={p.pro.id === me.id} meId={me.id} path="/friends" />)}
                {!shown.length && <div className="card empty">{tr('Nothing here yet. Write the first post: your friends will see it.')}</div>}
              </div>}
        </main>
      </div>}

      {tab === 'friends' && <div className="fr-cols">

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
            <form className="chips" action="/friends" method="get">{tab === 'friends' && <input type="hidden" name="tab" value="friends" />}<input className="inp" name="find" defaultValue={find} placeholder={tr('Find a pro by name')} aria-label={tr('Find a pro by name')} style={{ flex: '1 1 140px' }} /><button className="btn ghost sm">{tr('Find')}</button></form>
            {found?.map((p: any) => { const k = known.get(p.id); return (
              <Person key={p.id} f={{ id: p.id, slug: p.slug, name: p.display_name, trade: p.trade, customTrade: p.custom_trade, photoUrl: p.photo_url, accent: p.accent ?? '#B57A50', area: p.area, online: false, kind: 'outgoing' }}>
                {k === 'friend' ? <span className="mu xs">✓ {tr('Friend')}</span> : k === 'outgoing' ? <span className="mu xs">{tr('Request sent')}</span> : <Toggle id={p.id} on text={k === 'incoming' ? `✓ ${tr('Add back')}` : `+ ${tr('Add')}`} />}
              </Person>); })}
            {found && !found.length && <span className="mu sm">{tr('Nobody found by that name.')}</span>}
            {outgoing.length > 0 && <><span className="mu xs">{tr('Waiting for an answer')}:</span>
              {outgoing.map((f) => <Person key={f.id} f={f}><Toggle id={f.id} on={false} text={tr('Cancel')} ghost /></Person>)}</>}
          </div>
          <form action={setColleagueChat} className="card fr-box">
            <b>✉ {tr('Messages from other pros')}</b>
            {([['all', 'Any verified pro can message me'], ['contacts', 'Only colleagues from my list'], ['off', 'Nobody: colleague chat is off']] as const).map(([v, l]) => (
              <label key={v} className="sm" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="radio" name="mode" value={v} defaultChecked={(row?.colleague_chat ?? 'all') === v} /> {tr(l)}</label>))}
            <span className="mu xs">{tr('Clients can always message you. Turning this off also stops replies in old chats with colleagues.')}</span>
            <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Save')}</button>
          </form>
      </div>}

      {tab === 'helpers' && <div className="fr-main">
        <div className="card fr-box">
          <b>🧰 {tr('Pros I need')}</b>
          <span className="mu sm">{tr('Your private list of pros from other trades: an electrician, a tile setter, a roofer you trust. Keep them here so you never lose them. Only you see this list, and the pro does not have to add you back.')}</span>
          <form className="chips" action="/friends" method="get"><input type="hidden" name="tab" value="helpers" /><input className="inp" name="find" defaultValue={find} placeholder={tr('Find a pro by name')} aria-label={tr('Find a pro by name')} style={{ flex: '1 1 200px' }} /><button className="btn ghost sm">{tr('Find')}</button></form>
          {found?.map((p: any) => (
            <Person key={p.id} f={{ id: p.id, slug: p.slug, name: p.display_name, trade: p.trade, customTrade: p.custom_trade, photoUrl: p.photo_url, accent: p.accent ?? '#B57A50', area: p.area, online: false, kind: 'outgoing' }}>
              {helperSet.has(p.id) ? <span className="mu xs">✓ {tr('In your list')}</span> : <form action={addHelper}><input type="hidden" name="id" value={p.id} /><button className="btn sm">+ {tr('Add to my list')}</button></form>}
            </Person>))}
          {found && !found.length && <span className="mu sm">{tr('Nobody found by that name.')}</span>}
        </div>
        {[...byTrade.entries()].map(([k, list]) => (
          <div key={k} className="card fr-box">
            <b>{k} <span className="mu sm">({list.length})</span></b>
            {list.map(({ f, note }) => (
              <div key={f.id} className="fr-helper">
                <Person f={f}>
                  <form action={startChat}><input type="hidden" name="pro" value={f.slug} /><button className="btn ghost sm" title={tr('Message')}>💬 {tr('Message')}</button></form>
                  <form action={removeHelper}><input type="hidden" name="id" value={f.id} /><button className="btn ghost sm" title={tr('Remove from my list')} aria-label={tr('Remove from my list')}>✕</button></form>
                </Person>
                <form action={saveHelperNote} className="fr-note"><input type="hidden" name="id" value={f.id} /><input className="inp" name="note" defaultValue={note} maxLength={200} placeholder={tr('My note: e.g. good with panels, call after 5pm')} aria-label={tr('My note')} /><button className="btn ghost sm">{tr('Save')}</button></form>
              </div>))}
          </div>))}
        {!helpers.length && <div className="card empty">{tr('Your list is empty. Find a pro by name above and add them.')}</div>}
      </div>}

      {(tab === 'stores' || tab === 'tools') && <div className="fr-main">
        <div className="card fr-box">
          <b>{tab === 'stores' ? '🏪' : '🔧'} {tr(tab === 'stores' ? 'Useful stores' : 'Useful tools')} · {myTrade}</b>
          <span className="mu sm">{tr(tab === 'stores'
            ? 'Stores that pros of your trade recommend, with their advice. Only pros of your trade see this list and vote, so the rating is from people who do the same work.'
            : 'Tools that pros of your trade recommend, with their advice. Only pros of your trade see this list and vote, so the rating is from people who do the same work.')}</span>
          {sp.err && ERR[sp.err] && <span className="err sm">⚠ {tr(ERR[sp.err])}</span>}
          {verified
            ? <details className="fr-add" open={Boolean(sp.err)}>
                <summary className="add-own"><i aria-hidden>+</i><b>{tr(tab === 'stores' ? 'Add a store' : 'Add a tool')}</b></summary>
                <form action={addTip} className="fr-tipform">
                  <input type="hidden" name="kind" value={kind} />
                  <input className="inp" name="name" required minLength={2} maxLength={80} placeholder={tr(tab === 'stores' ? 'Store name, e.g. Ferguson Plumbing Supply' : 'Tool, e.g. Milwaukee M18 press tool')} aria-label={tr('Name')} />
                  <input className="inp" name="place" maxLength={60} placeholder={tr(tab === 'stores' ? 'City or area' : 'Where to buy')} aria-label={tr(tab === 'stores' ? 'City or area' : 'Where to buy')} />
                  <textarea className="inp" name="note" maxLength={300} rows={2} placeholder={tr('Your advice in English: why it is good, what to know')} aria-label={tr('Your advice')} />
                  <input className="inp" name="url" maxLength={300} placeholder={tr('Link (optional)')} aria-label={tr('Link (optional)')} />
                  <button className="btn sm">{tr('Share with my trade')}</button>
                </form>
              </details>
            : <span className="mu sm">🔒 {tr('Tips open once your profile is verified.')}</span>}
        </div>
        {tips.map((x, i) => (
          <div key={x.id} className="card fr-tip">
            <span className="fr-rank">{i + 1}</span>
            <div className="fr-tip-t">
              <b>{x.name}</b>{x.place && <span className="mu sm"> · {x.place}</span>}
              {x.note && <p>{x.note}</p>}
              <span className="mu xs">{tr('Advice from')} {x.by?.slug ? <Link href={`/${x.by.slug}`}>{x.by.display_name}</Link> : '—'}{x.url && <> · <a href={x.url} target="_blank" rel="noreferrer nofollow">{tr('Open the site')} ↗</a></>}</span>
            </div>
            <span className="chips">
              {x.pro_id === me.id
                ? <><span className="fr-votes" title={tr('Votes from pros of your trade')}>👍 {x.votes}</span><form action={deleteTip}><input type="hidden" name="id" value={x.id} /><button className="btn ghost sm" title={tr('Remove')} aria-label={tr('Remove')}>✕</button></form></>
                : <form action={voteTip}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="on" value={x.voted ? '0' : '1'} /><button className={`btn sm${x.voted ? '' : ' ghost'}`} aria-pressed={x.voted} title={tr(x.voted ? 'Take my vote back' : 'I recommend it too')}>👍 {x.votes}</button></form>}
            </span>
          </div>))}
        {verified && !tips.length && <div className="card empty">{tr(tab === 'stores' ? 'No stores yet. Be the first: share a store you trust with pros of your trade.' : 'No tools yet. Be the first: share a tool you trust with pros of your trade.')}</div>}
      </div>}
    </div></section>
  );
}
