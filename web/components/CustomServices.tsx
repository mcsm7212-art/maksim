'use client';
import { useEffect, useState } from 'react';
import { useT } from './I18n';

type Row = { name: string; price: string };
/** "+ Add your own service": jobs that are not in the list. Kept in the draft; over $1,000 needs a license. */
export default function CustomServices({ initial, licensed, draftKey }: { initial: { name: string; price: number | null }[]; licensed: boolean; draftKey: string }) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>(initial.map((r) => ({ name: r.name, price: r.price != null ? String(r.price) : '' })));
  useEffect(() => { try { const d = JSON.parse(localStorage.getItem(draftKey) ?? 'null'); if (Array.isArray(d)) setRows(d); } catch { /* none */ } }, [draftKey]);
  const set = (next: Row[]) => { setRows(next); try { localStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* storage off */ } };
  return (
    <div className="custom-svcs">
      <b className="sm">{t('Your own services')}</b>
      <span className="mu xs">{t('Jobs that are not in the list. Clients see them on your page and ask for an estimate.')}</span>
      {rows.map((r, i) => {
        const big = !licensed && Number(r.price) >= 1000;
        return (
          <div key={i} className={`sv-row cs-row${big ? ' lic' : ''}`}>
            <input className="inp" name="custom_name" value={r.name} maxLength={80} placeholder={t('e.g. Water softener service')} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label={t('Service name')} />
            <input className="inp" type="number" name="custom_price" min={1} value={r.price} placeholder="$" onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} aria-label={t('price')} />
            <button type="button" className="clear-btn cs-del" onClick={() => set(rows.filter((_, j) => j !== i))} title={t('Remove')} aria-label={t('Remove')}>✕</button>
            {big && <small className="lic-msg">⚠ {t('$1,000 or more needs a CSLB license. Add your license number above or lower the price.')}</small>}
          </div>);
      })}
      {rows.length < 20 && <button type="button" className="add-own" onClick={() => set([...rows, { name: '', price: '' }])}><i aria-hidden>+</i><span><b>{t('Add your own service')}</b><small>{t('A job that is not in the list, with your price')}</small></span></button>}
    </div>
  );
}
