'use client';
import { useActionState, useState } from 'react';
import { toneCheck } from '@/lib/tone';
import { reportReview, replyToReview } from './actions';
import { useLang, useT } from '@/components/I18n';

export function ReplyForm({ review, waitUntil }: { review: string; waitUntil: string | null }) {
  const [state, action, pending] = useActionState(replyToReview, undefined); const tt = useT(); const lang = useLang();
  const [text, setText] = useState('');
  const hint = text.length > 15 ? toneCheck(text) : null;
  if (state?.ok) return <div className="okmsg">{tt(state.ok)}</div>;
  if (waitUntil && new Date(waitUntil) > new Date()) return <div className="note">{tt('Low rating. You can reply after {time}. A calm reply an hour later reads much better to future clients.', { time: new Date(waitUntil).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit' }) })}</div>;
  return (
    <form action={action} className="list" style={{ gap: 8 }}>
      <input type="hidden" name="review" value={review} />
      <textarea className="inp" name="body" maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder={tt('Thank the client, explain briefly what happened, say what you will do. One reply only.')} />
      <span className="mu xs">{text.length}/600 {hint && <span className="err"> · {tt(hint)}</span>}</span>
      {state?.error && <div className="err">{tt(state.error)}</div>}
      <button className="btn sm" disabled={pending || Boolean(hint)} style={{ alignSelf: 'flex-start' }}>{tt('Post reply')}</button>
    </form>
  );
}

export function ReportForm({ review }: { review: string }) {
  const [state, action, pending] = useActionState(reportReview, undefined); const tt = useT();
  const [open, setOpen] = useState(false);
  if (state?.ok) return <div className="okmsg">{tt(state.ok)}</div>;
  if (!open) return <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>{tt('Report review')}</button>;
  return (
    <form action={action} className="list" style={{ gap: 8 }}>
      <input type="hidden" name="review" value={review} />
      <select className="inp" name="reason" defaultValue="" required>
        <option value="" disabled>{tt('Why does it break the rules?')}</option>
        <option value="not_a_customer">{tt('Not my customer / job did not happen')}</option>
        <option value="extortion">{tt('Threat or demand for free work or money')}</option>
        <option value="abuse">{tt('Insults, hate or obscene words')}</option>
        <option value="personal_data">{tt('Personal data (my phone, home address)')}</option>
        <option value="competitor">{tt('Written by a competitor')}</option>
        <option value="other">{tt('Other')}</option>
      </select>
      <textarea className="inp" name="details" maxLength={1000} placeholder={tt('Explain for the moderator (not public)')} />
      {state?.error && <div className="err">{tt(state.error)}</div>}
      <span className="mu xs">{tt('A review is not removed for being negative. Only rule-breaking reviews are hidden.')}</span>
      <button className="btn sm" disabled={pending} style={{ alignSelf: 'flex-start' }}>{tt('Send to moderator')}</button>
    </form>
  );
}
