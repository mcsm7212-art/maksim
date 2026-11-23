'use client';
import { useEffect } from 'react';
import { TRADES, type Trade } from '@/lib/catalog';
import { colorWord } from '@/lib/colors';
import Figure from './Figure';
import HeroJobs from './HeroJobs';
import { useT } from './I18n';

export type PreviewData = { name: string; trade: Trade; area: string; years: number; languages: string; bio: string; experience: string; skills: string; photo: string | null; figure: string | null; accent: string; jobs?: { id: string; name: string; price: number }[] };
const BIG: Record<Trade, string> = { plumbing: 'PLUMBING', electrical: 'ELECTRICAL', handyman: 'HANDYMAN', construction: 'CONSTRUCTION' };

/** "This is how clients will see your page": the top of the pro page built from what is typed in the form, before saving. */
export default function ProPreview({ d, onClose, onMirror, busy }: { d: PreviewData; onClose: () => void; onMirror?: () => void; busy?: boolean }) {
  const t = useT();
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  const skills = d.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12);
  return (
    <div className="pv" role="dialog" aria-modal="true" aria-label={t('Preview of your page')} onClick={onClose}>
      <div className="pv-box" onClick={(e) => e.stopPropagation()}>
        <div className="pv-top">
          <b>👁 {t('This is how clients will see your page')}</b>
          <span className="chips">
            {onMirror && (d.figure || d.photo) && <button type="button" className="btn ghost sm" onClick={onMirror} disabled={busy}>⇋ {t('Mirror')}</button>}
            <button type="button" className="btn sm" onClick={onClose}>{t('Back to editing')}</button>
          </span>
        </div>
        <div className={`themed ${document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}`} style={{ ['--acc' as string]: d.accent, borderRadius: 16, overflow: 'hidden' }}>
          <div className="pad"><div className="in" style={{ paddingBottom: 20 }}>
            <div className="ph3 phero2">
              <div style={{ minWidth: 0 }}>
                <div className="eyerow"><i />{t('Your pro. Their reputation.')}</div>
                <h1 className="pname">{d.name || t('Your name')}</h1>
                <span className="pco">{t('INDEPENDENT')}<br />{t(BIG[d.trade])}<b>.</b></span>
                <p className="ptag">{t('Behind every rating is a job.')}<br />{t('Behind every job is a person.')}</p>
                {d.area && <div className="locline">📍 {d.area} · San Francisco Bay Area</div>}
                <div className="hexlvl" title={t('Joined NovaFides during the launch')}><i /><div><small>NovaFides</small><b style={{ color: 'var(--cu-l)' }}>{t('Founding Pro')}</b></div></div>
                <HeroJobs title={t('Popular jobs')} from={t('from')} jobs={d.jobs ?? []} />
              </div>
              <div className="figcol">
                <div className="lbl">{t(TRADES[d.trade].name).toUpperCase()} / {t(colorWord(d.accent))}</div>
                <Figure name={d.name || 'You'} accent={d.accent} photo={d.photo} figure={d.figure} big />
              </div>
            </div>
            <div className="kp3" style={{ marginTop: 10 }}>
              <div><span className="num" style={{ fontSize: 'clamp(26px,5vw,36px)' }}>{t('Just joined')}</span><small>{t('on NovaFides, no reviews yet')}</small></div>
              <div><span className="num">{d.years || 0}</span><small>{t('years of experience')}</small></div>
              {d.languages && <div><span className="num" style={{ fontSize: 22 }}>{d.languages}</span><small>{t('Languages')}</small></div>}
            </div>
            {(d.bio || d.experience) && <div className="blk"><h2>{t('About {name}', { name: (d.name || '').split(' ')[0] || t('Your name') })}</h2>
              {d.bio && <p style={{ margin: '0 0 10px' }}>{d.bio}</p>}{d.experience && <p className="mu" style={{ margin: 0 }}>{d.experience}</p>}</div>}
            {skills.length > 0 && <div className="blk"><h2>{t('Skills')}</h2><div className="tags">{skills.map((s) => <span key={s}>{s}</span>)}</div></div>}
          </div></div>
        </div>
        {!d.figure && <p className="mu xs" style={{ margin: '10px 4px 0' }}>{t('Tip: add a full-height photo, and your page shows you standing in the glow of your clothes colour.')}</p>}
      </div>
    </div>
  );
}
