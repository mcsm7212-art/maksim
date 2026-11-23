/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ActionForm from '@/components/ActionForm';
import PhotoPicker from '@/components/PhotoPicker';
import { loungeDelete, loungePost, loungeReply } from '@/app/community/actions';
import { startChat } from '@/app/messages/actions';
import { getMe } from '@/lib/auth';
import { CITIES } from '@/lib/areas';
import { TRADES, type Trade, TRADE_KEYS } from '@/lib/catalog';
import { loungeFeed } from '@/lib/community';
import { getLang, getT } from '@/lib/i18n';
import { isLive } from '@/lib/supabase/config';
import { dateLabel } from '@/lib/time';

export const metadata = { title: 'Pro Lounge' };
export const dynamic = 'force-dynamic';
const KINDS = { talk: 'Talk shop', help: 'Need a hand', handoff: 'Passing a job' } as const;

export default async function Lounge({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const me = await getMe(); const tr = await getT(); const lang = await getLang();
  if (isLive() && !me) redirect('/login?next=/lounge');
  const kind = (await searchParams).kind;
  const ok = !isLive() || me?.pro?.status === 'verified' || me?.role === 'admin';
  const posts = ok ? await loungeFeed(kind) : [];
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">{tr('For verified pros only')}</div>
      <h2>{tr('Pro Lounge')}</h2>
      <p className="mu" style={{ maxWidth: '62ch' }}>{tr('Talk shop with other verified pros, ask for a hand on a big job, or pass a job you cannot take to a colleague you trust. Clients never see this page.')}</p>
      {!ok && <div className="card empty">{me?.pro ? tr('The Lounge opens once your profile is verified.') : <>{tr('The Lounge is for verified pros.')} <Link href="/join">{tr('Join as a pro')}</Link></>}</div>}
      {ok && <>
        {me?.pro && <ActionForm action={loungePost} className="card formcard" style={{ marginBottom: 16 }} okText>
          <b>{tr('New post')}</b>
          <div className="chips">{(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((k, i) => (
            <label key={k} className="chip" style={{ cursor: 'pointer' }}><input type="radio" name="kind" value={k} defaultChecked={i === 0} style={{ marginRight: 6 }} />{tr(KINDS[k])}</label>))}</div>
          <textarea className="inp" name="body" maxLength={1500} required style={{ minHeight: 80 }} placeholder={tr('E.g. “Panel upgrade in Belmont next Tuesday, need a second electrician for half a day.”')} />
          <div className="chips">
            <select className="inp" name="trade" defaultValue="" style={{ width: 'auto' }} aria-label={tr('Trade')}><option value="">{tr('Any trade')}</option>
              {TRADE_KEYS.map((t) => <option key={t} value={t}>{tr(TRADES[t].name)}</option>)}</select>
            <select className="inp" name="city" defaultValue="" style={{ width: 'auto' }} aria-label={tr('City')}><option value="">{tr('City (optional)')}</option>
              {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
          </div>
          <PhotoPicker name="l_photo" prefix="lounge" max={4} label={tr('Add photos')} />
          <span className="mu xs">{tr('No client names or addresses here. Agree on details in private messages.')}</span>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Post')}</button>
        </ActionForm>}
        <div className="chips" style={{ marginBottom: 14 }}>
          <Link className="chip" aria-pressed={!kind} href="/lounge">{tr('All')}</Link>
          {(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((k) => <Link key={k} className="chip" aria-pressed={kind === k} href={`/lounge?kind=${k}`}>{tr(KINDS[k])}</Link>)}
        </div>
        <div className="list">
          {posts.map((p) => (
            <article key={p.id} id={p.id} className="card lpost" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className={`kind ${p.kind}`}>{tr(KINDS[p.kind])}{p.trade ? ` · ${tr(TRADES[p.trade as Trade].name)}` : ''}{p.city ? ` · ${p.city}` : ''}</span>
              <span>{p.slug ? <Link href={`/${p.slug}`}><b>{p.name}</b></Link> : <b>{p.name}</b>} <span className="mu xs">· {dateLabel(p.createdAt, lang)}</span></span>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{p.body}</p>
              {p.photos.length > 0 && <div className={`post-photos n${Math.min(p.photos.length, 4)}`}>{p.photos.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div>}
              <div className="chips">
                {p.slug && p.proId !== me?.id && <form action={startChat}><input type="hidden" name="pro" value={p.slug} /><button className="btn ghost sm">{tr('Message {name}', { name: p.name.split(' ')[0] })}</button></form>}
                {p.proId === me?.id && <form action={loungeDelete}><input type="hidden" name="id" value={p.id} /><button className="btn ghost sm">{tr('Delete')}</button></form>}
              </div>
              <div className="lreplies">
                {p.replies.map((r) => (
                  <div key={r.id} className="cmt"><span>{r.slug ? <Link href={`/${r.slug}`}><b>{r.name}</b></Link> : <b>{r.name}</b>} <span style={{ whiteSpace: 'pre-wrap' }}>{r.body}</span></span>
                    <span className="mu2 xs">{dateLabel(r.createdAt, lang)}{r.proId === me?.id && <form action={loungeDelete} style={{ display: 'inline' }}><input type="hidden" name="reply" value={r.id} /> · <button className="linkbtn">{tr('Delete')}</button></form>}</span></div>
                ))}
                {me?.pro && <ActionForm action={loungeReply} className="cmt-form"><input type="hidden" name="post" value={p.id} />
                  <input className="inp" name="body" maxLength={1000} required placeholder={tr('Reply…')} aria-label={tr('Reply…')} /><button className="btn ghost sm">{tr('Send')}</button></ActionForm>}
              </div>
            </article>
          ))}
          {isLive() && !posts.length && <div className="card empty">{tr('Nothing here yet. Start the conversation.')}</div>}
        </div>
      </>}
    </div></section>
  );
}
