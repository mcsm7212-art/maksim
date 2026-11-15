import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import Thread from './Thread';

export const metadata = { title: 'Chat' };
/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Chat({ params }: { params: Promise<{ id: string }> }) {
  if (!isLive()) redirect('/messages');
  const me = await getMe();
  const { id } = await params;
  if (!me) redirect(`/login?next=/messages/${id}`);
  const sb = await supabaseServer();
  const { data: c } = await sb.from('conversations')
    .select('id, client_id, pro_id, company_id, pro:pros(display_name, slug), company:companies(name, slug), client:profiles!conversations_client_id_fkey(full_name)')
    .eq('id', id).maybeSingle();
  if (!c) notFound();
  const cc = c as any;
  const [{ data: msgs }, { data: bk }] = await Promise.all([
    sb.from('messages').select('id, body, sender_id, created_at, flagged').eq('conversation_id', id).order('created_at').limit(300),
    sb.from('bookings').select('id').eq('client_id', cc.client_id).in('status', ['confirmed', 'on_the_way', 'in_progress', 'done'])
      .or(cc.pro_id ? `pro_id.eq.${cc.pro_id}` : `company_id.eq.${cc.company_id}`).limit(1),
  ]);
  const iAmClient = cc.client_id === me.id;
  const other = iAmClient ? (cc.pro?.display_name ?? `${cc.company?.name} office`) : (cc.client?.full_name || 'Client');
  const link = iAmClient ? (cc.pro ? `/pro/${cc.pro.slug}` : `/company/${cc.company.slug}`) : null;
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/messages">Messages</Link></div>
      <h2 style={{ marginBottom: 4 }}>{other}</h2>
      {link && <p className="sm" style={{ marginTop: 0 }}><Link href={link}>Profile</Link> · <Link href={`/book?${cc.pro ? `pro=${cc.pro.slug}` : `company=${cc.company.slug}`}`}>Book</Link></p>}
      <Thread id={id} booked={(bk ?? []).length > 0}
        messages={(msgs ?? []).map((m: any) => ({ id: m.id, body: m.body, mine: m.sender_id === me.id, at: m.created_at, flagged: m.flagged, who: other }))} />
    </div></section>
  );
}
