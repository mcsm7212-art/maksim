import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { serviceById } from '@/lib/catalog';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';
import { ReplyForm, ReportForm } from './ReviewTools';

export const metadata = { title: 'My reviews' };
/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function MyReviews() {
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>My reviews</h2><p className="mu">Demo mode.</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/account/reviews');
  if (!me.pro) redirect('/account');
  const sb = await supabaseServer();
  const { data: reviews } = await sb.from('reviews').select('*, review_replies(body, created_at)').eq('pro_id', me.id).order('created_at', { ascending: false });
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/account">My account</Link> · Reviews</div><h2>Reviews about you</h2>
      <p className="mu sm">A review appears after you rate the client too, or 14 days after the job. You can reply once, up to 600 characters. Honest negative reviews are never removed; a calm, short reply helps more than an argument.</p>
      <div className="list">
        {(reviews ?? []).map((r: any) => {
          const avg = (r.punctuality + r.workmanship + r.cleanliness + r.communication + r.pricing) / 5;
          const reply = Array.isArray(r.review_replies) ? r.review_replies[0] : r.review_replies;
          return (
            <div key={r.id} className="card formcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><b>{r.author_name}</b><span className="stars">{'★'.repeat(Math.round(avg))}<span className="mu2">{'★'.repeat(5 - Math.round(avg))}</span></span></div>
              <div className="mu xs">{serviceById(r.service_id)?.name ?? 'Service'} · {dateLabel(r.created_at)} · punctuality {r.punctuality}, work {r.workmanship}, cleanliness {r.cleanliness}, communication {r.communication}, pricing {r.pricing}{r.hidden && ' · hidden by moderator'}</div>
              {r.body && <div>{r.body}</div>}
              {reply ? <div className="rv"><div className="reply">{reply.body}</div></div>
                : <ReplyForm review={r.id} waitUntil={avg < 3 ? new Date(new Date(r.created_at).getTime() + 36e5).toISOString() : null} />}
              {!r.hidden && <ReportForm review={r.id} />}
            </div>
          );
        })}
        {!(reviews ?? []).length && <div className="card empty">No published reviews yet.</div>}
      </div>
    </div></section>
  );
}
