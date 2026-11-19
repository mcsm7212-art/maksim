/* eslint-disable @next/next/no-img-element */
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { searchByPhoto } from '@/app/photo/actions';
import { useT } from './I18n';

/** Shrinks a photo to ~1024 px JPEG in the browser (phone photos are 3–8 MB). Returns base64 without the data: prefix. */
export async function toJpeg(file: File, max = 1024): Promise<string> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82).split(',')[1];
}

/** "Search by photo": the client takes or picks a photo of the problem; we find the job and pros who did it. */
export default function PhotoSearch({ compact }: { compact?: boolean }) {
  const t = useT(); const router = useRouter();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => { try { setPreview(sessionStorage.getItem('nf_photo')); } catch { /* private mode */ } }, []);
  async function pick(file?: File) {
    if (!file) return;
    setErr(null); setBusy(true);
    try {
      const b64 = await toJpeg(file);
      const url = `data:image/jpeg;base64,${b64}`; setPreview(url);
      try { sessionStorage.setItem('nf_photo', url); } catch { /* too big or private mode: preview only on this screen */ }
      const r = await searchByPhoto(b64);
      if (!r || r.error) { setErr(t(r?.error ?? 'Could not read this photo. Try another one.')); setBusy(false); return; }
      const q = new URLSearchParams({ svc: r.services!.join(','), s: r.summary ?? '' });
      if (r.urgent) q.set('u', '1'); if (r.safety) q.set('tip', r.safety);
      router.push(`/photo?${q}`);
    } catch { setErr(t('Could not read this photo. Try another one.')); }
    setBusy(false);
  }
  return (
    <div className={compact ? 'photosearch compact' : 'photosearch card formcard'}>
      <label className="drop photo-drop">
        <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        {preview && !compact && <img src={preview} alt="" className="ps-prev" />}
        <span><b>📷 {busy ? t('Looking at your photo…') : t(preview ? 'Try another photo' : 'Search by photo')}</b><br />
          <span className="mu xs">{t('Take a photo of the problem: a leak, a broken outlet, a crack. We find the job and pros who have done it.')}</span></span>
      </label>
      {err && <span className="err">{err}</span>}
      {!compact && <span className="mu xs">{t('The photo is only used to recognize the problem and is not saved.')}</span>}
    </div>
  );
}
