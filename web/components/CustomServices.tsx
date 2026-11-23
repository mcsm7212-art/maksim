'use client';
import { useEffect, useState } from 'react';
import { useT } from './I18n';
import { badText, ENGLISH_ONLY, notEnglish } from '@/lib/clean-words';

type Row = { name: string; price: string; cat: string };
type Saved = { rows: Row[]; cats: string[] };
const MAX = 60;

/**
 * A pro's own jobs that are not in the catalog (name + price). Kept in the draft; $1,000 or more needs a license.
 * `grouped` (a pro with their own trade, which has no catalog): jobs are grouped in the pro's own categories.
 */
export default function CustomServices({ initial, licensed, draftKey, grouped, waiting }: {
  initial: { name: string; price: number | null; category?: string | null }[]; licensed: boolean; draftKey: string; grouped?: boolean; waiting?: boolean;
}) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>(initial.map((r) => ({ name: r.name, price: r.price != null ? String(r.price) : '', cat: r.category ?? '' })));
  const [cats, setCats] = useState<string[]>(() => [...new Set(initial.map((r) => r.category ?? '').filter(Boolean))]);
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) ?? 'null') as Saved | Row[] | null;
      if (Array.isArray(d)) setRows(d.map((r) => ({ ...r, cat: r.cat ?? '' })));
      else if (d && Array.isArray(d.rows)) { setRows(d.rows); setCats(d.cats ?? []); }
    } catch { /* none */ }
  }, [draftKey]);
  const save = (r: Row[], c: string[]) => { setRows(r); setCats(c); try { localStorage.setItem(draftKey, JSON.stringify({ rows: r, cats: c })); } catch { /* storage off */ } };
  const set = (r: Row[]) => save(r, cats);

  const row = (r: Row, i: number) => {
    const big = !licensed && Number(r.price) >= 1000;
    return (
      <div key={i} className={`sv-row cs-row${big ? ' lic' : ''}`}>
        <input className="inp" name="custom_name" value={r.name} maxLength={80} placeholder={t(grouped ? 'Job name, e.g. Shingle repair' : 'e.g. Water softener service')} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label={t('Service name')} />
        <input className="inp" type="number" name="custom_price" min={1} value={r.price} placeholder="$" onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} aria-label={t('price')} />
        <input type="hidden" name="custom_cat" value={grouped ? r.cat : ''} />
        <button type="button" className="clear-btn cs-del" onClick={() => set(rows.filter((_, j) => j !== i))} title={t('Remove')} aria-label={t('Remove')}>✕</button>
        {(badText(r.name) || notEnglish(r.name)) && <small className="lic-msg">⚠ {t(badText(r.name) ? 'Please remove rude or offensive words. Clients see this text.' : ENGLISH_ONLY)}</small>}
        {big && <small className="lic-msg">⚠ {t('$1,000 or more needs a CSLB license. Add your license number above or lower the price.')}</small>}
        {waiting && Number(r.price) >= 1000 && <small className="wait-msg">⏳ {t('Waiting for the admin to approve your license')}</small>}
      </div>);
  };
  const addJob = (cat: string) => { if (rows.length < MAX) set([...rows, { name: '', price: '', cat }]); };

  if (!grouped) return (
    <div className="custom-svcs">
      <h4 className="cs-h">{t('Your own services')}</h4>
      <span className="mu sm">{t('Jobs that are not in the list. Clients see them on your page and ask for an estimate.')}</span>
      {rows.map(row)}
      {rows.length < MAX && <button type="button" className="add-own" onClick={() => addJob('')}><i aria-hidden>+</i><b>{t('Add your own service')}</b></button>}
    </div>
  );

  // Own trade: categories, each with its jobs. Renaming a category moves its jobs with it.
  const loose = rows.map((r, i) => [r, i] as const).filter(([r]) => !cats.includes(r.cat));
  const rename = (k: number, v: string) => { const old = cats[k]; save(rows.map((r) => (r.cat === old ? { ...r, cat: v } : r)), cats.map((c, j) => (j === k ? v : c))); };
  const dropCat = (k: number) => { const old = cats[k]; save(rows.filter((r) => r.cat !== old), cats.filter((_, j) => j !== k)); };
  return (
    <div className="custom-svcs">
      <h4 className="cs-h">{t('Your jobs and prices')}</h4>
      <span className="mu sm">{t('Your trade has no ready list, so make your own: add categories (e.g. Repairs, Installation) and the jobs in each, with your prices.')}</span>
      {cats.map((c, k) => (
        <div key={k} className="cs-cat">
          <div className="cs-cat-h">
            <input className="inp" value={c} maxLength={60} placeholder={t('Category name, e.g. Repairs')} onChange={(e) => rename(k, e.target.value)} aria-label={t('Category name')} />
            {(badText(c) || notEnglish(c)) && <small className="lic-msg cs-cat-msg">⚠ {t(badText(c) ? 'Please remove rude or offensive words. Clients see this text.' : ENGLISH_ONLY)}</small>}
            <button type="button" className="clear-btn cs-del" onClick={() => dropCat(k)} title={t('Remove the category and its jobs')} aria-label={t('Remove the category and its jobs')}>✕</button>
          </div>
          {rows.map((r, i) => (r.cat === c ? row(r, i) : null))}
          {rows.length < MAX && <button type="button" className="add-own" onClick={() => addJob(c)} disabled={!c.trim()} title={c.trim() ? undefined : t('Name the category first')}><i aria-hidden>+</i><b>{t('Add a job')}</b></button>}
        </div>
      ))}
      {loose.length > 0 && <div className="cs-cat">{loose.map(([r, i]) => row(r, i))}</div>}
      <button type="button" className="add-own" onClick={() => save(rows, [...cats, ''])}><i aria-hidden>+</i><b>{t('Add a category')}</b></button>
    </div>
  );
}
