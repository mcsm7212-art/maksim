'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useT } from './I18n';

const SORT_LABEL: Record<string, string> = {
  best: 'Best for you', rating: 'Top rated', near: 'Nearest', similar: 'Chosen by similar clients',
  soon: 'Available soonest', price: 'Lowest price', fast: 'Fastest reply', jobs: 'Most jobs',
};
const MAIN = ['best', 'near', 'soon', 'price']; // always on screen; the rest are under "More"
const FILTER_GROUPS: [string, [string, string][]][] = [
  ['When', [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['weekend', 'Weekend'], ['urgent', '⚡ Urgent calls']]],
  ['Where', [['area', '📍 Works in my area']]],
  ['Checks', [['lic', 'License checked'], ['id', 'ID checked'], ['ins', 'Insured']]],
  ['Who', [['solo', 'Independent pro'], ['co', 'Company']]],
  ['Quality', [['r45', '★ 4.5+'], ['photos', 'Has work photos'], ['mine', '♥ My pros']]],
];

/** Sort and filters for the search results. The choice is remembered for next time. */
export default function SearchControls({ sort, filters, langs, lang, max, hasPrice }: { sort: string; filters: string[]; langs: string[]; lang: string; max: string; hasPrice: boolean }) {
  const t = useT(); const router = useRouter(); const path = usePathname(); const sp = useSearchParams();
  const go = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    const keep = new URLSearchParams(); ['sort', 'f', 'lang', 'max'].forEach((k) => { const v = p.get(k); if (v) keep.set(k, v); });
    try { document.cookie = `nf_sf=${encodeURIComponent(keep.toString())}; path=/; max-age=31536000; samesite=lax`; } catch { /* cookies off */ }
    p.set('sf', '1');
    router.replace(`${path}?${p}`, { scroll: false });
  };
  const toggle = (f: string) => { const s = new Set(filters); if (s.has(f)) s.delete(f); else s.add(f); go({ f: [...s].join(',') || null }); };
  return (
    <div className="sctl">
      <div className="sctl-sort" role="group" aria-label={t('Show first')}>
        <span>{t('Show first')}</span>
        {MAIN.map((k) => <button type="button" key={k} className="chip" aria-pressed={sort === k} onClick={() => go({ sort: k === 'best' ? null : k })}>{t(SORT_LABEL[k])}</button>)}
        <select className="inp" value={MAIN.includes(sort) ? '' : sort} onChange={(e) => go({ sort: e.target.value || null })} aria-label={t('More ways to sort')}>
          <option value="">{t('More')}…</option>
          {Object.entries(SORT_LABEL).filter(([k]) => !MAIN.includes(k)).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
        </select>
      </div>
      <span className="mu xs sctl-why">{t('“Best for you” puts first the pros who work in your area, your saved pros, those with open time and a steady rating. Places in the list are never sold.')}</span>
      <details className="sctl-f" open={filters.length > 0 || Boolean(lang) || Boolean(max)}>
        <summary>{t('Filters')}{filters.length + (lang ? 1 : 0) + (max ? 1 : 0) > 0 ? ` · ${filters.length + (lang ? 1 : 0) + (max ? 1 : 0)}` : ''}</summary>
        {FILTER_GROUPS.map(([g, items]) => (
          <div key={g} className="sctl-row"><span className="mu xs">{t(g)}</span>
            {items.map(([k, v]) => <button type="button" key={k} className="chip" aria-pressed={filters.includes(k)} onClick={() => toggle(k)}>{t(v)}</button>)}
          </div>))}
        {langs.length > 1 && <div className="sctl-row"><span className="mu xs">{t('Language')}</span>
          {langs.map((l) => <button type="button" key={l} className="chip" aria-pressed={lang === l} onClick={() => go({ lang: lang === l ? null : l })}>{l}</button>)}</div>}
        {hasPrice && <div className="sctl-row"><span className="mu xs">{t('Price up to')}</span>
          {['200', '400', '800', '1500'].map((m) => <button type="button" key={m} className="chip" aria-pressed={max === m} onClick={() => go({ max: max === m ? null : m })}>${Number(m).toLocaleString('en-US')}</button>)}</div>}
        {(filters.length > 0 || lang || max) && <button type="button" className="linkbtn xs" onClick={() => go({ f: null, lang: null, max: null })}>{t('Clear filters')}</button>}
      </details>
    </div>
  );
}
