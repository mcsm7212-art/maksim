'use client';
import { useActionState, useState } from 'react';
import { toneCheck } from '@/lib/tone';
import { reportReview, replyToReview } from './actions';

export function ReplyForm({ review, waitUntil }: { review: string; waitUntil: string | null }) {
  const [state, action, pending] = useActionState(replyToReview, undefined);
  const [text, setText] = useState('');
  const hint = text.length > 15 ? toneCheck(text) : null;
  if (state?.ok) return <div className="okmsg">{state.ok}</div>;
  if (waitUntil && new Date(waitUntil) > new Date()) return <div className="note">Low rating. You can reply after {new Date(waitUntil).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. A calm reply an hour later reads much better to future clients.</div>;
  return (
    <form action={action} className="list" style={{ gap: 8 }}>
      <input type="hidden" name="review" value={review} />
      <textarea className="inp" name="body" maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="Thank the client, explain briefly what happened, say what you will do. One reply only." />
      <span className="mu xs">{text.length}/600 {hint && <span className="err"> · {hint}</span>}</span>
      {state?.error && <div className="err">{state.error}</div>}
      <button className="btn sm" disabled={pending || Boolean(hint)} style={{ alignSelf: 'flex-start' }}>Post reply</button>
    </form>
  );
}

export function ReportForm({ review }: { review: string }) {
  const [state, action, pending] = useActionState(reportReview, undefined);
  const [open, setOpen] = useState(false);
  if (state?.ok) return <div className="okmsg">{state.ok}</div>;
  if (!open) return <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>Report review</button>;
  return (
    <form action={action} className="list" style={{ gap: 8 }}>
      <input type="hidden" name="review" value={review} />
      <select className="inp" name="reason" defaultValue="" required>
        <option value="" disabled>Why does it break the rules?</option>
        <option value="not_a_customer">Not my customer / job did not happen</option>
        <option value="extortion">Threat or demand for free work or money</option>
        <option value="abuse">Insults, hate or obscene words</option>
        <option value="personal_data">Personal data (my phone, home address)</option>
        <option value="competitor">Written by a competitor</option>
        <option value="other">Other</option>
      </select>
      <textarea className="inp" name="details" maxLength={1000} placeholder="Explain for the moderator (not public)" />
      {state?.error && <div className="err">{state.error}</div>}
      <span className="mu xs">A review is not removed for being negative. Only rule-breaking reviews are hidden.</span>
      <button className="btn sm" disabled={pending} style={{ alignSelf: 'flex-start' }}>Send to moderator</button>
    </form>
  );
}
