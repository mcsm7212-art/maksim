'use client';
import { useEffect, useState } from 'react';
import { avatarFrom, cropImage, cutOut, flipImage } from '@/lib/cutout';
import CropBox from './CropBox';
import PhotoTips from './PhotoTips';
import { findFeet } from './FigStand';
import { uploadBlob } from '@/lib/upload';
import { isLive } from '@/lib/supabase/config';
import Figure from './Figure';
import { useT } from './I18n';

const Arrow = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={dir === 'l' ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="M4 12a8 8 0 0 1 14-5.3" /><path d="M18 2.5v4.6h-4.6" /><path d="M20 12a8 8 0 0 1-14 5.3" opacity=".35" />
  </svg>
);

/**
 * One photo for the whole profile: a full-height phone photo. The background is removed in the browser, the glow colour
 * comes from the clothes, and the small square photo for cards and search is cut from it automatically.
 * Round arrows under the picture mirror it. Results go into hidden inputs and are saved with the form.
 */
export default function FigureField({ name, initialFigure, initialPhoto, accent, onAccent, onChange, bindMirror, required, draftKey, onPreview }: {
  name: string; initialFigure: string | null; initialPhoto: string | null; accent: string; onAccent: (c: string | null) => void; draftKey?: string;
  onChange?: (v: { figure: string | null; photo: string | null }) => void; bindMirror?: (fn: () => Promise<void>) => void; required?: boolean; onPreview?: () => void;
}) {
  const t = useT();
  const [fig, setFig] = useState<{ view: string | null; url: string | null }>({ view: initialFigure, url: initialFigure });
  const [ava, setAva] = useState<{ view: string | null; url: string }>({ view: initialPhoto, url: '' });
  const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const [crop, setCrop] = useState(false);
  const up = async (b: Blob, prefix: string) => (isLive() ? uploadBlob(b, prefix) : '');

  // Save a figure: upload it and cut the small photo from it.
  async function putFigure(b: Blob) {
    const fv = URL.createObjectURL(b); const av = URL.createObjectURL(await avatarFrom(fv));
    setFig({ view: fv, url: fig.url }); setAva({ view: av, url: ava.url }); onChange?.({ figure: fv, photo: av });
    const [fu, au] = await Promise.all([up(b, 'figure'), up(await (await fetch(av)).blob(), 'avatar')]);
    setFig({ view: fv, url: fu || null }); setAva({ view: av, url: au });
    if (fu) onChange?.({ figure: fu, photo: au || av });
  }
  async function pick(file?: File) {
    if (!file) return; setErr(null); setBusy(t('Removing the background… (the first time takes up to a minute)'));
    try {
      const c = await cutOut(file);
      if (c.personShare < 0.06) throw new Error('small');
      onAccent(c.accent); await putFigure(c.blob);
      await checkStance(c.blob);
    } catch {
      // No full-height person found: keep the photo as a simple picture (no figure).
      const v = URL.createObjectURL(file); const u = await up(file, 'avatar').catch(() => '');
      setFig({ view: null, url: null }); setAva({ view: v, url: u }); onAccent(null); onChange?.({ figure: null, photo: u || v });
      setErr(t('We could not find you in full height, so this photo is used as a simple picture. For the glowing figure, take a photo from head to shoes.'));
    }
    setBusy(null);
  }
  // Shoes not in the photo: suggest another one (only a hint, the photo is kept).
  async function checkStance(b: Blob) {
    try {
      const img = new Image(); img.src = URL.createObjectURL(b); await img.decode();
      const st = findFeet(img);
      if (!st) setErr(t('We could not find your shoes in the photo. For the best page, take the photo from head to shoes, with a little floor under them.'));
    } catch { /* no check */ }
  }
  async function mirror() {
    setErr(null); setBusy(t('Mirroring…'));
    try {
      if (fig.view) await putFigure(await flipImage(fig.view));
      else if (ava.view) { const b = await flipImage(ava.view); const v = URL.createObjectURL(b); const u = await up(b, 'avatar'); setAva({ view: v, url: u }); onChange?.({ figure: null, photo: u || v }); }
    } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  }
  async function applyCrop(r: { x: number; y: number; w: number; h: number }) {
    setCrop(false); setErr(null); setBusy(t('Cropping…'));
    try {
      if (fig.view) await putFigure(await cropImage(fig.view, r));
      else if (ava.view) { const b = await cropImage(ava.view, r); const v = URL.createObjectURL(b); const u = await up(b, 'avatar'); setAva({ view: v, url: u }); onChange?.({ figure: null, photo: u || v }); }
    } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  }
  useEffect(() => { bindMirror?.(mirror); });
  // Keep the uploaded photo in the draft too: it comes back after a reload or a language switch.
  useEffect(() => {
    if (!draftKey) return;
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) ?? 'null') as { figure: string | null; photo: string; accent: string | null } | null;
      if (d && (d.figure || d.photo)) {
        setFig({ view: d.figure, url: d.figure }); setAva({ view: d.photo || null, url: d.photo });
        if (d.accent) onAccent(d.accent); onChange?.({ figure: d.figure, photo: d.photo || null });
      }
    } catch { /* no draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!draftKey) return;
    // Only uploaded addresses are kept (local previews die with the page).
    try { if (fig.url || ava.url) localStorage.setItem(draftKey, JSON.stringify({ figure: fig.url, photo: ava.url, accent: fig.url ? accent : null })); } catch { /* storage off */ }
  }, [draftKey, fig.url, ava.url, accent]);
  const has = Boolean(fig.view || ava.view);
  return (
    <div className="figfield">
      <div>
        {crop && (fig.view || ava.view) ? <CropBox src={(fig.view || ava.view)!} onDone={applyCrop} onCancel={() => setCrop(false)} /> : <>
        <div className="figmaker-stage" style={{ ['--acc' as string]: accent }}>
          {has ? <Figure name={name || 'You'} accent={accent} figure={fig.view} photo={fig.view ? null : ava.view} big={Boolean(fig.view)} />
            : <div className="mu sm" style={{ padding: 20, textAlign: 'center' }}>{t('No photo yet')}</div>}
        </div>
        {has && <div className="flipbar">
          <button type="button" className="flipbtn" onClick={mirror} disabled={!!busy} title={t('Mirror')} aria-label={t('Mirror')}><Arrow dir="l" /></button>
          <span className="mu xs">{t('Mirror')}</span>
          <button type="button" className="flipbtn" onClick={mirror} disabled={!!busy} title={t('Mirror')} aria-label={t('Mirror')}><Arrow dir="r" /></button>
          <button type="button" className="btn ghost sm cropbtn" onClick={() => setCrop(true)} disabled={!!busy}>✂ {t('Crop')}</button>
          {onPreview && <button type="button" className="btn ghost sm cropbtn" onClick={onPreview} disabled={!!busy}>👁 {t('Preview my page')}</button>}
        </div>}
        </>}
      </div>
      <div className="list" style={{ gap: 8 }}>
        <b>{t('Your photo')}</b>
        <span className="mu xs">{t('One photo is enough: standing, head to shoes, in work clothes. We remove the background on your device, light you up in the colour of your clothes, and make the small picture for cards and search from the same photo.')}</span>
        <label className="drop">
          <input type="file" accept="image/*" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} disabled={!!busy} required={required && !has} />
          <span><b>{busy ?? (has ? t('Choose another photo') : t('Choose a photo'))}</b><br /><span className="mu xs">{t('JPG or PNG from your phone')}</span></span>
        </label>
        {ava.view && fig.view && <span className="ava-mini"><img src={ava.view} alt="" /> <span className="mu xs">{t('Small picture for cards and search (made automatically)')}</span></span>}
        {err && <span className="note xs">{err}</span>}
        <PhotoTips open={!has} />
        <input type="hidden" name="figure_url" value={fig.url ?? ''} />
        <input type="hidden" name="figure_accent" value={fig.view ? accent : ''} />
        <input type="hidden" name="photo_override" value={ava.url} />
      </div>
    </div>
  );
}
