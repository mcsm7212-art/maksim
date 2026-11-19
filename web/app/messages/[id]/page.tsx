import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import Thread from './Thread';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'Chat' };
/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Chat({ params }: { params: Promise<{ id: string }> }) {
  if (!isLive()) redirect('/messages');
  const me = await getMe();
  const { id } = await params;
  if (!me) redirect(`/login?next=/messages/${id}`);
  const sb = await supabaseServer();
  const { data: c } = await sb.from('conversations')
    .select('id, client_id, pro_id, company_id, peer_id, pro:pros(display_name, slug), company:companies(name, slug), client:profiles!conversations_client_id_fkey(full_name)')
    .eq('id', id).maybeSingle();
  if (!c) notFound();
  const cc = c as any;
  const [{ data: msgs }, { data: bk }] = await Promise.all([
    sb.from('messages').select('id, body, photo_url, sender_id, created_at, flagged').eq('conversation_id', id).order('created_at').limit(300),
    sb.from('bookings').select('id').eq('client_id', cc.client_id).in('status', ['confirmed', 'on_the_way', 'in_progress', 'done'])
      .or(cc.pro_id ? `pro_id.eq.${cc.pro_id}` : `company_id.eq.${cc.company_id}`).limit(1),
  ]);
  const iAmClient = cc.client_id === me.id; const tr = await getT();
  const peerName = cc.peer_id ? ((await sb.rpc('public_name', { uid: iAmClient ? cc.peer_id : cc.client_id })).data as string) : null;
  const other = peerName ? peerName : iAmClient ? (cc.pro?.display_name ?? tr('{name} office', { name: cc.company?.name })) : (cc.client?.full_name || tr('Client'));
  const link = cc.peer_id ? null : iAmClient ? (cc.pro ? `/pro/${cc.pro.slug}` : `/company/${cc.company.slug}`) : null;
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/messages">{tr('Messages')}</Link></div>
      <h2 style={{ marginBottom: 4 }}>{other}</h2>
      {link && <p className="sm" style={{ marginTop: 0 }}><Link href={link}>{tr('Profile')}</Link> · <Link href={`/book?${cc.pro ? `pro=${cc.pro.slug}` : `company=${cc.company.slug}`}`}>{tr('Book')}</Link></p>}
      {cc.peer_id && <p className="mu xs" style={{ marginTop: 0 }}>{tr('Neighbor chat.')} <Link href="/neighbors">{tr('Neighbors')}</Link></p>}
      <Thread id={id} booked={(bk ?? []).length > 0 || Boolean(cc.peer_id)}
        messages={(msgs ?? []).map((m: any) => ({ id: m.id, body: m.body, photo: m.photo_url, mine: m.sender_id === me.id, at: m.created_at, flagged: m.flagged, who: other }))} />
    </div></section>
  );
}
