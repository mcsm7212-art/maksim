/* eslint-disable @next/next/no-img-element */
'use client';
import { useEffect, useRef, useState } from 'react';
import { isLive } from '@/lib/supabase/config';
import { uploadPhotos } from '@/lib/upload';
import { useT } from './I18n';

/** Picks photos, uploads them right away, and puts their URLs into hidden inputs named `name`. */
export default function PhotoPicker({ name, max = 1, prefix, label, onChange, required, draftKey, lazy }: {
  name: string; max?: number; prefix: string; label: string; onChange?: (previews: string[]) => void; required?: boolean; draftKey?: string; lazy?: boolean;
}) {
  const [items, setItems] = useState<{ url: string; preview: string; file?: File }[]>([]);
  const root = useRef<HTMLDivElement>(null); const itemsRef = useRef(items); itemsRef.current = items;
  const [busy, setBusy] = useState(false); const t = useT();
  const [err, setErr] = useState<string | null>(null);
  const set = (next: typeof items) => { setItems(next); onChange?.(next.map((i) => i.preview)); };
  // Uploaded photos stay in the draft: they come back after a reload or a language switch (until the form is saved).
  const loaded = useRef(false);
  useEffect(() => {
    if (!draftKey) return;
    try { const urls = JSON.parse(localStorage.getItem(draftKey) ?? '[]') as string[]; if (Array.isArray(urls) && urls.length) set(urls.filter((u) => typeof u === 'string' && u.startsWith('http')).slice(0, max).map((u) => ({ url: u, preview: u }))); } catch { /* no draft */ }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!draftKey || !loaded.current) return;
    try { const urls = items.map((i) => i.url).filter(Boolean); if (urls.length) localStorage.setItem(draftKey, JSON.stringify(urls)); else localStorage.removeItem(draftKey); } catch { /* storage off */ }
  }, [items, draftKey]);

  async function pick(list: FileList | null) {
    if (!list?.length) return;
    const files = [...list].slice(0, max - (max === 1 ? 0 : items.length));
    setErr(null); setBusy(true);
    try {
      const urls = isLive() && !lazy ? await uploadPhotos(files, prefix) : files.map(() => '');
      const added = files.map((f, i) => ({ url: urls[i] ?? '', preview: URL.createObjectURL(f), file: lazy ? f : undefined }));
      set(max === 1 ? added.slice(0, 1) : [...items, ...added].slice(0, max));
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  // `lazy` (a guest who is not signed in yet): the photos wait in the browser; the form uploads them right after sign-in.
  useEffect(() => {
    if (!lazy) return;
    const form = root.current?.closest('form') as (HTMLFormElement & { nfFlush?: () => Promise<void> }) | null; if (!form) return;
    form.nfFlush = async () => {
      const cur = itemsRef.current; const wait = cur.filter((i) => i.file && !i.url); if (!wait.length) return;
      const urls = await uploadPhotos(wait.map((i) => i.file!), prefix);
      const next = cur.map((i) => { const k = wait.indexOf(i); return k >= 0 ? { ...i, url: urls[k] ?? '' } : i; });
      await new Promise<void>((ok) => { setItems(next); setTimeout(ok, 60); });
    };
    return () => { delete form.nfFlush; };
  }, [lazy, prefix]);
  return (
    <div className="list" style={{ gap: 8 }} ref={root}>
      <label className="drop">
        <input type="file" accept="image/*" multiple={max > 1} onChange={(e) => { pick(e.target.files); e.target.value = ''; }} required={required && !items.length} />
        <span><b>{busy ? t('Uploading…') : label}</b><br /><span className="mu xs">{max > 1 ? t('{n} of up to {max} photos', { n: items.length, max }) : items.length ? t('Tap to replace') : t('JPG or PNG from your phone')}</span></span>
      </label>
      {max > 1 && items.length > 0 && (
        <div className="works" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(84px,1fr))' }}>
          {items.map((it, i) => (
            <button type="button" key={it.preview} className="work" onClick={() => set(items.filter((_, k) => k !== i))} title={t('Remove')}>
              <img src={it.preview} alt="" style={{ aspectRatio: '1', objectFit: 'cover' }} /><span className="xs mu">{t('Remove')}</span>
            </button>
          ))}
        </div>
      )}
      {items.filter((i) => i.url).map((i) => <input key={i.url} type="hidden" name={name} value={i.url} />)}
      {err && <span className="err">{err}</span>}
    </div>
  );
}
