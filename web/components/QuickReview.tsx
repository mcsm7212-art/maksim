'use client';
import { useState } from 'react';
import { submitReview } from '@/app/account/actions';
import { useT } from './I18n';

const SKILLS = [['punctuality', 'Punctuality'], ['workmanship', 'Workmanship'], ['cleanliness', 'Cleanliness'], ['communication', 'Communication'], ['pricing', 'Pricing transparency']] as const;
/** Rating in one tap: a star sets all five skills; "rate each skill" and a comment are optional. */
export default function QuickReview({ id, name }: { id: string; name: string }) {
  const t = useT();
  const [n, setN] = useState(0); const [hover, setHover] = useState(0); const [each, setEach] = useState(false);
  const [sk, setSk] = useState<Record<string, number>>({});
  const pick = (v: number) => { setN(v); setSk(Object.fromEntries(SKILLS.map(([k]) => [k, v]))); };
  return (
    <form action={submitReview} className="card quick-review" id="rate">
      <input type="hidden" name="id" value={id} />
      <b>★ {t('How was the job with {name}?', { name })}</b>
      <div className="star-pick" role="radiogroup" aria-label={t('Your rating')} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((v) => <button type="button" key={v} role="radio" aria-checked={n === v} aria-label={`${v}`} className={(hover || n) >= v ? 'on' : ''} onMouseEnter={() => setHover(v)} onClick={() => pick(v)}>★</button>)}
      </div>
      {SKILLS.map(([k]) => <input key={k} type="hidden" name={k} value={sk[k] ?? n} />)}
      {n > 0 && <>
        {each
          ? <div className="qr-each">{SKILLS.map(([k, l]) => <label key={k}>{t(l)}<select className="inp" value={sk[k] ?? n} onChange={(e) => setSk({ ...sk, [k]: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{'★'.repeat(v)} {v}</option>)}</select></label>)}</div>
          : <button type="button" className="linkbtn xs" onClick={() => setEach(true)}>{t('Rate each skill separately')} →</button>}
        <textarea className="inp" name="body" maxLength={2000} placeholder={t('What went well or wrong? (optional)')} style={{ minHeight: 60 }} />
        <label className="sm" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" name="again" value="0" /> {t('I would not hire this pro again (only NovaFides sees this)')}</label>
        <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{t('Post review')}</button>
        <span className="mu xs">{t('Honest reviews are never removed for being negative. Your review shows your first name and last initial.')}</span>
      </>}
    </form>
  );
}
