'use client';
import { useT } from './I18n';

export type CslbAuto = { result: 'ok' | 'class' | 'inactive' | 'not_found' | 'no_list'; name?: string; name2?: string; city?: string; status?: string; status2?: string; classes?: string[]; expires?: string | null; list_date?: string | null } | null;

/** What the CSLB master list says about a typed license number (green = found and fits, red = something is wrong). */
export default function CslbMark({ a, admin }: { a: CslbAuto; admin?: boolean }) {
  const t = useT();
  if (!a) return null;
  if (a.result === 'no_list') return admin ? <span className="cslb-mark grey">{t('CSLB list not uploaded yet')}</span> : null;
  const text: Record<string, string> = {
    ok: 'Found in the CSLB list: active, the class fits the trade',
    class: 'Found in the CSLB list, but the class does not fit the trade',
    inactive: 'Found in the CSLB list, but the license is not active or expired',
    not_found: 'Not found in the CSLB list',
  };
  return (
    <span className={`cslb-mark ${a.result === 'ok' ? 'ok' : 'bad'}`}>
      {a.result === 'ok' ? '✅' : '⚠'} {t(text[a.result])}
      {a.result !== 'not_found' && <small>
        {' · '}{[a.name, a.name2 && a.name2 !== a.name ? a.name2 : '', a.city].filter(Boolean).join(' · ')}
        {a.classes?.length ? ` · ${a.classes.join(', ')}` : ''}{a.status ? ` · ${a.status}` : ''}{a.expires ? ` · ${t('until')} ${a.expires}` : ''}
      </small>}
      {admin && a.result === 'ok' && <small className="mu"> · {t('Check that this name matches the pro’s ID.')}</small>}
    </span>
  );
}
