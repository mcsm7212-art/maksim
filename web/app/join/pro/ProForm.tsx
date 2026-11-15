'use client';
import { useActionState, useMemo, useState } from 'react';
import { marketMid, roundPrice, SERVICES, TIER_KEYS, TIERS, TRADES, usd, type Trade } from '@/lib/catalog';
import { accentFromUniform } from '@/lib/colors';
import Figure from '@/components/Figure';
import { registerPro } from '../actions';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProForm({ invite, companyName }: { invite?: string; companyName?: string }) {
  const [state, action, pending] = useActionState(registerPro, undefined);
  const [trade, setTrade] = useState<Trade>('plumbing');
  const [uniform, setUniform] = useState('#15151A');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const groups = useMemo(() => {
    const m = new Map<string, typeof SERVICES>();
    SERVICES.filter((s) => s.trade === trade).forEach((s) => m.set(s.group, [...(m.get(s.group) ?? []), s]));
    return [...m];
  }, [trade]);
  const accent = accentFromUniform(uniform);

  return (
    <form action={action} className="list">
      {invite && <input type="hidden" name="invite" value={invite} />}
      {companyName && <div className="note">You are joining <b>{companyName}</b> as a technician.</div>}
      <div className="card formcard">
        <h3 style={{ margin: 0 }}>About you</h3>
        <div className="row2">
          <label className="f">Name clients see<input className="inp" name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Mike Reyes" /></label>
          <label className="f">Trade<select className="inp" name="trade" value={trade} onChange={(e) => setTrade(e.target.value as Trade)}>
            {(Object.keys(TRADES) as Trade[]).map((t) => <option key={t} value={t}>{TRADES[t].name}</option>)}</select></label>
          {!invite && <label className="f">CSLB license # {trade === 'handyman' ? '(optional)' : `(${TRADES[trade].license})`}<input className="inp" name="license" inputMode="numeric" placeholder="1234567" required={trade !== 'handyman'} /></label>}
          <label className="f">Years of experience<input className="inp" name="years" type="number" min={0} max={60} defaultValue={5} /></label>
          <label className="f">Area you serve<input className="inp" name="area" placeholder="Redwood City" /></label>
          <label className="f">Languages<input className="inp" name="languages" defaultValue="English" placeholder="English, Spanish" /></label>
        </div>
        <label className="f">Short bio<textarea className="inp" name="bio" maxLength={600} placeholder="What you are best at and how you work." /></label>
        <label className="chk"><input type="checkbox" name="insured" /> I carry liability insurance</label>
        {trade === 'handyman' && <span className="mu xs">Handymen can take jobs under $1,000 total (labor and materials), no permits, nothing inside walls (California B&amp;P Code §7048).</span>}
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>Photo and page color</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'center' }}>
          <span style={{ width: 120, height: 150, borderRadius: 14, overflow: 'hidden', display: 'block' }}><Figure name={name || 'You'} accent={accent} photo={photo} /></span>
          <div className="list">
            <label className="f">Real photo of you in work clothes (JPG/PNG)
              <input className="inp" type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; setPhoto(f ? URL.createObjectURL(f) : null); }} /></label>
            <label className="f">Work-clothes color<span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" name="uniform" value={uniform} onChange={(e) => setUniform(e.target.value)} style={{ width: 52, height: 40, border: 0, background: 'none' }} />
              <span className="mu xs">{accent === '#B57A50' ? 'Dark clothes: your page uses NovaFides copper.' : 'Your page will use this color.'}</span></span></label>
          </div>
        </div>
        <span className="mu xs">Only a real photo of you. We may clean up the background and light, never your face or clothes.</span>
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>Service levels</h3>
        {TIER_KEYS.map((t) => <label key={t} className="chk"><input type="checkbox" name={`tier_${t}`} defaultChecked={t === 'standard'} /><span><b>{TIERS[t].name}</b> <span className="mu sm">· {TIERS[t].blurb} Price ×{TIERS[t].multiplier}</span></span></label>)}
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>Services and your Standard prices</h3>
        <span className="mu xs">Leave a price empty to use the Bay Area average. Recommended for new pros: about 5% under average until you have reviews.</span>
        {groups.map(([g, list]) => (
          <details key={g} className="grp" open={g === groups[0][0]}>
            <summary>{g} <span className="mu xs">({list.length})</span></summary>
            {list.map((s) => (
              <div key={s.id} className="sv-row">
                <input type="checkbox" name={`svc_${s.id}`} aria-label={s.name} style={{ accentColor: 'var(--cu)', width: 18, height: 18 }} />
                <span>{s.name}<br /><small>Avg {usd(marketMid(s))} · recommended {usd(roundPrice(marketMid(s) * 0.95))}{s.permit ? ' · permit' : ''}</small></span>
                <input className="inp" type="number" name={`price_${s.id}`} min={1} placeholder={String(Math.round(marketMid(s)))} aria-label={`${s.name} price`} />
              </div>
            ))}
          </details>
        ))}
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>Working hours</h3>
        <div className="tbtn">{DAYS.map((d, i) => <label key={d}><input type="checkbox" name={`day_${i}`} defaultChecked={i >= 1 && i <= 5} />{d}</label>)}</div>
        <div className="row2">
          <label className="f">From<input className="inp" type="time" name="start" defaultValue="08:00" step={3600} /></label>
          <label className="f">To<input className="inp" type="time" name="end" defaultValue="18:00" step={3600} /></label>
        </div>
      </div>

      {state?.error && <div className="err" role="alert">{state.error}</div>}
      {state?.demo && <div className="note">Demo mode: the form checks out, but nothing was saved. Connect the database to accept real sign-ups.</div>}
      <button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Create my profile'}</button>
      <span className="mu xs">We check your license with CSLB and your ID before your profile goes public. One person, one profile.</span>
    </form>
  );
}
