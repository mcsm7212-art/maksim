/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import Figure from './Figure';
import { setAccepting, toggleColleague } from '@/app/account/work/actions';
import { setOnline } from '@/app/account/actions';
import GoOnline, { OnlineTracker } from './GoOnline';
import { supabaseServer } from '@/lib/supabase/server';
import { CITIES } from '@/lib/areas';
import { TRADES, tradeLabel, type Trade } from '@/lib/catalog';
import { dateLabel } from '@/lib/time';
import type { T } from '@/lib/i18n-core';

const ago = (iso: string, tr: T) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? tr('{n} min ago', { n: m }) : m < 1440 ? tr('{n} h ago', { n: Math.round(m / 60) }) : tr('{n} d ago', { n: Math.round(m / 1440) });
};
/* eslint-disable @next/next/no-img-element */
const Di = ({ n, size = 44 }: { n: string; size?: number }) => <img className="di" src={`/icons/desk/${n}.webp`} alt="" width={size} height={Math.round(size * 0.69)} loading="lazy" />;
const CALLBACK = '📞 Call-back request';

/**
 * The top of a pro's account: what a pro needs every day. Taking jobs or not, online, messages from clients,
 * call-back requests, how clients reach them, and pro friends. Rare things (license, work photos) live lower or in the profile.
 */
