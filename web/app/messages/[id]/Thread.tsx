'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { sendMessage } from '../actions';

const CONTACT = /(\d{3}[\s.)-]*\d{3}[\s.-]*\d{4})|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(https?:\/\/|www\.)/i;
type Msg = { id: number; body: string; mine: boolean; at: string; flagged: boolean; who: string };

export default function Thread({ id, messages, booked }: { id: string; messages: Msg[]; booked: boolean }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { const t = setInterval(() => router.refresh(), 5000); return () => clearInterval(t); }, [router]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);
  const warn = !booked && CONTACT.test(text);
  return (
    <>
      <div className="list" style={{ gap: 8, marginBottom: 14 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            <div className="card" style={{ padding: '10px 14px', borderRadius: 16, background: m.mine ? '#22170F' : undefined, borderColor: m.mine ? 'var(--cu)' : undefined, whiteSpace: 'pre-wrap' }}>{m.body}</div>
            <div className="mu2 xs" style={{ textAlign: m.mine ? 'right' : 'left', marginTop: 2 }}>{m.mine ? 'You' : m.who} · {new Date(m.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{m.flagged && ' · contact details shared before booking'}</div>
          </div>
        ))}
        {!messages.length && <p className="mu">Describe the job, ask about price or time. Photos can be added after booking.</p>}
        <div ref={end} />
      </div>
      <form action={async (f) => { await sendMessage(f); setText(''); router.refresh(); }} className="list" style={{ gap: 8, position: 'sticky', bottom: 0, background: 'var(--bg)', paddingBlock: 10 }}>
        <input type="hidden" name="id" value={id} />
        <textarea className="inp" name="body" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Write a message" style={{ minHeight: 60 }} required />
        {warn && <div className="note" style={{ fontSize: 13 }}>For your safety, keep talking here until the booking is confirmed. Deals made outside NovaFides have no reviews, no record and no help if something goes wrong.</div>}
        <button className="btn" style={{ alignSelf: 'flex-end' }}>Send</button>
      </form>
    </>
  );
}
