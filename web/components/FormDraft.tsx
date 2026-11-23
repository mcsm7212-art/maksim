'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useT } from './I18n';

type Saved = Record<string, string | boolean>;
const NON_LATIN = /[Ѐ-ӿ֐-ۿ一-鿿]/; // Cyrillic, Hebrew/Arabic, Chinese
const setVal = (el: HTMLInputElement | HTMLTextAreaElement, v: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
/** Deletes a draft and its parts (photo, own services, map, work photos). */
const clearDraft = (key: string) => { try { for (const k of ['', '_photo', '_custom', '_map', '_work']) localStorage.removeItem(key + k); } catch { /* storage off */ } };
const fields = (f: HTMLFormElement) => [...f.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[name], textarea[name]')]
  .filter((el) => !['hidden', 'file', 'password', 'submit'].includes((el as HTMLInputElement).type));
const isText = (el: HTMLInputElement | HTMLTextAreaElement) => el instanceof HTMLTextAreaElement || ['text', 'search', ''].includes(el.type);

/**
 * Keeps what a person typed in a form: saved in this browser as they type, put back after a reload, a language switch
 * or a failed save. Also warns when text is not in English. `done` = the form was saved, so the draft is deleted.
 */
export default function FormDraft({ form, id, done, again }: { form: RefObject<HTMLFormElement | null>; id: string; done?: boolean; again?: unknown }) {
  const t = useT(); const key = `nf_draft_${id}`;
  const [restored, setRestored] = useState(false); const [foreign, setForeign] = useState<string[]>([]);
  const ready = useRef(false);
  const check = () => {
    const f = form.current; if (!f) return;
    setForeign(fields(f).filter((el) => isText(el) && NON_LATIN.test(el.value)).map((el) => (el.closest('label')?.childNodes[0]?.textContent ?? el.name).trim()));
  };
  const restore = () => {
    const f = form.current; if (!f) return false;
    let data: Saved = {}; try { data = JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { return false; }
    if (!Object.keys(data).length) return ['_photo', '_map', '_work'].some((k) => !['', '[]', 'null', '{"pts":null}'].includes(localStorage.getItem(key + k) ?? ''));
    const els = fields(f);
    // Radios first (the trade decides which services are shown), then everything else.
    els.filter((el) => el.type === 'radio' && data[`${el.name}=${el.value}`] === true && !(el as HTMLInputElement).checked).forEach((el) => (el as HTMLInputElement).click());
    setTimeout(() => {
      // Read the draft again: the person may have changed something in the meantime (e.g. unticked a job right after an error).
      try { data = JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { /* keep the first read */ }
      fields(f).forEach((el) => {
        if (el.type === 'radio') return;
        if (el.type === 'checkbox') { const v = data[el.name]; if (typeof v === 'boolean' && (el as HTMLInputElement).checked !== v) (el as HTMLInputElement).click(); }
        else if (typeof data[el.name] === 'string' && el.value !== data[el.name]) setVal(el, data[el.name] as string);
      });
      check();
    }, 80);
    return true;
  };
  // Put the draft back once the form is on screen.
  useEffect(() => {
    const f = form.current; if (!f) return;
    if (id === 'pro-edit') clearDraft('nf_draft_pro-new'); // the new-profile draft is no longer needed
    if (done) clearDraft(key);
    else if (restore()) setRestored(true);
    ready.current = true;
    const save = () => {
      if (!ready.current) return;
      const out: Saved = {};
      fields(f).forEach((el) => {
        if (el.type === 'radio') { if ((el as HTMLInputElement).checked) out[`${el.name}=${el.value}`] = true; }
        else if (el.type === 'checkbox') out[el.name] = (el as HTMLInputElement).checked;
        else out[el.name] = el.value;
      });
      try { localStorage.setItem(key, JSON.stringify(out)); } catch { /* storage full or off */ }
      check();
    };
    f.addEventListener('input', save); f.addEventListener('change', save); check();
    return () => { f.removeEventListener('input', save); f.removeEventListener('change', save); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  // After a failed save React clears the form: put the draft back.
  useEffect(() => { if (again) restore(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [again]);

  return <>
    {restored && <div className="note xs draft-note">↺ {t('We kept what you typed before. Nothing is saved on the site until you press Save.')} <button type="button" className="linkbtn xs" onClick={() => { clearDraft(key); location.reload(); }}>{t('Start over')}</button></div>}
    {foreign.length > 0 && <div className="note xs en-warn">⚠ {t('Please write in English. Most clients in the Bay Area read English. Not in English yet:')} <b>{foreign.join(', ')}</b></div>}
  </>;
}

/** Trash button in the bottom-right corner of a text field: empties it in one click. */
export function ClearBtn() {
  const t = useT();
  return (
    <button type="button" className="clear-btn" title={t('Clear this field')} aria-label={t('Clear this field')} tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => { const el = (e.currentTarget.previousElementSibling as HTMLInputElement | HTMLTextAreaElement | null); if (el) { setVal(el, ''); el.focus(); } }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
    </button>
  );
}
