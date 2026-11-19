/* eslint-disable @next/next/no-img-element */
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { findPart, type PartSearchState } from '@/app/photo/actions';
import { TRADES, type Trade } from '@/lib/catalog';
import Figure from './Figure';
import { useT } from './I18n';
import { toJpeg } from './PhotoSearch';

/** "Find this part": photo of a part → what it is, exact part numbers, where to buy, and pros who installed it. */
export default function PartSearch() {
  const t = useT();
  const [busy, setBusy] = useState(false); const [preview, setPreview] = useState<string | null>(null);
  const [res, setRes] = useState<PartSearchState>(undefined);
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true); setRes(undefined);
    try { const b64 = await toJpeg(file); setPreview(`data:image/jpeg;base64,${b64}`); setRes(await findPart(b64)); }
    catch { setRes({ error: 'Could not read this photo. Try another one.' }); }
    setBusy(false);
  }
  const r = res && !res.error ? res : null;
  return (
    <div className="list" style={{ gap: 16 }}>
      <div className="photosearch card formcard">
        <label className="drop photo-drop">
          <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          {preview && <img src={preview} alt="" className="ps-prev" />}
          <span><b>🔩 {busy ? t('Identifying the part… (up to a minute)') : t(preview ? 'Try another photo' : 'Photograph the part')}</b><br />
            <span className="mu xs">{t('Old cartridge, valve, breaker, fill valve… Include the label or any numbers if you can see them.')}</span></span>
        </label>
        {res?.error && <span className="err">{t(res.error)}</span>}
        <span className="mu xs">{t('The photo is only used to recognize the problem and is not saved.')}</span>
      </div>

      {r && <>
        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <b style={{ fontSize: 18 }}>{r.summary}</b>
          <span className="mu sm">{[r.brand, r.partType].filter(Boolean).join(' · ')}{r.markings?.length ? ` · ${t('Markings')}: ${r.markings.join(', ')}` : ''}</span>
          {r.candidates && r.candidates.length > 0 && <div className="list" style={{ gap: 6 }}>
            <span className="mu xs">{t('Likely part numbers')}:</span>
            {r.candidates.map((c) => <div key={c.partNo} className="sm"><b className="num" style={{ fontSize: 18 }}>{c.partNo}</b> {c.name} {c.url && <a className="xs" href={c.url} target="_blank" rel="noreferrer nofollow">{t('source')}</a>}{c.why && <span className="mu xs"> · {c.why}</span>}</div>)}
          </div>}
          {r.tip && <div className="note" style={{ margin: 0 }}>📷 {r.tip}</div>}
          <span className="mu xs">{t('AI result: check the part number on the old part or ask a pro before buying.')}</span>
        </div>

        {r.links && r.links.length > 0 && <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>{t('Where to buy')}</b>
          {r.links.map((l) => <div key={l.query} className="list" style={{ gap: 4 }}><span className="sm">{l.query}</span>
            <div className="chips">{l.shops.map((s) => <a key={s.name} className="btn ghost sm" href={s.url} target="_blank" rel={s.sponsored ? 'noreferrer sponsored' : 'noreferrer'}>{s.name} ↗</a>)}</div></div>)}
          {r.affiliate && <span className="mu xs">{t('As an Amazon Associate, NovaFides earns from qualifying purchases.')}</span>}
        </div>}

        <h3 style={{ margin: '6px 0 0' }}>{t('Pros who installed this part')}</h3>
        <div className="list">
          {(r.installers ?? []).map((p) => (
            <Link key={p.slug} href={`/${p.slug}`} className="card coll" style={{ ['--acc' as string]: p.accent, textDecoration: 'none' }}>
              <span className="post-ava"><Figure name={p.name} accent={p.accent} photo={p.photoUrl} /></span>
              <span style={{ minWidth: 0, flex: 1 }}><b>{p.name}</b> {p.exact && <span className="badge ok">✓ {t('Same part number')}</span>}<br />
                <span className="mu xs">{t(TRADES[p.trade as Trade]?.name ?? '')} · {t('Installed {n} times', { n: p.times })}: {p.partNo ? `${p.partNo} · ` : ''}{p.partName}</span></span>
              {p.photo && <img src={p.photo} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10 }} />}
            </Link>))}
          {!(r.installers ?? []).length && <div className="card empty">{t('No pro has recorded this exact part yet. These pros do this kind of job:')}</div>}
          {(r.servicePros ?? []).map((p) => (
            <Link key={p.slug} href={`/${p.slug}`} className="card coll" style={{ ['--acc' as string]: p.accent, textDecoration: 'none' }}>
              <span className="post-ava"><Figure name={p.name} accent={p.accent} photo={p.photoUrl} /></span>
              <span><b>{p.name}</b><br /><span className="mu xs">{t(TRADES[p.trade as Trade]?.name ?? '')}{p.jobs ? ` · ${t('{n} such jobs on NovaFides', { n: p.jobs })}` : ''}</span></span>
            </Link>))}
        </div>
      </>}
    </div>
  );
}
