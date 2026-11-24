'use client';
import Link from 'next/link';
import { acceptQuote, declineQuote, withdrawQuote } from '@/app/orders/actions';
import { LINE_KINDS, type QuoteLine } from '@/lib/orders';
import Disclaimer from './Disclaimer';
import LicenseTag from './LicenseTag';
import { useT } from './I18n';

export type QuoteView = { id: string; conv: string; title: string; lines: QuoteLine[]; total: number; includes: string | null; notes: string | null;
  validUntil: string | null; duration?: string | null; license?: string | null; version: number; status: string; bookingId: string | null; at: string };
const usd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A quote inside the chat: clear lines, total, and Accept / Decline for the client. */
export default function QuoteCard({ q, role, inOrder }: { q: QuoteView; role: 'client' | 'pro'; inOrder?: boolean }) {
  const t = useT();
  const STATUS: Record<string, string> = { sent: role === 'client' ? 'Waiting for your answer' : 'Waiting for the client', accepted: 'Accepted: price agreed', declined: 'Declined', replaced: 'Replaced by a newer version', withdrawn: 'Withdrawn' };
  const old = q.status === 'replaced' || q.status === 'withdrawn';
  return (
    <div className={`card quote ${q.status}`} style={{ alignSelf: 'stretch', opacity: old ? 0.6 : 1 }}>
      <div className="quote-head"><span>🧾 <b>{q.title}</b>{q.version > 1 && <span className="mu xs"> · {t('version {n}', { n: q.version })}</span>}</span>
        <span className={`badge ${q.status === 'accepted' ? 'ok' : q.status === 'sent' ? 'cu' : 'n'}`}>{t(STATUS[q.status] ?? q.status)}</span></div>
      <LicenseTag license={q.license} tr={t} className="lic-tag xs" />
      <table className="qtable"><tbody>
        {q.lines.map((l, i) => <tr key={i}><td className="mu xs">{t(LINE_KINDS[l.kind] ?? 'Other')}</td><td>{l.label}</td><td className="r">{l.kind === 'discount' ? '−' : ''}{usd(Number(l.amount))}</td></tr>)}
        <tr className="tot"><td /><td>{t('Total')}</td><td className="r">{usd(q.total)}</td></tr>
      </tbody></table>
      {q.duration && <div className="sm">⏱ <span className="mu">{t('About how long')}:</span> <b>{q.duration}</b></div>}
      {q.includes && <div className="sm"><span className="mu">{t('Included')}:</span> {q.includes}</div>}
      {q.notes && <div className="sm"><span className="mu">{t('May need a separate agreement')}:</span> {q.notes}</div>}
      {q.validUntil && <div className="mu xs">{t('Valid until')} {q.validUntil}</div>}
      {q.status === 'sent' && role === 'client' && <div className="chips">
        <form action={acceptQuote}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="conv" value={q.conv} /><button className="btn sm">✓ {t('Accept quote')}</button></form>
        <form action={declineQuote}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="conv" value={q.conv} /><button className="btn ghost sm">{t('Decline')}</button></form>
        <span className="mu xs" style={{ alignSelf: 'center' }}>{t('Accepting agrees on the price. You pick the time next.')}</span>
      </div>}
      {q.status === 'sent' && <Disclaimer style={{ margin: 0 }} />}
      {q.status === 'sent' && role === 'pro' && <form action={withdrawQuote}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="conv" value={q.conv} /><button className="btn ghost sm">{t('Withdraw')}</button></form>}
      {q.status === 'accepted' && q.bookingId && !inOrder && <Link className="btn ghost sm" href={`/orders/${q.bookingId}`} style={{ alignSelf: 'flex-start' }}>{t('Open order')} →</Link>}
    </div>
  );
}
