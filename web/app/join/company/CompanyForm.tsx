'use client';
import { useActionState, useState } from 'react';
import { TRADES, type Trade } from '@/lib/catalog';
import { registerCompany, updateCompany } from '../actions';

export interface CompanyInitial { name: string; trade: string; license: string; city: string; since: number | null; warranty: number; about: string; accent: string; base: string; logo: string | null }
import { uploadPhotos } from '@/lib/upload';
import { useT } from '@/components/I18n';

const BASES = [['dark', 'Dark'], ['graphite', 'Graphite'], ['light', 'Light'], ['teal', 'Deep teal']] as const;
const BG: Record<string, string> = { dark: '#0C0C0E', graphite: '#1F2024', light: '#F4F1EC', teal: '#101C21' };

// Average color of the uploaded logo, ignoring near-white and near-black pixels.
async function logoColor(file: File): Promise<string | null> {
  const img = await createImageBitmap(file); const c = document.createElement('canvas'); c.width = c.height = 48;
  const ctx = c.getContext('2d'); if (!ctx) return null; ctx.drawImage(img, 0, 0, 48, 48);
  const d = ctx.getImageData(0, 0, 48, 48).data; let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
    if (d[i + 3] < 128 || mx > 235 && mn > 220 || mx < 40 || mx - mn < 30) continue;
    r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
  }
  if (!n) return null;
  return '#' + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('');
}

export default function CompanyForm({ initial: I }: { initial?: CompanyInitial }) {
  const edit = Boolean(I); const tt = useT();
  const [state, action, pending] = useActionState(edit ? updateCompany : registerCompany, undefined);
  const [accent, setAccent] = useState(I?.accent ?? '#2F7FE0');
  const [base, setBase] = useState(I?.base ?? 'graphite');
  const [name, setName] = useState(I?.name ?? '');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoErr, setLogoErr] = useState<string | null>(null);
  return (
    <form action={action} className="list">
      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Company")}</h3>
        <div className="row2">
          <label className="f">{tt("Company name")}<input className="inp" name="name" required value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="f">{tt("Main trade")}<select className="inp" name="trade" defaultValue={I?.trade ?? "plumbing"} disabled={edit}>{(Object.keys(TRADES) as Trade[]).map((t) => <option key={t} value={t}>{tt(TRADES[t].name)}</option>)}</select></label>
          <label className="f">{tt("CSLB license #")}<input className="inp" name="license" inputMode="numeric" required={!edit} disabled={edit} defaultValue={I?.license} placeholder="1045872" /></label>
          <label className="f">{tt("City")}<input className="inp" name="city" defaultValue={I?.city} placeholder="San Mateo" /></label>
          <label className="f">{tt("In business since")}<input className="inp" name="since" defaultValue={I?.since ?? undefined} type="number" min={1950} max={2030} placeholder="2011" /></label>
          <label className="f">{tt("Labor warranty, months")}<input className="inp" name="warranty" type="number" min={0} max={120} defaultValue={I?.warranty ?? 12} /></label>
        </div>
        <label className="f">{tt("About the company")}<textarea className="inp" name="about" defaultValue={I?.about} maxLength={800} /></label>
      </div>
      <div className="card formcard">
        <h3 style={{ margin: 0 }}>{tt("Brand")}</h3>
        <label className="f">Logo (we pick your brand color from it)
          <input className="inp" type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return; const c = await logoColor(f); if (c) setAccent(c);
            try { setLogoErr(null); setLogoUrl((await uploadPhotos([f], 'logo'))[0] ?? ''); } catch (er) { setLogoErr((er as Error).message); }
          }} /></label>
        <input type="hidden" name="logo_url" value={logoUrl} />
        {logoErr && <span className="err">{logoErr}</span>}
        <label className="f">{tt("Brand color")}<span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="color" name="accent" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 52, height: 40, border: 0, background: 'none' }} /><span className="mu xs">{accent}</span></span></label>
        <div className="tbtn">{BASES.map(([v, l]) => <label key={v}><input type="radio" name="base" value={v} checked={base === v} onChange={() => setBase(v)} />{tt(l)}</label>)}</div>
        <div className="preview" style={{ background: BG[base], padding: 18, color: base === 'light' ? '#17171A' : '#F3EDE7' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="cmono" style={{ background: accent, width: 48, height: 48, fontSize: 18, borderRadius: 12 }}>{(name || 'Your Co').split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
            <b style={{ fontFamily: 'var(--fd)', fontSize: 20 }}>{name || tt('Your Company')}</b>
          </div>
          <div style={{ height: 3, width: 56, background: accent, borderRadius: 2, margin: '12px 0' }} />
          <span className="btn sm">{tt("Request a visit")}</span>
        </div>
        <span className="mu xs">{tt("License, rating, prices and the Book button keep the NovaFides look on every page so clients can trust them.")}</span>
      </div>
      {state?.error && <div className="err" role="alert">{tt(state.error)}</div>}
      {state?.saved && <div className="okmsg" role="status">{tt("Saved.")}</div>}
      {state?.demo && <div className="note">{tt("Demo mode: nothing was saved. Connect the database to accept real sign-ups.")}</div>}
      <button className="btn" disabled={pending}>{tt(pending ? 'Saving…' : edit ? 'Save changes' : 'Register company')}</button>
      <span className="mu xs">{tt("After we verify your license, invite your technicians from the Business page.")}</span>
    </form>
  );
}
