import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';

export const metadata = { title: 'Messages' };
/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Messages() {
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>Messages</h2><p className="mu">Demo mode: chat turns on when the database is connected.</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/messages');
  const sb = await supabaseServer();
  const { data } = await sb.from('conversations')
    .select('id, client_id, last_message_at, pro:pros(display_name, slug), company:companies(name, slug), client:profiles!conversations_client_id_fkey(full_name), messages(body, photo_url, sender_id, created_at)')
    .order('last_message_at', { ascending: false }).limit(50);
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">Chat</div><h2>Messages</h2>
      <div className="list">
        {(data ?? []).map((c: any) => {
          const iAmClient = c.client_id === me.id;
          const title = iAmClient ? (c.pro?.display_name ?? c.company?.name) : `${c.client?.full_name || 'Client'}${c.company ? ` · ${c.company.name}` : ''}`;
          const last = [...(c.messages ?? [])].sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))[0];
          return (
            <Link key={c.id} href={`/messages/${c.id}`} className="card bk" style={{ textDecoration: 'none' }}>
              <span style={{ minWidth: 0 }}><b>{title}</b><br /><span className="mu sm" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last ? `${last.sender_id === me.id ? 'You: ' : ''}${last.body || (last.photo_url ? '📷 Photo' : '')}` : 'No messages yet'}</span></span>
              <span className="mu xs">{dateLabel(c.last_message_at)}</span>
            </Link>
          );
        })}
        {!(data ?? []).length && <div className="card empty">No conversations yet. Open a pro or company page and press “Message”.</div>}
      </div>
    </div></section>
  );
}
