'use client';
import { useActionState } from 'react';
import { useT } from '@/components/I18n';
import { saveHandle } from './actions';

export default function HandleForm({ current, host }: { current: string; host: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(saveHandle, undefined);
  return (
    <form action={action} className="list" style={{ gap: 8 }}>
      <label className="f">{t('Your short address')}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="mu sm" style={{ whiteSpace: 'nowrap' }}>{host}/</span>
          <input className="inp" name="handle" defaultValue={current} pattern="[A-Za-z0-9-]{3,30}" required maxLength={30} autoCapitalize="none" spellCheck={false} /></span></label>
      {state?.error && <span className="err">{t(state.error)}</span>}
      {state?.ok && <span className="okmsg">{t(state.ok)}</span>}
      <button className="btn sm" disabled={pending} style={{ alignSelf: 'flex-start' }}>{t('Save address')}</button>
      <span className="mu xs">{t('Short and easy to say on the phone: your first name, name + trade, or your business name. If you change it later, the old address keeps working, so printed cards stay valid.')}</span>
    </form>
  );
}
