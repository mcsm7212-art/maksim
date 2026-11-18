/* eslint-disable @next/next/no-img-element */
'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveFigure } from '@/app/account/actions';
import { colorWord } from '@/lib/colors';
import { cutOut } from '@/lib/cutout';
import { uploadBlob } from '@/lib/upload';
import { isLive } from '@/lib/supabase/config';
import Figure from './Figure';
import { useT } from './I18n';

/** Pro uploads an ordinary full-height phone photo; the background is removed in the browser and the glow colour comes from the clothes. */
export default function FigureMaker({ name, initial, accent: initialAccent, trade }: { name: string; initial: string | null; accent: string; trade: string }) {
  const t = useT(); const router = useRouter();
  const [fig, setFig] = useState<string | null>(initial);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [accent, setAccent] = useState(initialAccent);
  const [auto, setAuto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();

  async function pick(file: File | undefined) {
    if (!file) return;
    setMsg(null); setBusy(t('Removing the background… (the first time takes up to a minute)'));
    try {
      const c = await cutOut(file);
      if (c.personShare < 0.06) throw new Error(t('Stand farther back? We need you in full height, head to shoes.'));
      setFig(c.preview); setBlob(c.blob); setAccent(c.accent); setAuto(c.accent);
    } catch (e) { setMsg({ error: (e as Error).message || t('Could not find a person in this photo.') }); }
    setBusy(null);
  }
  const save = () => start(async () => {
    setMsg(null);
    try {
      const fd = new FormData();
      if (blob) { if (!isLive()) { setMsg({ error: t('Demo mode: nothing was saved. Connect the database to accept real sign-ups.') }); return; } fd.set('figure_url', await uploadBlob(blob, 'figure')); }
      else if (fig) fd.set('figure_url', fig);
      fd.set('accent', accent);
      const r = await saveFigure(fd); setMsg({ ok: r.ok && t(r.ok), error: r.error && t(r.error) });
      if (r.ok) { setBlob(null); router.refresh(); }
    } catch (e) { setMsg({ error: (e as Error).message }); }
  });
  const remove = () => start(async () => {
    const fd = new FormData(); const r = await saveFigure(fd);
    setMsg({ ok: r.ok && t(r.ok), error: r.error && t(r.error) }); if (r.ok) { setFig(null); setBlob(null); router.refresh(); }
  });

  return (
    <div className="card formcard figmaker">
      <b>{t('Full-height photo for your page')}</b>
      <span className="mu sm">{t('Take a photo standing, head to shoes, in your work clothes, against a plain wall. We remove the background and light you up in the colour of your clothes. The photo is processed on your phone.')}</span>
      <div className="figmaker-grid">
        <div className="figmaker-stage" style={{ ['--acc' as string]: accent }}>
          {fig ? <Figure name={name} accent={accent} figure={fig} big /> : <div className="mu sm" style={{ padding: 20, textAlign: 'center' }}>{t('No full-height photo yet')}</div>}
          {fig && <div className="lbl">{t(trade).toUpperCase()} / {t(colorWord(accent))}</div>}
        </div>
        <div className="list" style={{ gap: 10 }}>
          <label className="drop">
            <input type="file" accept="image/*" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} disabled={!!busy || pending} />
            <span><b>{busy ?? (fig ? t('Choose another photo') : t('Choose a full-height photo'))}</b><br /><span className="mu xs">{t('JPG or PNG from your phone')}</span></span>
          </label>
          {fig && <label className="sm" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value.toUpperCase())} style={{ width: 44, height: 32, border: 0, background: 'none' }} aria-label={t('Glow colour')} />
            {t('Glow colour')}{auto && accent !== auto && <button type="button" className="btn ghost sm" onClick={() => setAccent(auto)}>{t('From my clothes')}</button>}
          </label>}
          <div className="chips">
            {fig && <button type="button" className="btn sm" disabled={pending || !!busy} onClick={save}>{pending ? t('Saving…') : t('Save')}</button>}
            {initial && <button type="button" className="btn ghost sm" disabled={pending || !!busy} onClick={remove}>{t('Remove')}</button>}
          </div>
          {msg?.error && <span className="err">{msg.error}</span>}
          {msg?.ok && <span className="okmsg">{msg.ok}</span>}
        </div>
      </div>
    </div>
  );
}