export default async function ProDesk({ me, row, tr, lang, find }: { me: { id: string; pro: { slug: string } }; row: any; tr: T; lang: 'en' | 'es' | 'ru'; find?: string }) {
  const sb = await supabaseServer();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const accepting = row?.accepting !== false || (row?.paused_until && row.paused_until <= today);
  const online = row?.online_until && new Date(row.online_until) > new Date();

  const [{ data: convs }, { data: friends }, { data: found }] = await Promise.all([
    sb.from('conversations').select('id, quiet, last_message_at, client_id, client:profiles!conversations_client_id_fkey(full_name)')
      .eq('pro_id', me.id).is('peer_id', null).order('last_message_at', { ascending: false, nullsFirst: false }).limit(30),
    sb.from('pro_contacts').select('colleague:pros!pro_contacts_colleague_id_fkey(id, slug, display_name, trade, custom_trade, photo_url, accent, online_until)').eq('pro_id', me.id).order('created_at').limit(12),
    find && find.trim().length >= 2
      ? sb.from('pros').select('id, slug, display_name, trade, custom_trade, photo_url, accent, area').eq('status', 'verified').eq('is_demo', false).neq('id', me.id).ilike('display_name', `%${find.trim().replace(/[%_]/g, '')}%`).limit(8)
      : Promise.resolve({ data: null as any[] | null }),
  ]);
  const ids = (convs ?? []).map((c: any) => c.id);
  // Unread chats: notifications about a chat that were not opened yet.
  const { data: un } = await sb.from('notifications').select('link').eq('user_id', me.id).is('read_at', null).like('link', '/messages/%').limit(200);
  const unread = new Map<string, number>(); (un ?? []).forEach((n: any) => { const k = String(n.link).slice(10); unread.set(k, (unread.get(k) ?? 0) + 1); });
  // Chats started by another pro are friend chats: they do not belong in "Messages from clients".
  const starters = [...new Set((convs ?? []).map((c: any) => c.client_id as string))];
  const { data: proStarters } = starters.length ? await sb.from('pros').select('id').in('id', starters) : { data: [] as { id: string }[] };
  const isPro = new Set((proStarters ?? []).map((x) => x.id));
  const clientConvs = (convs ?? []).filter((c: any) => !isPro.has(c.client_id));
  const clientIds = new Set(clientConvs.map((c: any) => c.id));
  // New from friends: unread chats that are not client chats, and "added you as a colleague".
  const { data: addedMe } = await sb.from('notifications').select('id').eq('user_id', me.id).is('read_at', null).like('body', '%added you as a colleague.').limit(20);
  const friendNews = [...unread.keys()].filter((k) => !clientIds.has(k)).length + (addedMe ?? []).length;
  const sorted = [...clientConvs].sort((a: any, b: any) => Number(unread.has(b.id)) - Number(unread.has(a.id)));
  const newChats = sorted.filter((c: any) => unread.has(c.id)).length;
  const { data: msgs } = ids.length ? await sb.from('messages').select('conversation_id, body, sender_id, created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(200) : { data: [] as any[] };
  const lastOf = (id: string) => (msgs ?? []).find((m: any) => m.conversation_id === id);
  const calls = (msgs ?? []).filter((m: any) => m.sender_id !== me.id && String(m.body).startsWith(CALLBACK)).slice(0, 4);
  const newCalls = calls.some((m: any) => unread.has(m.conversation_id));
  const field = (body: string, k: string) => body.split('\n').find((l) => l.startsWith(k + ':'))?.slice(k.length + 1).trim() ?? '';
  const nameOf = (c: any) => c?.client?.full_name || tr('Client');
  const friendIds = new Set((friends ?? []).map((f: any) => f.colleague?.id).filter(Boolean));

  return (
    <div className="desk">
      {/* 1) taking jobs + online + my page */}
      <div className={`card desk-top ${accepting ? 'on' : 'off'}`}>
        <div className="desk-acc"><Di n="accepting" size={64} />
          <span className="desk-acc-t"><b className="desk-state">{accepting ? `● ${tr('I take new jobs')}` : `⏸ ${tr('I do not take new jobs')}`}</b>
          <span className="mu xs">{accepting
            ? tr('Clients can book you and write to you.')
            : row?.paused_until ? tr('Until {date}. New clients see a warning and their messages come without a notification; your clients write as usual.', { date: dateLabel(row.paused_until + 'T12:00:00', lang) })
              : tr('New clients see a warning and their messages come without a notification; your clients write as usual.')}</span></span>
        </div>
        {accepting
          ? <form action={setAccepting}><input type="hidden" name="take" value="0" /><button className="btn ghost">⏸ {tr('Stop taking jobs')}</button></form>
          : <form action={setAccepting}><input type="hidden" name="take" value="1" /><button className="btn">▶ {tr('Take jobs')}</button></form>}
        <div className="desk-row">
          {online
            ? <form action={setOnline}><input type="hidden" name="hours" value={0} /><button className="btn ghost sm online-btn"><i className="dot-live" aria-hidden />{row?.online_area ? tr('Online in {city}', { city: row.online_area }) : tr('Online')}{row?.online_radius_mi ? ` · ${row.online_radius_mi} mi` : ''}{row?.online_live ? ' · 🚐' : ''} · {tr('go offline')}</button></form>
            : <GoOnline city={row?.online_area ?? row?.area ?? ''} radius={Number(row?.service_radius_mi ?? 10)} />}
          {online && row?.online_live && <OnlineTracker />}
          <Link className="btn ghost sm" href={`/pro/${me.pro.slug}`}>👁 {tr('My page as clients see it')}</Link>
          <Link className="btn ghost sm" href="/account/profile">✎ {tr('Edit profile')}</Link>
          <Link className="btn ghost sm" href="/account/work">⚙ {tr('Settings')}</Link>
        </div>
      </div>

      <div className="desk-grid">
        {/* 2) messages from clients */}
        <div className={`card desk-card${newChats > 0 ? ' pulse-green' : ''}`}>
          <Link className="card-link" href="/messages" aria-label={tr('Messages from clients')} />
          <div className="desk-h"><b><Di n="messages" />{tr('Messages from clients')}{newChats > 0 && <span className="badge ok" style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>{tr('{n} new', { n: newChats })}</span>}</b><Link className="xs" href="/messages">{tr('All messages')} →</Link></div>
          {sorted.slice(0, 6).map((c: any) => { const m = lastOf(c.id); return (
            <Link key={c.id} className={`desk-msg${unread.has(c.id) ? ' new' : ''}`} href={`/messages/${c.id}`}>
              <span>{unread.has(c.id) && <i className="dot-new" aria-label={tr('New')} />}<b>{nameOf(c)}</b>{c.quiet && <span className="badge n" title={tr('Wrote while you were not taking jobs')}>🔕 {tr('while paused')}</span>}
                <br /><span className="mu xs">{m ? (String(m.body).startsWith(CALLBACK) ? `📞 ${tr('Call-back request')}` : `${m.sender_id === me.id ? tr('You') + ': ' : ''}${String(m.body).slice(0, 70)}`) : tr('No messages yet')}</span></span>
              {m && (m.sender_id !== me.id && Date.now() - new Date(m.created_at).getTime() > 36e5
                ? <small className="wait-badge" title={tr('Clients see how fast you usually reply. Answer to keep your time short.')}>⏰ {tr('waits')} {ago(m.created_at, tr)}</small>
                : <small className="mu">{ago(m.created_at, tr)}</small>)}
            </Link>); })}
          {!(convs ?? []).length && <span className="mu sm">{tr('No messages yet. Clients write to you from your page.')}</span>}
        </div>

        {/* 3) call-back requests */}
        <div className={`card desk-card${newCalls ? ' pulse-green' : ''}`}>
          <Link className="card-link" href="/messages" aria-label={tr('Call-back requests')} />
          <div className="desk-h"><b><Di n="callback" />{tr('Call-back requests')}{newCalls && <span className="badge ok" style={{ marginLeft: 8 }}>{tr('New')}</span>}</b></div>
          {calls.map((m: any) => { const c = (convs ?? []).find((x: any) => x.id === m.conversation_id); const fresh = unread.has(m.conversation_id); const ph = field(m.body, 'Phone'); return (
            <div key={m.conversation_id + m.created_at} className={`desk-msg${fresh ? ' new' : ''}`}>
              <span><b>{nameOf(c)}</b> · <a href={`tel:${ph.replace(/[^\d+]/g, '')}`}>{ph}</a><br /><span className="mu xs">{field(m.body, 'When')}{field(m.body, 'Problem') ? ` · ${field(m.body, 'Problem').slice(0, 60)}` : ''}</span></span>
              <Link className="xs" href={`/messages/${m.conversation_id}`}>{tr('Chat')} →</Link>
            </div>); })}
          {!calls.length && <span className="mu sm">{tr('No call-back requests yet.')}</span>}
        </div>

        {/* 4) how clients reach me */}
        <div className="card desk-card">
          <Link className="card-link" href="/account/work" aria-label={tr('How clients reach you')} />
          <div className="desk-h"><b><Di n="profile" />{tr('How clients reach you')}</b><Link className="xs" href="/account/work">{tr('Change')} →</Link></div>
          <span className="sm">{row?.public_phone ? <>📞 {tr('Phone on your page')}: <b>{row.public_phone}</b></> : row?.call_from === 'clients' ? <>🔒 {tr('Your phone is shown only to your clients.')}</> : <>📵 {tr('Your phone is not shown. Clients write to you or ask for a call back.')}</>}</span>
          <span className="sm">💬 {tr('Clients can always write to you in the chat.')}</span>
        </div>

        {/* 5) pro friends */}
        <div className="card desk-card">
          <Link className="card-link" href="/friends" aria-label={tr('My pro friends')} />
          <div className="desk-h"><b><Di n="friends" />{tr('My pro friends')}{friendNews > 0 && <Link href="/friends" className="friend-news" title={tr('New from your pro friends')}><i className="dot-live" aria-hidden /> {friendNews}</Link>}</b><Link className="xs" href="/lounge">{tr('Pro Lounge')} →</Link></div>
          <div className="desk-friends">
            {(friends ?? []).filter((f: any) => f.colleague).map((f: any) => { const c = f.colleague; const on = c.online_until && new Date(c.online_until) > new Date(); return (
              <Link key={c.id} href={`/${c.slug}`} className="desk-friend" title={c.display_name}>
                <span className="post-ava"><Figure name={c.display_name} accent={c.accent ?? '#B57A50'} photo={c.photo_url} /></span>
                <span className="xs">{on && <i className="dot-on" aria-label={tr('Online')} />}{c.display_name.split(' ')[0]}</span>
              </Link>); })}
            {!(friends ?? []).length && <span className="mu sm">{tr('No friends yet. Find a pro below and add them.')}</span>}
          </div>
          <form className="chips" action="/friends" method="get">
            <input className="inp" name="find" defaultValue={find ?? ''} placeholder={tr('Find a pro by name')} aria-label={tr('Find a pro by name')} style={{ flex: '1 1 160px' }} />
            <button className="btn ghost sm">{tr('Find')}</button>
          </form>
          {found && <div className="list" style={{ gap: 6 }}>
            {found.map((p: any) => (
              <div key={p.id} className="desk-msg">
                <span><Link href={`/${p.slug}`}><b>{p.display_name}</b></Link><br /><span className="mu xs">{tr(tradeLabel({ trade: p.trade as Trade, customTrade: p.custom_trade }) || TRADES.plumbing.name)}{p.area ? ` · ${p.area}` : ''}</span></span>
                {friendIds.has(p.id) ? <span className="mu xs">✓ {tr('Friend')}</span>
                  : <form action={toggleColleague}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="on" value="1" /><input type="hidden" name="path" value="/account" /><button className="btn sm">+ {tr('Add')}</button></form>}
              </div>))}
            {!found.length && <span className="mu sm">{tr('Nobody found by that name.')}</span>}
          </div>}
        </div>
      </div>
    </div>
  );
}
