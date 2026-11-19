'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useT } from './I18n';

type State = { error?: string; ok?: string } | undefined;
/** Small form around a server action: shows the error or success text and clears itself after success. */
export default function ActionForm({ action, children, className, style, okText }: {
  action: (p: State, f: FormData) => Promise<State>; children: React.ReactNode; className?: string; style?: React.CSSProperties; okText?: boolean;
}) {
  const t = useT(); const ref = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useActionState(action, undefined);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={run} className={className} style={style} aria-busy={pending}>
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>{children}</fieldset>
      {state?.error && <span className="err xs">{t(state.error)}</span>}
      {okText && state?.ok && state.ok !== 'ok' && <span className="okmsg xs">{t(state.ok)}</span>}
    </form>
  );
}
