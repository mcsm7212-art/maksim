'use client';
import { useActionState } from 'react';
import { createBooking } from './actions';

export default function BookForm({ hidden, children, cta }: { hidden: Record<string, string>; children: React.ReactNode; cta: string }) {
  const [state, action, pending] = useActionState(createBooking, undefined);
  return (
    <form action={action} className="list">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      {state?.error && <div className="err" role="alert">{state.error}</div>}
      {state?.demo && <div className="note">Demo mode: the request was not sent. When the database is connected, this creates a real booking.</div>}
      <button className="btn" disabled={pending}>{pending ? 'Sending…' : cta}</button>
    </form>
  );
}
