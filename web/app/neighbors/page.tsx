import Link from 'next/link';
import { redirect } from 'next/navigation';
import ActionForm from '@/components/ActionForm';
import { blockNeighbor, messageNeighbor, saveNeighbor, unblockNeighbor } from './actions';
import { getMe } from '@/lib/auth';
import { CITIES } from '@/lib/areas';
import { TRADES, type Trade } from '@/lib/catalog';
import { getT } from '@/lib/i18n';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'Neighbors' };
export const dynamic = 'force-dynamic';
const SCOPES = [['street', 'My street', 'Only people on the same street in my city'], ['city', 'My city', 'Everyone in my city who opted in'], ['bayarea', 'Whole Bay Area', 'From San Francisco to San Jose']] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Neighbors({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const tr = await getT();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('Neighbors')}</h2><p className="mu">{tr('Demo mode: nothing was saved. Connect the database to accept real sign-ups.')}</p></div></section>;
  const me = await getMe(); if (!me) redirect('/login?next=/neighbors');
  const sb = await supabaseServer(); const sp = await searchParams;
  const [{ data: st }, { data: list }, { data: blocked }] = await Promise.all([
    sb.from('neighbor_settings').select('*').eq('user_id', me.id).maybeSingle(),
    sb.rpc('my_neighbors', { lim: 60 }),
    sb.from('neighbor_blocks').select('blocked_id').eq('user_id', me.id),
  ]);
  const s: any = st ?? { open: false, scope: 'city', interests: [] };
  const names = (blocked ?? []).length ? (await Promise.all((blocked ?? []).map(async (b: any) => ({ id: b.blocked_id, name: (await sb.rpc('public_name', { uid: b.blocked_id })).data as string })))) : [];
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">{tr('Only if you want it')}</div>
      <h2>{tr('Neighbors')}</h2>
      <p className="mu" style={{ maxWidth: '62ch' }}>{tr('Swap tips with neighbors: who fixed their water heater, which electrician they trust, who is remodeling too. Off by default. You choose how far and with whom; your full name, address and house number are never shown.')}</p>
      {sp.err === 'closed' && <p className="err">{tr('This neighbor is no longer available for chat.')}</p>}

      <ActionForm action={saveNeighbor} className="card formcard" style={{ marginBottom: 20 }} okText>
        <label className="sm" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" name="open" value="1" defaultChecked={s.open} /> <b>{tr('I am open to chat with neighbors')}</b></label>
        <div className="chips">
          <select className="inp" name="city" defaultValue={s.city ?? ''} style={{ width: 'auto' }} aria-label={tr('City')}><option value="">{tr('My city')}…</option>
            {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
          <input className="inp" name="street" defaultValue={s.street ?? ''} maxLength={80} placeholder={tr('Street name, no house number (e.g. Elm St)')} style={{ flex: 1, minWidth: 200 }} aria-label={tr('Street')} />
        </div>
        <b className="sm">{tr('Who can find me')}</b>
        <div className="list" style={{ gap: 6 }}>{SCOPES.map(([v, a, b]) => (
          <label key={v} className="sm" style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}><input type="radio" name="scope" value={v} defaultChecked={s.scope === v} /> <span><b>{tr(a)}</b> <span className="mu">· {tr(b)}</span></span></label>))}</div>
        <b className="sm">{tr('Interests (optional)')}</b>
        <span className="mu xs">{tr('Pick what you care about to meet only neighbors with the same interests. Leave empty to meet everyone in your circle.')}</span>
        <div className="chips">{(Object.keys(TRADES) as Trade[]).map((t) => (
          <label key={t} className="chip" style={{ cursor: 'pointer' }}><input type="checkbox" name="interest" value={t} defaultChecked={(s.interests ?? []).includes(t)} style={{ marginRight: 6 }} />{tr(TRADES[t].name)}</label>))}</div>
        <input className="inp" name="about" defaultValue={s.about ?? ''} maxLength={200} placeholder={tr('A few words, e.g. “Remodeling our 1950s kitchen, happy to share contractor tips.”')} aria-label={tr('About me')} />
        <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Save')}</button>
      </ActionForm>

      {s.open && <>
        <h3>{tr('Neighbors you can talk to')} <span className="mu sm">({(list ?? []).length})</span></h3>
        <div className="list">
          {(list ?? []).map((n: any) => (
            <div key={n.user_id} className="card bk">
              <span style={{ minWidth: 0 }}><b>{n.name}</b> <span className="mu xs">· {n.street ? `${n.street}, ` : ''}{n.city}</span>
                {(n.interests ?? []).length > 0 && <><br /><span className="chips" style={{ marginTop: 4 }}>{n.interests.map((t: string) => <span key={t} className="badge n">{tr(TRADES[t as Trade]?.name ?? t)}</span>)}</span></>}
                {n.about && <><br /><span className="sm">{n.about}</span></>}</span>
              <span className="chips">
                <form action={messageNeighbor}><input type="hidden" name="id" value={n.user_id} /><button className="btn sm">{tr('Message')}</button></form>
                <form action={blockNeighbor}><input type="hidden" name="id" value={n.user_id} /><button className="btn ghost sm" title={tr('They will not see you or be able to message you.')}>{tr('Block')}</button></form>
              </span>
            </div>))}
          {!(list ?? []).length && <div className="card empty">{tr('No neighbors match yet. Try a wider circle, or fewer interests. New neighbors appear here as they join.')}</div>}
        </div>
      </>}
      {names.length > 0 && <><h3 style={{ marginTop: 22 }}>{tr('Blocked')}</h3>
        <div className="list">{names.map((b) => <div key={b.id} className="card bk"><span>{b.name}</span><form action={unblockNeighbor}><input type="hidden" name="id" value={b.id} /><button className="btn ghost sm">{tr('Unblock')}</button></form></div>)}</div></>}
      <p className="mu xs" style={{ marginTop: 18 }}>{tr('Never share your house number or send money to people you have not met. Pros on NovaFides are verified; neighbors are not.')} <Link href="/rules">{tr('Rules & reviews policy')}</Link></p>
    </div></section>
  );
}
