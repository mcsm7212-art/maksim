'use client';
import { useActionState, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ServiceAreaMap = dynamic(() => import('@/components/ServiceAreaMap'), { ssr: false, loading: () => <div className="sa-map" /> });
import { marketMid, roundPrice, SERVICES, TRADES, usd, type Trade } from '@/lib/catalog';
import { accentFromUniform } from '@/lib/colors';
import Figure from '@/components/Figure';
import PhotoPicker from '@/components/PhotoPicker';
import FigureField from '@/components/FigureField';
import ProPreview, { type PreviewData } from '@/components/ProPreview';
import { flipImage } from '@/lib/cutout';
import { uploadBlob } from '@/lib/upload';
import { isLive } from '@/lib/supabase/config';
import { registerPro, updatePro } from '../actions';
import { useLang, useT } from '@/components/I18n';
import { groupName, svcName } from '@/lib/i18n-core';

export interface ProInitial {
  name: string; trade: Trade; years: number; area: string; languages: string; bio: string; experience: string; skills: string;
  insured: boolean; figure?: string | null; figureAccent?: string | null; baseLat?: number | null; baseLng?: number | null; radius?: number | null; polygon?: [number, number][] | null; uniform: string | null; photo: string | null; tiers: string[]; services: Record<string, number | null>; days: number[]; start: string; end: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProForm({ invite, companyName, initial, prefill }: { invite?: string; companyName?: string; initial?: ProInitial; prefill?: { name?: string; trade?: string; area?: string; years?: number } }) {
  const edit = Boolean(initial); const tt = useT(); const lang = useLang();
  const [state, action, pending] = useActionState(edit ? updatePro : registerPro, undefined);
  const [trade, setTrade] = useState<Trade>(initial?.trade ?? (prefill?.trade as Trade | undefined) ?? 'plumbing');
  const [uniform, setUniform] = useState(initial?.uniform ?? '#15151A');
  const [name, setName] = useState(initial?.name ?? prefill?.name ?? '');
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const I = initial;
  const groups = useMemo(() => {
    const m = new Map<string, typeof SERVICES>();
    SERVICES.filter((s) => s.trade === trade).forEach((s) => m.set(s.group, [...(m.get(s.group) ?? []), s]));
    return [...m];
  }, [trade]);
  const [figAccent, setFigAccent] = useState<string | null>(I?.figure ? I?.figureAccent ?? null : null);
  const accent = figAccent ?? accentFromUniform(uniform);
  const [figure, setFigure] = useState<string | null>(I?.figure ?? null);
  const [photoOverride, setPhotoOverride] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [flipBusy, setFlipBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const mirrorFig = useRef<(() => Promise<void>) | null>(null);
  // Mirror the small photo (the figure has its own button in FigureField).
  async function mirrorPhoto() {
    if (!photo) return; setFlipBusy(true);
    try { const b = await flipImage(photo); const local = URL.createObjectURL(b); setPhoto(local); if (isLive()) { const u = await uploadBlob(b, 'avatar'); setPhotoOverride(u); setPhoto(u); } } catch { /* keep the photo as it was */ }
    setFlipBusy(false);
  }
  function openPreview() {
    const f = new FormData(formRef.current ?? undefined); const v = (k: string) => String(f.get(k) ?? '');
    setPreview({ name: v('name'), trade, area: v('area'), years: Number(v('years')) || 0, languages: v('languages'), bio: v('bio'), experience: v('experience'), skills: v('skills'), photo, figure, accent });
  }
  const areaRef = useRef<HTMLInputElement>(null); const areaAuto = useRef(!I?.area && !prefill?.area);
  const onTown = (town: string) => { const el = areaRef.current; if (el && (areaAuto.current || !el.value.trim())) { el.value = town; areaAuto.current = true; } };

  return (
    <form ref={formRef} action={action} className="list">
      {invite && <input type="hidden" name="invite" value={invite} />}
      {companyName && <div className="note">{tt("You are joining")} <b>{companyName}</b> {tt("as a technician.")}{prefill?.name ? ` ${tt("The office filled in the basics: check them, add your real photo and your services.")}` : ""}</div>}
      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("About you")}</h3>
        <div className="row2">
          <label className="f">{tt("Name clients see")}<input className="inp" name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Mike Reyes" /></label>
          <label className="f">{tt("Trade")}<select className="inp" name="trade" value={trade} disabled={edit} onChange={(e) => setTrade(e.target.value as Trade)}>
            {(Object.keys(TRADES) as Trade[]).map((t) => <option key={t} value={t}>{tt(TRADES[t].name)}</option>)}</select></label>
          {!invite && !edit && <label className="f">CSLB license # {trade === 'handyman' ? '(optional)' : `(${TRADES[trade].license})`}<input className="inp" name="license" inputMode="numeric" placeholder="1234567" required={trade !== 'handyman'} /></label>}
          <label className="f">{tt("Years of experience")}<input className="inp" name="years" type="number" min={0} max={60} defaultValue={I?.years ?? prefill?.years ?? 5} /></label>
          <label className="f">{tt("Languages")}<input className="inp" name="languages" defaultValue={I?.languages ?? "English"} placeholder="English, Spanish" /></label>
        </div>
        <label className="f">{tt("Short intro (shown in search)")}<textarea className="inp" name="bio" defaultValue={I?.bio} maxLength={300} placeholder={tt('What you are best at and how you work.')} style={{ minHeight: 70 }} /></label>
        <label className="f">{tt("Your experience")}<textarea className="inp" name="experience" defaultValue={I?.experience} maxLength={2000} placeholder={tt('Where you worked, for how long, what jobs you have done most. E.g. 9 years as a plumber, 4 on my own. Water heaters, repipes, sewer lines.')} /></label>
        <label className="f">{tt("Your skills, separated by commas")}<input className="inp" name="skills" defaultValue={I?.skills} maxLength={300} placeholder={tt('Tankless water heaters, Repipes, Leak detection')} /></label>
        <label className="chk"><input type="checkbox" name="insured" defaultChecked={I?.insured} /> {tt("I carry liability insurance")}</label>
      </div>
      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt('Service area on the map')}</h3>
        <span className="mu sm">{tt('Draw where you work: clients inside this area see you first.')}</span>
        <label className="f">{tt("Area you serve")} <span className="mu xs">({tt('fills in from the map, you can edit it')})</span><input className="inp" name="area" ref={areaRef} onInput={() => { areaAuto.current = false; }} placeholder="Redwood City" defaultValue={I?.area ?? prefill?.area} /></label>
        <ServiceAreaMap polygon={I?.polygon} lat={I?.baseLat} lng={I?.baseLng} radius={I?.radius ?? 15} onTown={onTown} />
        {trade === 'handyman' && <span className="mu xs">{tt("Handymen can take jobs under $1,000 total (labor and materials), no permits, nothing inside walls (California B&P Code §7048).")}</span>}
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Photo and page color")}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'center' }}>
          <span style={{ width: 120, height: 150, borderRadius: 14, overflow: 'hidden', display: 'block' }}><Figure name={name || 'You'} accent={accent} photo={photo} /></span>
          <div className="list">
            <PhotoPicker name="photo_url" prefix="avatar" label={tt(edit ? 'Replace your photo' : 'Add a real photo of you in work clothes')} onChange={(p) => { setPhoto(p[0] ?? I?.photo ?? null); setPhotoOverride(''); }} required={!edit} />
            {photo && <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={mirrorPhoto} disabled={flipBusy}>⇋ {tt('Mirror photo')}</button>}
            <input type="hidden" name="photo_override" value={photoOverride} />
            <label className="f">{tt("Work-clothes color")}<span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" name="uniform" value={uniform} onChange={(e) => setUniform(e.target.value)} style={{ width: 52, height: 40, border: 0, background: 'none' }} />
              <span className="mu xs">{tt(accent === '#B57A50' ? 'Dark clothes: your page uses NovaFides copper.' : 'Your page will use this color.')}</span></span></label>
          </div>
        </div>
        <span className="mu xs">{tt("Only a real photo of you. We may clean up the background and light, never your face or clothes.")}</span>
        <FigureField name={name} initial={I?.figure ?? null} accent={accent} onAccent={(c) => setFigAccent(c)} onChange={(u) => { setFigure(u); if (!u) setFigAccent(null); }} bindMirror={(fn) => { mirrorFig.current = fn; }} />
      </div>

      {!edit && <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Photos of your work")}</h3>
        <span className="mu sm">{tt("Add photos of jobs you have done, in any order: installs, repairs, before and after. Clients look at these first. You can add more later.")}</span>
        <PhotoPicker name="work_url" prefix="work" max={24} label={tt('Add work photos')} />
        <span className="mu xs">{tt("Only your own work. No faces of clients, house numbers or addresses in the photos.")}</span>
      </div>}


      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Services and your prices")}</h3>
        <span className="mu xs">{tt("Leave a price empty to use the Bay Area average. Recommended for new pros: about 5% under average until you have reviews.")}</span>
        {groups.map(([g, list]) => (
          <details key={g} className="grp" open={I ? list.some((x) => x.id in I.services) : g === groups[0][0]}>
            <summary>{groupName(list[0], lang)} <span className="mu xs">({list.length})</span></summary>
            {list.map((s) => (
              <div key={s.id} className="sv-row">
                <input type="checkbox" name={`svc_${s.id}`} defaultChecked={Boolean(I && s.id in I.services)} aria-label={svcName(s, lang)} style={{ accentColor: 'var(--cu)', width: 18, height: 18 }} />
                <span>{svcName(s, lang)}<br /><small>{tt('Avg')} {usd(marketMid(s))} · {tt('recommended')} {usd(roundPrice(marketMid(s) * 0.95))}{s.permit ? ` · ${tt('permit')}` : ''}</small></span>
                <input className="inp" type="number" name={`price_${s.id}`} min={1} defaultValue={I?.services[s.id] ?? undefined} placeholder={String(Math.round(marketMid(s)))} aria-label={`${svcName(s, lang)} ${tt('price')}`} />
              </div>
            ))}
          </details>
        ))}
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Working hours")}</h3>
        <div className="tbtn">{DAYS.map((d, i) => <label key={d}><input type="checkbox" name={`day_${i}`} defaultChecked={I ? I.days.includes(i) : i >= 1 && i <= 5} />{tt(d)}</label>)}</div>
        <div className="row2">
          <label className="f">{tt("From")}<input className="inp" type="time" name="start" defaultValue={I?.start ?? "08:00"} step={3600} /></label>
          <label className="f">{tt("To")}<input className="inp" type="time" name="end" defaultValue={I?.end ?? "18:00"} step={3600} /></label>
        </div>
      </div>

      {!edit && <label className="agree"><input type="checkbox" name="agree" required />
        <span>{tt('I confirm I hold every license, permit and insurance my work requires, and I agree to the')} <a href="/terms" target="_blank">{tt('Terms of Use')}</a> {tt('and the')} <a href="/privacy" target="_blank">{tt('Privacy Policy')}</a>. {tt('Prices, payment, contracts and warranty are between me and the client; NovaFides is not a party.')}</span></label>}
      {state?.error && <div className="err" role="alert">{tt(state.error)}</div>}
      {state?.saved && <div className="okmsg" role="status">{tt("Saved. Your page is updated.")}</div>}
      {state?.demo && <div className="note">{tt("Demo mode: the form checks out, but nothing was saved. Connect the database to accept real sign-ups.")}</div>}
      <div className="chips">
        <button type="button" className="btn ghost" onClick={openPreview}>👁 {tt('Preview my page')}</button>
        <button className="btn" disabled={pending}>{tt(pending ? 'Saving…' : edit ? 'Save changes' : 'Create my profile')}</button>
      </div>
      {preview && <ProPreview d={preview} busy={flipBusy} onClose={() => setPreview(null)} onMirror={async () => {
        setFlipBusy(true);
        if (figure && mirrorFig.current) await mirrorFig.current(); else await mirrorPhoto();
        setFlipBusy(false); setTimeout(openPreview, 50);
      }} />}
      <span className="mu xs">{edit ? 'To change your trade or license number, contact NovaFides support: they need a new check.' : 'We check your license with CSLB and your ID before your profile goes public. One person, one profile.'}</span>
    </form>
  );
}
