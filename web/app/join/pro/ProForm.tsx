'use client';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ServiceAreaMap = dynamic(() => import('@/components/ServiceAreaMap'), { ssr: false, loading: () => <div className="sa-map" /> });
import { licenseNeeded, marketMid, roundPrice, SERVICES, TRADES, usd, type Trade, TRADE_KEYS } from '@/lib/catalog';
import { accentFromUniform } from '@/lib/colors';
import Figure from '@/components/Figure';
import Icon from '@/components/Icon';
import FormDraft, { ClearBtn } from '@/components/FormDraft';
import CustomServices from '@/components/CustomServices';
import TradeRequest from '@/components/TradeRequest';
import GroupAll from '@/components/GroupAll';
import PhotoPicker from '@/components/PhotoPicker';
import FigureField from '@/components/FigureField';
import ProPreview, { type PreviewData } from '@/components/ProPreview';
import { checkLicense, registerPro, updatePro } from '../actions';
import CslbMark, { type CslbAuto } from '@/components/CslbMark';
import { useLang, useT } from '@/components/I18n';
import { groupName, svcName } from '@/lib/i18n-core';

export interface ProInitial {
  name: string; trade: Trade; customTrade?: string | null; years: number; area: string; languages: string; bio: string; experience: string; skills: string;
  insured: boolean; licensed?: boolean; custom?: { name: string; price: number | null; category?: string | null }[]; figure?: string | null; figureAccent?: string | null; baseLat?: number | null; baseLng?: number | null; radius?: number | null; polygon?: [number, number][] | null; uniform: string | null; photo: string | null; tiers: string[]; services: Record<string, number | null>; days: number[]; start: string; end: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProForm({ invite, companyName, initial, prefill }: { invite?: string; companyName?: string; initial?: ProInitial; prefill?: { name?: string; trade?: string; area?: string; years?: number } }) {
  const edit = Boolean(initial); const tt = useT(); const lang = useLang();
  const [state, action, pending] = useActionState(edit ? updatePro : registerPro, undefined);
  const [trade, setTrade] = useState<Trade>(initial?.trade ?? (prefill?.trade as Trade | undefined) ?? 'plumbing');
  // The pro's own trade (not one of the four): only this pro sees it; its jobs are made in "Your jobs and prices".
  const [ownTrade, setOwnTrade] = useState<string | null>(initial?.customTrade ?? null);
  const OWN_KEY = 'nf_draft_pro-new_trade';
  useEffect(() => {
    if (edit) return;
    try {
      const n = localStorage.getItem(OWN_KEY); if (!n) return; setOwnTrade(n);
      if ((JSON.parse(localStorage.getItem('nf_draft_pro-new') ?? '{}') as Record<string, unknown>)['trade=other']) setTrade('other');
    } catch { /* storage off */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const addOwnTrade = (n: string) => { setOwnTrade(n); setTrade('other'); try { localStorage.setItem(OWN_KEY, n); } catch { /* storage off */ } };
  const dropOwnTrade = () => { setOwnTrade(null); if (trade === 'other') setTrade('plumbing'); try { localStorage.removeItem(OWN_KEY); } catch { /* storage off */ } };
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
  // California: a CSLB license is needed for jobs over $1,000 (labor + materials) or that need a permit.
  const [licText, setLicText] = useState('');
  // Compare the typed number with the CSLB list while the pro types (a hint; the admin still checks).
  const [licAuto, setLicAuto] = useState<CslbAuto>(null);
  useEffect(() => {
    const n = licText.replace(/\D/g, ''); if (n.length < 5 || edit || invite) { setLicAuto(null); return; }
    const id = setTimeout(async () => { setLicAuto((await checkLicense(n, trade).catch(() => null)) as CslbAuto); }, 500);
    return () => clearTimeout(id);
  }, [licText, trade, edit, invite]);
  const licensed = Boolean(invite) || (edit ? Boolean(I?.licensed) : licText.replace(/\D/g, '').length >= 6);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const needsLic = (s: (typeof SERVICES)[number]) => licenseNeeded(s, Number(prices[s.id] ?? I?.services[s.id] ?? 0));
  const [figure, setFigure] = useState<string | null>(I?.figure ?? null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [flipBusy, setFlipBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const mirrorFig = useRef<(() => Promise<void>) | null>(null);
  function openPreview() {
    const f = new FormData(formRef.current ?? undefined); const v = (k: string) => String(f.get(k) ?? '');
    const own = f.getAll('custom_name').map(String).map((n, i) => ({ id: `own-${i}`, name: n.trim(), price: Number(f.getAll('custom_price')[i]) || 0 })).filter((x) => x.name.length >= 3 && x.price > 0);
    const jobs = SERVICES.filter((x) => x.trade === trade && f.get(`svc_${x.id}`))
      .map((x) => ({ id: x.id, name: svcName(x, lang), price: roundPrice(Number(v(`price_${x.id}`)) || marketMid(x)) })).concat(own).slice(0, 3);
    setPreview({ name: v('name'), trade, customTrade: ownTrade ?? undefined, area: v('area'), years: Number(v('years')) || 0, languages: v('languages'), bio: v('bio'), experience: v('experience'), skills: v('skills'), photo, figure, accent, jobs });
  }
  // What still stops "Create my profile": shown when the pointer is over the disabled button.
  const [missing, setMissing] = useState<string[]>([]); const [tap, setTap] = useState(false);
  const recheck = () => {
    const f = formRef.current; if (!f) return;
    const m: string[] = [];
    if ((f.querySelector<HTMLInputElement>('input[name=name]')?.value.trim().length ?? 0) < 3) m.push('Your name (at least 3 letters)');
    if (f.querySelector('.sv-row.lic input[type=checkbox]:checked, .cs-row.lic')) m.push('Jobs marked red need a CSLB license: untick them, lower the price, or add your license number');
    if (!edit && !f.querySelector<HTMLInputElement>('input[name=agree]')?.checked) m.push('Tick the box to agree to the Terms of Use');
    setMissing((cur) => (cur.join('|') === m.join('|') ? cur : m));
  };
  useEffect(() => { const id = setTimeout(recheck, 0); return () => clearTimeout(id); });
  useEffect(() => { const q = (n: string) => formRef.current?.querySelector<HTMLInputElement>(`input[name=${n}]`)?.value; const v = q('name'), l = q('license'); if (v) setName(v); if (l) setLicText(l); }, []);
  const areaRef = useRef<HTMLInputElement>(null); const areaAuto = useRef(!I?.area && !prefill?.area);
  const onTown = (town: string) => { const el = areaRef.current; if (el && (areaAuto.current || !el.value.trim())) { el.value = town; areaAuto.current = true; } };

  return (
    <form ref={formRef} action={action} className="list" onInput={() => setTimeout(recheck, 0)} onChange={() => setTimeout(recheck, 0)}>
      {invite && <input type="hidden" name="invite" value={invite} />}
      {companyName && <div className="note">{tt("You are joining")} <b>{companyName}</b> {tt("as a technician.")}{prefill?.name ? ` ${tt("The office filled in the basics: check them, add your real photo and your services.")}` : ""}</div>}
      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("About you")}</h3>
        <span className="mu xs">✎ {tt("Write your profile in English: most clients in the Bay Area read English.")}</span>
        {!edit && <div className="note xs">⏱ {tt('To create the profile you only need your name and trade. Photo, services, prices, map and work photos can be added now or later in your account.')}</div>}
        <div className="row2">
          <label className="f">{tt("Name clients see")}<span className="fieldwrap"><input className="inp" name="name" required defaultValue={name} onInput={(e) => setName(e.currentTarget.value)} placeholder="Mike Reyes" autoComplete="name" /></span></label>
          <div className="f" style={{ gridColumn: '1/-1' }} role="radiogroup" aria-label={tt("Trade")}>{tt("Trade")}
            <div className="trade-pick">{TRADE_KEYS.map((t) => (
              <label key={t}><input type="radio" name="trade" value={t} checked={trade === t} disabled={edit && trade !== t} onChange={() => setTrade(t)} />
                <Icon name={TRADES[t].icon} size={18} /> {tt(TRADES[t].name)}</label>))}
              {ownTrade && <label className="own-trade"><input type="radio" name="trade" value="other" checked={trade === 'other'} disabled={edit && trade !== 'other'} onChange={() => setTrade('other')} />
                <Icon name="tool" size={18} /> {ownTrade}
                {!edit && <button type="button" className="own-x" onClick={(e) => { e.preventDefault(); dropOwnTrade(); }} title={tt('Remove')} aria-label={tt('Remove')}>✕</button>}</label>}
            </div>
            {ownTrade && <input type="hidden" name="custom_trade" value={ownTrade} />}
            {edit && <span className="mu xs">{tt('The trade cannot be changed after sign-up. Write to us if it is wrong.')}</span>}
            {!edit && <TradeRequest onAdd={addOwnTrade} current={ownTrade} />}
          </div>
          {!invite && !edit && <label className="f">CSLB license #{TRADES[trade].license ? ` (${TRADES[trade].license})` : trade === 'other' ? '' : ' (B)'} <span className="mu xs">{tt('optional')}</span><span className="fieldwrap"><input className="inp" name="license" onInput={(e) => setLicText((e.target as HTMLInputElement).value)} inputMode="numeric" placeholder="1234567" /><ClearBtn /></span>
            {licAuto && <CslbMark a={licAuto} />}<span className="mu xs">{tt(licensed ? 'We check this number with CSLB before your profile goes public: the name on the license must match your ID. A wrong number is removed, and then you take only jobs under $1,000.' : 'No license? You can still join: you take jobs under $1,000 with materials, without a permit. Jobs that need a license are marked red below.')}</span></label>}
          <label className="f">{tt("Years of experience")}<span className="fieldwrap"><input className="inp" name="years" type="number" min={0} max={60} defaultValue={I?.years ?? prefill?.years ?? 5} /><ClearBtn /></span></label>
          <label className="f">{tt("Languages")}<span className="fieldwrap"><input className="inp" name="languages" defaultValue={I?.languages ?? "English"} placeholder="English, Spanish" /><ClearBtn /></span></label>
        </div>
        <label className="f">{tt("Short intro (shown in search)")}<span className="fieldwrap"><textarea className="inp" name="bio" defaultValue={I?.bio} maxLength={300} placeholder={tt('What you are best at and how you work.')} style={{ minHeight: 70 }} /><ClearBtn /></span></label>
        <label className="f">{tt("Your experience")}<span className="fieldwrap"><textarea className="inp" name="experience" defaultValue={I?.experience} maxLength={2000} placeholder={tt('Where you worked, for how long, what jobs you have done most. E.g. 9 years as a plumber, 4 on my own. Water heaters, repipes, sewer lines.')} /><ClearBtn /></span></label>
        <label className="f">{tt("Your skills, separated by commas")}<span className="fieldwrap"><input className="inp" name="skills" defaultValue={I?.skills} maxLength={300} placeholder={tt('Tankless water heaters, Repipes, Leak detection')} /><ClearBtn /></span></label>
        <label className="chk"><input type="checkbox" name="insured" defaultChecked={I?.insured} /> {tt("I carry liability insurance")}</label>
      </div>
      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt('Service area on the map')}</h3>
        <span className="mu sm">{tt('Draw where you work: clients inside this area see you first.')}</span>
        <label className="f">{tt("Area you serve")} <span className="mu xs">({tt('fills in from the map, you can edit it')})</span><span className="fieldwrap"><input className="inp" name="area" ref={areaRef} onInput={() => { areaAuto.current = false; }} placeholder="Redwood City" defaultValue={I?.area ?? prefill?.area} /><ClearBtn /></span></label>
        <ServiceAreaMap polygon={I?.polygon} lat={I?.baseLat} lng={I?.baseLng} radius={I?.radius ?? 15} onTown={onTown} draftKey={`nf_draft_${edit ? 'pro-edit' : 'pro-new'}_map`} />
        {trade === 'handyman' && <span className="mu xs">{tt("Handymen can take jobs under $1,000 total (labor and materials), no permits, nothing inside walls (California B&P Code §7048).")}</span>}
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Photo and page color")}</h3>
        <FigureField name={name} initialFigure={I?.figure ?? null} initialPhoto={I?.photo ?? null} accent={accent} draftKey={`nf_draft_${edit ? 'pro-edit' : 'pro-new'}_photo`}
          onAccent={(c) => setFigAccent(c)} onChange={({ figure: f, photo: p }) => { setFigure(f); setPhoto(p); if (!f) setFigAccent(null); }} bindMirror={(fn) => { mirrorFig.current = fn; }} onPreview={() => openPreview()} />
        <label className="f">{tt("Work-clothes color")}<span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="color" name="uniform" value={uniform} onChange={(e) => { setUniform(e.target.value); setFigAccent(null); }} style={{ width: 52, height: 40, border: 0, background: 'none' }} />
          <span className="mu xs">{tt(figAccent ? 'Taken from your clothes in the photo. Pick another colour if you like.' : accent === '#B57A50' ? 'Dark clothes: your page uses NovaFides copper.' : 'Your page will use this color.')}</span></span></label>
        <span className="mu xs">{tt("Only a real photo of you. We may clean up the background and light, never your face or clothes.")}</span>
      </div>

      {!edit && <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Photos of your work")}</h3>
        <span className="mu sm">{tt("Add photos of jobs you have done, in any order: installs, repairs, before and after. Clients look at these first. You can add more later.")}</span>
        <PhotoPicker name="work_url" prefix="work" max={24} label={tt('Add work photos')} draftKey="nf_draft_pro-new_work" />
        <span className="mu xs">{tt("Only your own work. No faces of clients, house numbers or addresses in the photos.")}</span>
      </div>}


      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Services and your prices")}</h3>
        {trade !== 'other' && <span className="mu xs">{tt("Leave a price empty to use the Bay Area average. Recommended for new pros: about 5% under average until you have reviews.")}</span>}
        {!licensed && <div className="note xs lic-note">🔒 {tt('Jobs marked red need a CSLB license: your price is $1,000 or more (with materials), or the job needs a permit. Add your license number above, lower the price, or choose only the other jobs.')}</div>}
        {groups.map(([g, list]) => (
          <details key={g} className="grp" open={I ? list.some((x) => x.id in I.services) : g === groups[0][0]}>
            <summary>{groupName(list[0], lang)} <span className="mu xs">({list.length})</span><GroupAll /></summary>
            {list.map((s) => (
              <div key={s.id} className={`sv-row${!licensed && needsLic(s) ? ' lic' : ''}`}>
                <input type="checkbox" name={`svc_${s.id}`} defaultChecked={Boolean(I && s.id in I.services)} aria-label={svcName(s, lang)} style={{ accentColor: 'var(--cu)', width: 18, height: 18 }} />
                <span>{svcName(s, lang)}<br /><small>{tt('Avg')} {usd(marketMid(s))} · {tt('recommended')} {usd(roundPrice(marketMid(s) * 0.95))}{s.permit ? ` · ${tt('permit')}` : ''}</small>
                  {!licensed && needsLic(s) && <small className="lic-msg">🔒 {tt(s.permit ? 'Needs a CSLB license: this job needs a permit' : 'Needs a CSLB license: your price is $1,000 or more')}</small>}</span>
                <input className="inp" type="number" name={`price_${s.id}`} min={1} defaultValue={I?.services[s.id] ?? undefined} placeholder={String(Math.round(marketMid(s)))} onInput={(e) => { const v = e.currentTarget.value; setPrices((c) => ({ ...c, [s.id]: v })); }} aria-label={`${svcName(s, lang)} ${tt('price')}`} />
              </div>
            ))}
          </details>
        ))}
        <CustomServices key={trade === 'other' ? 'own' : 'std'} grouped={trade === 'other'} initial={I?.custom ?? []} licensed={licensed} draftKey={`nf_draft_${edit ? 'pro-edit' : 'pro-new'}_custom`} />
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
        <span>{licensed ? tt('I confirm I hold every license, permit and insurance my work requires, and I agree to the') : tt('I confirm I take only jobs under $1,000 (with materials) that need no permit until I add a CSLB license, I hold any insurance my work requires, and I agree to the')} <a href="/terms" target="_blank">{tt('Terms of Use')}</a> {tt('and the')} <a href="/privacy" target="_blank">{tt('Privacy Policy')}</a>. {tt('Prices, payment, contracts and warranty are between me and the client; NovaFides is not a party.')}</span></label>}
      <FormDraft form={formRef} id={edit ? 'pro-edit' : 'pro-new'} done={Boolean(state?.saved)} again={state?.error ? state : undefined} />
      {state?.error && <div className="err" role="alert">{tt(state.error)}</div>}
      {state?.saved && <div className="okmsg" role="status">{tt("Saved. Your page is updated.")}</div>}
      {state?.demo && <div className="note">{tt("Demo mode: the form checks out, but nothing was saved. Connect the database to accept real sign-ups.")}</div>}
      <div className="chips">
        <button type="button" className="btn ghost" onClick={openPreview}>👁 {tt('Preview my page')}</button>
        <span className={`submit-wrap${missing.length ? ' blocked' : ''}${tap ? ' tap' : ''}`} onClick={() => { if (missing.length) { setTap(true); setTimeout(() => setTap(false), 4000); } }}>
          <button className="btn" disabled={pending || missing.length > 0} aria-describedby={missing.length ? 'pf-missing' : undefined}>{tt(pending ? 'Saving…' : edit ? 'Save changes' : 'Create my profile')}</button>
          {missing.length > 0 && <span className="submit-tip" id="pf-missing" role="tooltip"><b>{tt('Still needed:')}</b><ul>{missing.map((m) => <li key={m}>{tt(m)}</li>)}</ul></span>}
        </span>
      </div>
      {preview && <ProPreview d={preview} busy={flipBusy} onClose={() => setPreview(null)} onMirror={async () => {
        setFlipBusy(true);
        if (mirrorFig.current) await mirrorFig.current();
        setFlipBusy(false); setTimeout(openPreview, 50);
      }} />}
      <span className="mu xs">{tt(edit ? 'To change your trade or license number, contact NovaFides support: they need a new check.' : licensed ? 'We check your license with CSLB and your ID before your profile goes public. One person, one profile.' : 'We check your ID before your profile goes public. One person, one profile.')}</span>
    </form>
  );
}
