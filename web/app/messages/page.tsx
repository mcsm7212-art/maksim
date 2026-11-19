import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';
import { getLang } from '@/lib/i18n';
import { makeT } from '@/lib/i18n-core';

export const metadata = { title: 'Messages' };
/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Messages({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const lang = await getLang(); const tr = makeT(lang);
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('Messages')}</h2><p className="mu">{tr('Demo mode: chat turns on when the database is connected.')}</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/messages');
  const sb = await supabaseServer();
  const { data } = await sb.from('conversations')
    .select('id, client_id, peer_id, last_message_at, pro:pros(display_name, slug), company:companies(name, slug), client:profiles!conversations_client_id_fkey(full_name), messages(body, photo_url, sender_id, created_at)')
    .order('last_message_at', { ascending: false }).limit(50);
  // Chats started by another pro are colleague chats.
  const starters = [...new Set((data ?? []).map((c: any) => c.client_id as string))];
  const { data: proStarters } = starters.length ? await sb.from('pros').select('id').in('id', starters) : { data: [] as { id: string }[] };
  const colleague = new Set((proStarters ?? []).map((p) => p.id));
  // Neighbor chats: show the other person's short public name.
  const peerNames = new Map<string, string>();
  await Promise.all((data ?? []).filter((c: any) => c.peer_id).map(async (c: any) => {
    const other = c.client_id === me.id ? c.peer_id : c.client_id;
    peerNames.set(c.id, ((await sb.rpc('public_name', { uid: other })).data as string) ?? '');
  }));
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">{tr('Chat')}</div><h2>{tr('Messages')}</h2>
      {(await searchParams).sent === 'ask' && <div className="note">✓ {tr('Sent only to the pros you chose. Each answers in their own chat below.')}</div>}
      <div className="list">
        {(data ?? []).map((c: any) => {
          const iAmClient = c.client_id === me.id;
          const title = c.peer_id ? peerNames.get(c.id) : iAmClient ? (c.pro?.display_name ?? c.company?.name) : `${c.client?.full_name || tr('Client')}${c.company ? ` · ${c.company.name}` : ''}`;
          const last = [...(c.messages ?? [])].sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))[0];
          return (
            <Link key={c.id} href={`/messages/${c.id}`} className="card bk" style={{ textDecoration: 'none' }}>
              <span style={{ minWidth: 0 }}><b>{title}</b>{colleague.has(c.client_id) && c.pro && <span className="badge cu" style={{ marginLeft: 8 }}>{tr('Colleague')}</span>}{c.peer_id && <span className="badge n" style={{ marginLeft: 8 }}>{tr('Neighbor')}</span>}<br /><span className="mu sm" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last ? `${last.sender_id === me.id ? `${tr('You')}: ` : ''}${last.body || (last.photo_url ? `📷 ${tr('Photo')}` : '')}` : tr('No messages yet')}</span></span>
              <span className="mu xs">{dateLabel(c.last_message_at, lang)}</span>
            </Link>
          );
        })}
        {!(data ?? []).length && <div className="card empty">{tr('No conversations yet. Open a pro or company page and press “Message”.')}</div>}
      </div>
    </div></section>
  );
}
