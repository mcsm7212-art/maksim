'use client';
import { useActionState } from 'react';
import { sendLicense } from '@/app/account/actions';
import { useT } from './I18n';
import CslbMark, { type CslbAuto } from './CslbMark';

/** In the pro's account: the license and its check. Send or correct the number; NovaFides checks it with CSLB by hand. */
export default function LicenseBox({ number, status, cslb, auto }: { number: string | null; status: string; cslb: string; auto?: CslbAuto }) {
  const t = useT();
  const [st, action, pending] = useActionState(sendLicense, undefined);
  const state = st?.ok ? 'pending' : status;
  return (
    <div className={`card lic-box ${state}`} style={{ marginBottom: 12 }}>
      <b>{t('CSLB license')}{number && state !== 'none' ? ` #${number}` : ''}</b>
      {state === 'verified' && <span className="sm">✅ {t('Checked by NovaFides. Jobs that need a license are open to you.')}</span>}
      {state === 'pending' && auto && auto.result !== 'no_list' && <CslbMark a={auto} />}
      {state === 'pending' && auto && ['not_found', 'inactive', 'class'].includes(auto.result) && <span className="xs">{t('The admin will look at it by hand. If the number is wrong, correct it below.')}</span>}
      {state === 'pending' && <span className="sm">⏳ {t('Sent for the check. A NovaFides admin looks it up on the CSLB site, usually within 1 business day. Until then you take only jobs under $1,000.')}</span>}
      {state !== 'verified' && state !== 'pending' && <span className="sm">{t('No checked license yet: you take jobs under $1,000 (with materials) that need no permit. Add your number to open the bigger jobs.')}</span>}
      {state !== 'verified' && <form action={action} className="chips" style={{ marginTop: 8 }}>
        <input className="inp" name="license" inputMode="numeric" maxLength={8} placeholder="1234567" defaultValue={state === 'pending' ? number ?? '' : ''} aria-label={t('CSLB license number')} style={{ width: 160 }} />
        <button className="btn sm" disabled={pending}>{t(pending ? 'Sending…' : state === 'pending' ? 'Correct the number' : 'Send for the check')}</button>
      </form>}
      {st?.error && <span className="err xs">{t(st.error)}</span>}
      {state !== 'verified' && <span className="mu xs">{t('The name on the license must match your ID.')} <a href={cslb} target="_blank" rel="noreferrer">{t('Find your number on the CSLB site')}</a></span>}
    </div>
  );
}
