'use client';
import { useActionState, useMemo, useState } from 'react';
import { useT } from '@/components/I18n';
import { saveInvoice } from '../actions';

export type Line = { kind: 'labor' | 'material' | 'fee' | 'discount'; description: string; qty: number; price: number };
const money = (n: number) => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export default function InvoiceForm({ booking, id, initial, tax, notes, payment }: { booking: string; id?: string; initial: Line[]; tax: number; notes: string; payment: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(saveInvoice, undefined);
  const [lines, setLines] = useState<Line[]>(initial);
  const [rate, setRate] = useState(tax);
  const set = (i: number, patch: Partial<Line>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const sums = useMemo(() => {
    let sub = 0, mat = 0;
    for (const l of lines) { const v = (Number(l.qty) || 0) * Math.abs(Number(l.price) || 0) * (l.kind === 'discount' ? -1 : 1); sub += v; if (l.kind === 'material') mat += v; }
    const taxAmt = Math.round(mat * rate) / 100;
    return { sub, tax: taxAmt, total: sub + taxAmt };
  }, [lines, rate]);
  return (
    <form action={action} className="list">
      <input type="hidden" name="booking" value={booking} />
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{t('Lines')}</h3>
        {lines.map((l, i) => (
          <div key={i} className="invline">
            <select className="inp" value={l.kind} onChange={(e) => set(i, { kind: e.target.value as Line['kind'] })} aria-label={t('Type')}>
              {(['labor', 'material', 'fee', 'discount'] as const).map((k) => <option key={k} value={k}>{t(k === 'labor' ? 'Labor' : k === 'material' ? 'Material' : k === 'fee' ? 'Fee' : 'Discount / credit')}</option>)}
            </select>
            <input className="inp" value={l.description} onChange={(e) => set(i, { description: e.target.value })} placeholder={t('Description')} maxLength={140} aria-label={t('Description')} />
            <input className="inp" type="number" min={0.25} step={0.25} value={l.qty} onChange={(e) => set(i, { qty: Number(e.target.value) })} aria-label={t('Qty')} />
            <input className="inp" type="number" min={0} step={0.01} value={l.price} onChange={(e) => set(i, { price: Number(e.target.value) })} aria-label={t('Price')} />
            <button type="button" className="btn ghost sm" onClick={() => setLines(lines.filter((_, k) => k !== i))} aria-label={t('Remove')}>✕</button>
          </div>
        ))}
        <div className="chips">
          <button type="button" className="btn ghost sm" onClick={() => setLines([...lines, { kind: 'labor', description: '', qty: 1, price: 0 }])}>+ {t('Labor')}</button>
          <button type="button" className="btn ghost sm" onClick={() => setLines([...lines, { kind: 'material', description: '', qty: 1, price: 0 }])}>+ {t('Material')}</button>
          <button type="button" className="btn ghost sm" onClick={() => setLines([...lines, { kind: 'discount', description: t('Trip fee credit'), qty: 1, price: 0 }])}>+ {t('Discount / credit')}</button>
        </div>
        <label className="f" style={{ maxWidth: 260 }}>{t('Sales tax on materials, %')}<input className="inp" type="number" name="tax_rate" min={0} max={15} step={0.001} value={rate} onChange={(e) => setRate(Number(e.target.value))} /></label>
        <div className="brk">
          <div><span>{t('Subtotal')}</span><b>{money(sums.sub)}</b></div>
          <div><span>{t('Tax')}</span><b>{money(sums.tax)}</b></div>
          <div><span><b>{t('Total')}</b></span><b>{money(sums.total)}</b></div>
        </div>
      </div>
      <div className="card formcard">
        <label className="f">{t('How the client can pay')}<textarea className="inp" name="payment" defaultValue={payment} maxLength={500} placeholder={t('E.g. Zelle to (650) 555-0100, or card link, or check payable to …')} style={{ minHeight: 70 }} /></label>
        <label className="f">{t('Notes for the client')}<textarea className="inp" name="notes" defaultValue={notes} maxLength={1000} placeholder={t('Warranty, what was done, recommendations')} style={{ minHeight: 70 }} /></label>
      </div>
      {state?.error && <div className="err" role="alert">{t(state.error)}</div>}
      <div className="chips">
        <button className="btn" name="send" value="1" disabled={pending}>{t('Send to client')}</button>
        <button className="btn ghost" disabled={pending}>{t('Save draft')}</button>
      </div>
      <span className="mu xs">{t('NovaFides does not take payments. The client pays you directly; mark the invoice paid when the money arrives.')}</span>
    </form>
  );
}
