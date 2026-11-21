import Link from 'next/link';
import Figure from '@/components/Figure';
import { priceFor } from '@/components/ProCard';
import { serviceById, TRADES, usd } from '@/lib/catalog';
import { getPro, openSlots } from '@/lib/data';
import { getLang } from '@/lib/i18n';
import { makeT, svcName } from '@/lib/i18n-core';
import { slotLabel } from '@/lib/time';
import type { Pro } from '@/lib/types';

export const metadata = { title: 'Compare pros' };
type SP = Promise<Record<string, string | undefined>>;

/** Two or three pros side by side: price, rating, checks, next free time, reply time, experience. */
export default async function Compare({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams; const lang = await getLang(); const tr = makeT(lang);
  const slugs = (sp.p ?? '').split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9-]{2,60}$/.test(s)).slice(0, 3);
  const pros = (await Promise.all(slugs.map((s) => getPro(s)))).filter((p): p is Pro => Boolean(p));
  const svc = sp.svc ? serviceById(sp.svc) : undefined;
  const yes = (v: boolean, date?: string | null) => (v ? <span className="tchip">✓ {date ? new Date(date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-US' : 'en-US', { month: 'short', year: 'numeric' }) : ''}</span> : <span className="mu">—</span>);
  const from = (p: Pro) => { const v = p.services.map((x) => priceFor(p, x.id) ?? 1e9); const m = v.length ? Math.min(...v) : 1e9; return m < 1e9 ? m : null; };
  const rows: [string, (p: Pro) => React.ReactNode][] = [
    [tr('Trade'), (p) => <>{tr(TRADES[p.trade].name)}<br /><span className="mu xs">{p.company ? p.company.name : tr('Independent')}{p.area ? ` · ${p.area}` : ''}</span></>],
    [tr('Rating'), (p) => (p.reviewCount > 0 && p.rating != null ? <>★ {p.rating.toFixed(1)} <span className="mu xs">· {tr(p.reviewCount > 1 ? '{n} reviews' : '{n} review', { n: p.reviewCount })}</span></> : <span className="mu">{tr('Just joined')}</span>)],
    [svc ? svcName(svc, lang) : tr('Price'), (p) => { const v = svc ? priceFor(p, svc.id) : from(p); return v != null ? <b className="num">{svc ? '≈ ' : `${tr('from')} `}{usd(v)}</b> : <span className="mu">{tr('In the quote')}</span>; }],
    [tr('Trip fee'), (p) => usd(p.tripFee)],
    [tr('CSLB license'), (p) => (TRADES[p.trade].license ? yes(p.verified.license, p.checkedAt.license) : <span className="mu xs">{tr('Not required for small jobs')}</span>)],
    [tr('ID checked'), (p) => yes(p.verified.id, p.checkedAt.id)],
    [tr('Insured'), (p) => yes(p.verified.insured, p.checkedAt.insured)],
    [tr('Next free time'), (p) => { const s = p.isDemo ? null : openSlots(p, 7)[0]; return s ? slotLabel(s, tr).join(' ') : <span className="mu">—</span>; }],
    [tr('Usually replies'), (p) => (p.responseMin ? tr('~{n} min', { n: p.responseMin }) : <span className="mu">—</span>)],
    [tr('Jobs on NovaFides'), (p) => (svc ? (p.services.find((x) => x.id === svc.id)?.jobs ?? 0) : p.jobs)],
    [tr('Experience'), (p) => (p.years ? tr('{n} yrs', { n: p.years }) : '—')],
    [tr('Languages'), (p) => p.languages.join(', ') || '—'],
    [tr('Work photos'), (p) => p.photos.length],
  ];
  return (
    <section className="sec pad"><div className="in">
      <div className="eyebrow">{tr('Side by side')}</div><h2>{tr('Compare pros')}</h2>
      {pros.length < 2 ? <div className="card empty">{tr('Pick 2 or 3 pros in the search with “Compare”.')} <Link href="/search">{tr('Find a pro')}</Link></div> :
      <div className="cmp-scroll"><table className="cmp-table">
        <thead><tr><th />{pros.map((p) => (
          <th key={p.id} style={{ ['--acc' as string]: p.accent }}>
            <Link href={`/${p.slug}`} className="cmp-head"><span className="cmp-fig"><Figure name={p.name} accent={p.accent} photo={p.photoUrl} /></span><b>{p.name}</b></Link>
            {p.isDemo && <span className="badge p">{tr('Demo profile')}</span>}
          </th>))}</tr></thead>
        <tbody>
          {rows.map(([label, cell]) => <tr key={label}><th scope="row" className="mu sm">{label}</th>{pros.map((p) => <td key={p.id}>{cell(p)}</td>)}</tr>)}
          <tr><th />{pros.map((p) => <td key={p.id}>{p.isDemo ? <span className="mu xs">{tr('Demo profile')}</span> : p.accepting ? <Link className="btn sm" href={`/book?pro=${p.slug}${svc ? `&svc=${svc.id}` : ''}`}>{tr('Pick a time')}</Link> : <Link className="btn ghost sm" href={`/${p.slug}`}>{tr('Open profile')}</Link>}</td>)}</tr>
        </tbody>
      </table></div>}
      <p className="mu xs" style={{ marginTop: 12 }}>{tr('Checks show what NovaFides looked at on the date shown; they are not a guarantee.')}</p>
    </div></section>
  );
}
