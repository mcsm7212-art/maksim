'use client';
import { useState } from 'react';
import { sendQuote } from '@/app/orders/actions';
import { LINE_KINDS, type QuoteLine } from '@/lib/orders';
import ActionForm from './ActionForm';
import Disclaimer from './Disclaimer';
import { useLang, useT } from './I18n';
import { CA_PRO_NOTE } from '@/lib/legal-short';

type Opt = { id: string; label: string };
/** Pro writes a quote right in the chat: lines (labor, materials, trip, urgency, discount), what is included, how long it is valid. */
export default function QuoteForm({ conv, services, jobs, licensed = true }: { conv: string; services: Opt[]; jobs: Opt[]; licensed?: boolean }) {
  const t = useT(); const lang = useLang();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<QuoteLine[]>([{ kind: 'labor', label: '', amount: 0 }, { kind: 'material', label: '', amount: 0 }]);
  const total = lines.reduce((n, l) => n + (l.kind === 'discount' ? -1 : 1) * (Number(l.amount) || 0), 0);
  const set = (i: number, patch: Partial<QuoteLine>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  if (!open) return <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>🧾 {t('Send a quote')}</button>;
  return (
    <ActionForm action={sendQuote} className="card formcard quoteform" okText>
      <input type="hidden" name="conv" value={conv} />
      <b>🧾 {t('Quote')}</b>
      <input className="inp" name="title" required maxLength={120} placeholder={t('What job? e.g. “Replace shower cartridge”')} aria-label={t('Job')} />
      <div className="chips">
        <select className="inp" name="service" defaultValue="" style={{ width: 'auto' }} aria-label={t('Service')}><option value="">{t('Service (optional)')}</option>{services.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        {jobs.length > 0 && <select className="inp" name="booking" defaultValue="" style={{ width: 'auto' }} aria-label={t('For an existing job')}><option value="">{t('New job')}</option>{jobs.map((j) => <option key={j.id} value={j.id}>{t('Change for')}: {j.label}</option>)}</select>}
      </div>
      {lines.map((l, i) => (
        <div key={i} className="qline">
          <select className="inp" name="kind" value={l.kind} onChange={(e) => set(i, { kind: e.target.value as QuoteLine['kind'] })} aria-label={t('Type')}>{Object.entries(LINE_KINDS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</select>
          <input className="inp" name="label" value={l.label} onChange={(e) => set(i, { label: e.target.value })} maxLength={80} placeholder={t('Description')} aria-label={t('Description')} />
          <input className="inp" name="amount" inputMode="decimal" value={l.amount || ''} onChange={(e) => set(i, { amount: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} placeholder="$" aria-label={t('Amount, $')} />
          <button type="button" className="linkbtn xs" onClick={() => setLines(lines.filter((_, k) => k !== i))} aria-label={t('Remove')}>✕</button>
        </div>))}
      <div className="chips" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="btn ghost sm" onClick={() => setLines([...lines, { kind: 'other', label: '', amount: 0 }])} disabled={lines.length >= 20}>+ {t('Add line')}</button>
        <b className="num" style={{ fontSize: 26 }}>{t('Total')}: ${total.toFixed(2)}</b>
      </div>
      <textarea className="inp" name="includes" maxLength={1000} placeholder={t('What is included (e.g. parts, cleanup, 1-year warranty on labor)')} style={{ minHeight: 56 }} />
      <textarea className="inp" name="notes" maxLength={1000} placeholder={t('What may need a separate agreement (e.g. if the valve body is damaged)')} style={{ minHeight: 56 }} />
      <label className="f sm">{t('About how long the job takes')}<input className="inp" name="duration" maxLength={60} placeholder={t('e.g. 2-3 hours, 1 day')} /></label>
      <label className="sm mu">{t('Valid until (optional)')} <input className="inp" type="date" name="valid_until" style={{ width: 'auto', padding: '6px 8px' }} /></label>
      {!licensed && total >= 1000 && <div className="err" role="alert">🔒 {t('Without a CSLB license you can only quote jobs under $1,000 in total (labor and materials). Lower the total or add your license in “Edit profile”.')}</div>}
      {total > 500 && <div className="canote">⚖ {CA_PRO_NOTE[lang] ?? CA_PRO_NOTE.en}</div>}
      <Disclaimer style={{ margin: 0 }} />
      <div className="chips"><button className="btn sm" disabled={!licensed && total >= 1000}>{t('Send quote')}</button><button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>{t('Cancel')}</button></div>
    </ActionForm>
  );
}
