'use client';
import { useEffect, useState } from 'react';
import { useT } from './I18n';

// Up to 3 pros picked for side-by-side comparison, kept in this browser.
const KEY = 'nf_cmp';
type Item = { slug: string; name: string };
const read = (): Item[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };
const write = (v: Item[]) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage off */ } window.dispatchEvent(new Event('nf-cmp')); };
function useItems() {
  const [items, set] = useState<Item[]>([]);
  useEffect(() => { const f = () => set(read()); f(); window.addEventListener('nf-cmp', f); return () => window.removeEventListener('nf-cmp', f); }, []);
  return items;
}

export default function CompareToggle({ slug, name }: { slug: string; name: string }) {
  const t = useT(); const items = useItems(); const on = items.some((x) => x.slug === slug);
  const full = !on && items.length >= 3;
  return (
    <label className={`cmp-t${on ? ' on' : ''}`} title={full ? t('You can compare up to 3 pros') : undefined}>
      <input type="checkbox" checked={on} disabled={full} onChange={() => write(on ? items.filter((x) => x.slug !== slug) : [...items, { slug, name }])} />
      {t('Compare')}
    </label>
  );
}

export function CompareBar({ label }: { label: string }) {
  const t = useT(); const items = useItems();
  if (!items.length) return null;
  return (
    <><div className="cmp-space" aria-hidden />
    <div className="cmp-bar" role="region" aria-label={label}>
      <span className="sm">{items.map((x) => x.name.split(' ')[0]).join(' · ')}</span>
      {items.length >= 2 ? <a className="btn sm" href={`/compare?p=${items.map((x) => x.slug).join(',')}`}>{t('Compare')} ({items.length}) →</a> : <span className="mu xs">{t('Pick one more pro')}</span>}
      <button type="button" className="linkbtn xs" onClick={() => write([])}>✕</button>
    </div></>
  );
}
