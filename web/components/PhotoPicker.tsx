/* eslint-disable @next/next/no-img-element */
'use client';
import { useState } from 'react';
import { isLive } from '@/lib/supabase/config';
import { uploadPhotos } from '@/lib/upload';
import { useT } from './I18n';

/** Picks photos, uploads them right away, and puts their URLs into hidden inputs named `name`. */
export default function PhotoPicker({ name, max = 1, prefix, label, onChange, required }: {
  name: string; max?: number; prefix: string; label: string; onChange?: (previews: string[]) => void; required?: boolean;
}) {
  const [items, setItems] = useState<{ url: string; preview: string }[]>([]);
  const [busy, setBusy] = useState(false); const t = useT();
  const [err, setErr] = useState<string | null>(null);
  const set = (next: typeof items) => { setItems(next); onChange?.(next.map((i) => i.preview)); };

  async function pick(list: FileList | null) {
    if (!list?.length) return;
    const files = [...list].slice(0, max - (max === 1 ? 0 : items.length));
    setErr(null); setBusy(true);
    try {
      const urls = isLive() ? await uploadPhotos(files, prefix) : files.map(() => '');
      const added = files.map((f, i) => ({ url: urls[i] ?? '', preview: URL.createObjectURL(f) }));
      set(max === 1 ? added.slice(0, 1) : [...items, ...added].slice(0, max));
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="list" style={{ gap: 8 }}>
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
