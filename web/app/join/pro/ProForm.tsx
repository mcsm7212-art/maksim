'use client';
import { useActionState, useMemo, useState } from 'react';
import { marketMid, roundPrice, SERVICES, TIER_KEYS, TIERS, TRADES, usd, type Trade } from '@/lib/catalog';
import { accentFromUniform } from '@/lib/colors';
import Figure from '@/components/Figure';
import PhotoPicker from '@/components/PhotoPicker';
import { registerPro, updatePro } from '../actions';
import { useLang, useT } from '@/components/I18n';
import { groupName, svcName } from '@/lib/i18n-core';

export interface ProInitial {
  name: string; trade: Trade; years: number; area: string; languages: string; bio: string; experience: string; skills: string;
  insured: boolean; uniform: string | null; photo: string | null; tiers: string[]; services: Record<string, number | null>; days: number[]; start: string; end: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProForm({ invite, companyName, initial }: { invite?: string; companyName?: string; initial?: ProInitial }) {
  const edit = Boolean(initial); const tt = useT(); const lang = useLang();
  const [state, action, pending] = useActionState(edit ? updatePro : registerPro, undefined);
  const [trade, setTrade] = useState<Trade>(initial?.trade ?? 'plumbing');
  const [uniform, setUniform] = useState(initial?.uniform ?? '#15151A');
  const [name, setName] = useState(initial?.name ?? '');
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const I = initial;
  const groups = useMemo(() => {
    const m = new Map<string, typeof SERVICES>();
    SERVICES.filter((s) => s.trade === trade).forEach((s) => m.set(s.group, [...(m.get(s.group) ?? []), s]));
    return [...m];
  }, [trade]);
  const accent = accentFromUniform(uniform);

  return (
    <form action={action} className="list">
      {invite && <input type="hidden" name="invite" value={invite} />}
      {companyName && <div className="note">{tt("You are joining")} <b>{companyName}</b> {tt("as a technician.")}</div>}
      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("About you")}</h3>
        <div className="row2">
          <label className="f">{tt("Name clients see")}<input className="inp" name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Mike Reyes" /></label>
          <label className="f">{tt("Trade")}<select className="inp" name="trade" value={trade} disabled={edit} onChange={(e) => setTrade(e.target.value as Trade)}>
            {(Object.keys(TRADES) as Trade[]).map((t) => <option key={t} value={t}>{tt(TRADES[t].name)}</option>)}</select></label>
          {!invite && !edit && <label className="f">CSLB license # {trade === 'handyman' ? '(optional)' : `(${TRADES[trade].license})`}<input className="inp" name="license" inputMode="numeric" placeholder="1234567" required={trade !== 'handyman'} /></label>}
          <label className="f">{tt("Years of experience")}<input className="inp" name="years" type="number" min={0} max={60} defaultValue={I?.years ?? 5} /></label>
          <label className="f">{tt("Area you serve")}<input className="inp" name="area" placeholder="Redwood City" defaultValue={I?.area} /></label>
          <label className="f">{tt("Languages")}<input className="inp" name="languages" defaultValue={I?.languages ?? "English"} placeholder="English, Spanish" /></label>
        </div>
        <label className="f">{tt("Short intro (shown in search)")}<textarea className="inp" name="bio" defaultValue={I?.bio} maxLength={300} placeholder={tt('What you are best at and how you work.')} style={{ minHeight: 70 }} /></label>
        <label className="f">{tt("Your experience")}<textarea className="inp" name="experience" defaultValue={I?.experience} maxLength={2000} placeholder={tt('Where you worked, for how long, what jobs you have done most. E.g. 9 years as a plumber, 4 on my own. Water heaters, repipes, sewer lines.')} /></label>
        <label className="f">{tt("Your skills, separated by commas")}<input className="inp" name="skills" defaultValue={I?.skills} maxLength={300} placeholder={tt('Tankless water heaters, Repipes, Leak detection')} /></label>
        <label className="chk"><input type="checkbox" name="insured" defaultChecked={I?.insured} /> {tt("I carry liability insurance")}</label>
        {trade === 'handyman' && <span className="mu xs">{tt("Handymen can take jobs under $1,000 total (labor and materials), no permits, nothing inside walls (California B&P Code §7048).")}</span>}
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Photo and page color")}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'center' }}>
          <span style={{ width: 120, height: 150, borderRadius: 14, overflow: 'hidden', display: 'block' }}><Figure name={name || 'You'} accent={accent} photo={photo} /></span>
          <div className="list">
            <PhotoPicker name="photo_url" prefix="avatar" label={tt(edit ? 'Replace your photo' : 'Add a real photo of you in work clothes')} onChange={(p) => setPhoto(p[0] ?? I?.photo ?? null)} required={!edit} />
            <label className="f">{tt("Work-clothes color")}<span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" name="uniform" value={uniform} onChange={(e) => setUniform(e.target.value)} style={{ width: 52, height: 40, border: 0, background: 'none' }} />
              <span className="mu xs">{tt(accent === '#B57A50' ? 'Dark clothes: your page uses NovaFides copper.' : 'Your page will use this color.')}</span></span></label>
          </div>
        </div>
        <span className="mu xs">{tt("Only a real photo of you. We may clean up the background and light, never your face or clothes.")}</span>
      </div>

      {!edit && <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Photos of your work")}</h3>
        <span className="mu sm">{tt("Add photos of jobs you have done, in any order: installs, repairs, before and after. Clients look at these first. You can add more later.")}</span>
        <PhotoPicker name="work_url" prefix="work" max={24} label={tt('Add work photos')} />
        <span className="mu xs">{tt("Only your own work. No faces of clients, house numbers or addresses in the photos.")}</span>
      </div>}

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Service levels")}</h3>
        {TIER_KEYS.map((t) => <label key={t} className="chk"><input type="checkbox" name={`tier_${t}`} defaultChecked={I ? I.tiers.includes(t) : t === 'standard'} /><span><b>{tt(TIERS[t].name)}</b> <span className="mu sm">· {tt(TIERS[t].blurb)} {tt('Price')} ×{TIERS[t].multiplier}</span></span></label>)}
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Services and your Standard prices")}</h3>
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

      {state?.error && <div className="err" role="alert">{tt(state.error)}</div>}
      {state?.saved && <div className="okmsg" role="status">{tt("Saved. Your page is updated.")}</div>}
      {state?.demo && <div className="note">{tt("Demo mode: the form checks out, but nothing was saved. Connect the database to accept real sign-ups.")}</div>}
      <button className="btn" disabled={pending}>{tt(pending ? 'Saving…' : edit ? 'Save changes' : 'Create my profile')}</button>
      <span className="mu xs">{edit ? 'To change your trade or license number, contact NovaFides support: they need a new check.' : 'We check your license with CSLB and your ID before your profile goes public. One person, one profile.'}</span>
    </form>
  );
}
