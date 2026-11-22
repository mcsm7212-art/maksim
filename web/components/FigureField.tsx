'use client';
import { useEffect, useState } from 'react';
import { cutOut, flipImage } from '@/lib/cutout';
import { uploadBlob } from '@/lib/upload';
import { isLive } from '@/lib/supabase/config';
import Figure from './Figure';
import { useT } from './I18n';

/**
 * Full-height photo inside the profile form: the background is removed in the browser, the glow colour comes from the clothes,
 * and "Mirror" flips it. The result goes into hidden inputs (figure_url, figure_accent) and is saved with the form.
 */
export default function FigureField({ name, initial, accent, onAccent, onChange, bindMirror }: { name: string; initial: string | null; accent: string; onAccent: (c: string) => void; onChange?: (url: string | null) => void; bindMirror?: (fn: () => Promise<void>) => void }) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(initial);   // saved (uploaded) address
  const [view, setView] = useState<string | null>(initial); // what we show (may be a local preview)
  const [glow, setGlow] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const put = async (blob: Blob) => {
    const local = URL.createObjectURL(blob); setView(local); onChange?.(local);
    if (!isLive()) { setUrl(null); return; }
    const u = await uploadBlob(blob, 'figure'); setUrl(u); onChange?.(u);
  };
  async function pick(file?: File) {
    if (!file) return; setErr(null); setBusy(t('Removing the background… (the first time takes up to a minute)'));
    try {
      const c = await cutOut(file);
      if (c.personShare < 0.06) throw new Error(t('Stand farther back? We need you in full height, head to shoes.'));
      setGlow(c.accent); onAccent(c.accent); await put(c.blob);
    } catch (e) { setErr((e as Error).message || t('Could not find a person in this photo.')); }
    setBusy(null);
  }
  async function mirror() {
    if (!view) return; setErr(null); setBusy(t('Mirroring…'));
    try { await put(await flipImage(view)); } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  }
  useEffect(() => { bindMirror?.(mirror); });
  return (
    <div className="figfield">
      <div className="figmaker-stage" style={{ ['--acc' as string]: accent }}>
        {view ? <Figure name={name || 'You'} accent={accent} figure={view} big /> : <div className="mu sm" style={{ padding: 20, textAlign: 'center' }}>{t('No full-height photo yet')}</div>}
      </div>
      <div className="list" style={{ gap: 8 }}>
        <b>{t('Full-height photo for your page')}</b>
        <span className="mu xs">{t('Any phone photo, standing, head to shoes, in work clothes. We remove the background automatically on your device. You do not need to do anything before.')}</span>
        <label className="drop">
          <input type="file" accept="image/*" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} disabled={!!busy} />
          <span><b>{busy ?? (view ? t('Choose another photo') : t('Choose a full-height photo'))}</b><br /><span className="mu xs">{t('JPG or PNG from your phone')}</span></span>
        </label>
        {view && <div className="chips">
          <button type="button" className="btn ghost sm" onClick={mirror} disabled={!!busy}>⇋ {t('Mirror')}</button>
          <button type="button" className="btn ghost sm" onClick={() => { setUrl(null); setView(null); onChange?.(null); }} disabled={!!busy}>{t('Remove')}</button>
        </div>}
        {err && <span className="err xs">{err}</span>}
        <input type="hidden" name="figure_url" value={url ?? ''} />
        <input type="hidden" name="figure_accent" value={glow} />
      </div>
    </div>
  );
}
