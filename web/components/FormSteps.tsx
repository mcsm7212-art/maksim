'use client';
import { useEffect, useState, type RefObject } from 'react';
import { useT } from './I18n';

type Step = { id: string; title: string; done: boolean };
/** Is something filled in this part of the form? Required fields decide; without them, any filled field counts. */
function filled(c: HTMLElement): boolean {
  const els = [...c.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')].filter((e) => e.type !== 'file' && e.type !== 'radio');
  const has = (e: HTMLInputElement | HTMLTextAreaElement) => (e.type === 'checkbox' ? (e as HTMLInputElement).checked : e.value.trim().length > 0);
  const req = els.filter((e) => e.required);
  return req.length ? req.every(has) : els.some(has);
}

/**
 * A long form shown as steps: a bar under the header says "Step 3 of 8", shows what is already filled,
 * lets the person jump to any part and has a "Next" button. The form itself stays one page, so nothing is lost.
 */
export default function FormSteps({ form }: { form: RefObject<HTMLFormElement | null> }) {
  const t = useT();
  const [steps, setSteps] = useState<Step[]>([]); const [cur, setCur] = useState(0);
  useEffect(() => {
    const f = form.current; if (!f) return;
    const scan = () => {
      const cards = [...f.querySelectorAll<HTMLElement>('[data-step]')];
      cards.forEach((c, i) => { if (!c.id) c.id = `step-${i + 1}`; });
      let k = 0; cards.forEach((c, i) => { if (c.getBoundingClientRect().top < window.innerHeight * 0.45) k = i; });
      setCur(k);
      setSteps((old) => { const next = cards.map((c) => ({ id: c.id, title: c.dataset.step ?? '', done: filled(c) })); return JSON.stringify(old) === JSON.stringify(next) ? old : next; });
    };
    scan(); let raf = 0; const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); };
    window.addEventListener('scroll', on, { passive: true }); f.addEventListener('input', on); f.addEventListener('change', on);
    const id = setInterval(scan, 2000); // photos and the map change the form without an input event
    return () => { window.removeEventListener('scroll', on); f.removeEventListener('input', on); f.removeEventListener('change', on); clearInterval(id); cancelAnimationFrame(raf); };
  }, [form]);
  if (steps.length < 3) return null;
  const go = (i: number) => document.getElementById(steps[i].id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const done = steps.filter((s) => s.done).length;
  return (
    <nav className="fsteps" aria-label={t('Steps of the form')}>
      <div className="fsteps-top">
        <span className="fsteps-now"><b>{t('Step {k} of {n}', { k: cur + 1, n: steps.length })}</b> · {steps[cur].title}</span>
        {cur < steps.length - 1 && <button type="button" className="btn ghost sm" onClick={() => go(cur + 1)}>{t('Next')}: {steps[cur + 1].title} ↓</button>}
      </div>
      <div className="fsteps-dots">
        {steps.map((s, i) => <button type="button" key={s.id} className={`${s.done ? 'done' : ''}${i === cur ? ' now' : ''}`} onClick={() => go(i)} title={`${i + 1}. ${s.title}${s.done ? ' ✓' : ''}`} aria-label={`${i + 1}. ${s.title}`} aria-current={i === cur ? 'step' : undefined}>{s.done ? '✓' : i + 1}</button>)}
        <span className="mu xs">{t('{k} of {n} filled', { k: done, n: steps.length })}</span>
      </div>
    </nav>
  );
}
