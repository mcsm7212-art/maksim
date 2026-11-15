'use client';
import { useActionState, useState } from 'react';
import { askEstimate } from './actions';
import { useT } from '@/components/I18n';

export default function AskForm({ pros }: { pros: { slug: string; name: string; sub: string }[] }) {
  const [state, action, pending] = useActionState(askEstimate, undefined);
  const [picked, setPicked] = useState<string[]>([]); const t = useT();
  return (
    <form action={action} className="list">
      <label className="f">{t('What needs doing?')}<textarea className="inp" name="text" required placeholder={t('E.g. water stain on the ceiling under the upstairs bathroom, appeared last week.')} /></label>
      <label className="f">{t('Job address')}<input className="inp" name="address" required placeholder={t('Street, city')} /></label>
      <b>{t('Send to up to 3 pros')} ({picked.length}/3)</b>
      <div className="list">
        {pros.map((p) => (
          <label key={p.slug} className="card bk" style={{ cursor: 'pointer' }}>
            <span><b>{p.name}</b><br /><span className="mu sm">{p.sub}</span></span>
            <input type="checkbox" name="pro" value={p.slug} checked={picked.includes(p.slug)} disabled={!picked.includes(p.slug) && picked.length >= 3}
              onChange={(e) => setPicked(e.target.checked ? [...picked, p.slug] : picked.filter((x) => x !== p.slug))} style={{ width: 20, height: 20, accentColor: 'var(--cu)' }} />
          </label>
        ))}
      </div>
      {state?.error && <div className="err" role="alert">{t(state.error)}</div>}
      {state?.demo && <div className="note">{t('Demo mode: nothing was sent.')}</div>}
      <button className="btn" disabled={pending}>{pending ? t('Sending…') : t('Ask for estimates')}</button>
      <span className="mu xs">{t('Only the pros you choose see your request. You can add photos in chat after they reply.')}</span>
    </form>
  );
}
