'use client';
import { useActionState } from 'react';
import { createPost } from '@/app/social/actions';
import { useT } from './I18n';
import PhotoPicker from './PhotoPicker';

export default function PostForm() {
  const t = useT();
  const [state, action, pending] = useActionState(createPost, undefined);
  return (
    <form action={action} className="card formcard" key={state?.ok ? Date.now() : 'f'}>
      <b>{t('Share your work')}</b>
      <textarea className="inp" name="body" maxLength={1000} placeholder={t('What did you do today? E.g. “Replaced a 50-gal water heater in San Carlos, new expansion tank and shut-off.”')} style={{ minHeight: 70 }} />
      <PhotoPicker name="work_url" prefix="post" max={6} label={t('Add photos')} />
      {state?.error && <span className="err">{t(state.error)}</span>}
      {state?.ok && <span className="okmsg">{t(state.ok)}</span>}
      <button className="btn sm" disabled={pending} style={{ alignSelf: 'flex-start' }}>{t('Post')}</button>
      <span className="mu xs">{t('No client names, faces, house numbers or addresses. Up to 3 posts a day.')}</span>
    </form>
  );
}
