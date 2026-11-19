'use client';
import { useActionState, useState } from 'react';
import { askEstimate } from './actions';
import { useT } from '@/components/I18n';
import PhotoPicker from '@/components/PhotoPicker';

/** "Compare offers": the client describes the job once and picks up to 3 pros by name. Nobody else gets it. */
export default function AskForm({ pros, cities, initial }: { pros: { slug: string; name: string; sub: string }[]; cities: string[]; initial?: string }) {
  const [state, action, pending] = useActionState(askEstimate, undefined);
  const [picked, setPicked] = useState<string[]>([]); const t = useT();
  const names = pros.filter((p) => picked.includes(p.slug)).map((p) => p.name);
  return (
    <form action={action} className="list">
      <label className="f">{t('What needs doing?')}<textarea className="inp" name="text" required defaultValue={initial} placeholder={t('E.g. water stain on the ceiling under the upstairs bathroom, appeared last week.')} /></label>
      <PhotoPicker name="photo_url" prefix="request" max={6} label={t('Add photos of the problem')} />
      <div className="chips">
        <select className="inp" name="city" defaultValue="" style={{ width: 'auto' }} aria-label={t('City')}><option value="">{t('City')}…</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <input className="inp" name="zip" inputMode="numeric" maxLength={5} placeholder="ZIP" aria-label="ZIP" style={{ width: 110 }} />
      </div>
      <b>{t('Choose who gets it (up to 3)')} ({picked.length}/3)</b>
      <div className="list">
        {pros.map((p) => (
          <label key={p.slug} className="card bk" style={{ cursor: 'pointer' }}>
            <span><b>{p.name}</b><br /><span className="mu sm">{p.sub}</span></span>
            <input type="checkbox" name="pro" value={p.slug} checked={picked.includes(p.slug)} disabled={!picked.includes(p.slug) && picked.length >= 3}
              onChange={(e) => setPicked(e.target.checked ? [...picked, p.slug] : picked.filter((x) => x !== p.slug))} style={{ width: 20, height: 20, accentColor: 'var(--cu)' }} />
          </label>
        ))}
      </div>
      <div className="note" style={{ margin: 0 }}>{names.length ? <>{t('Goes only to')}: <b>{names.join(', ')}</b></> : t('Nobody chosen yet. We never send your request to anyone you did not choose.')}</div>
      {state?.error && <div className="err" role="alert">{t(state.error)}</div>}
      {state?.demo && <div className="note">{t('Demo mode: nothing was sent.')}</div>}
      <button className="btn" disabled={pending}>{pending ? t('Sending…') : t('Send to the chosen pros')}</button>
      <span className="mu xs">{t('Each pro gets it in a separate chat and can answer or send a quote. City or ZIP is enough for now.')}</span>
    </form>
  );
}
