'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, useTransition } from 'react';
import { goOnline, moveOnline } from '@/app/account/actions';
import { CITIES } from '@/lib/areas';
import { useT } from './I18n';

const ServiceAreaMap = dynamic(() => import('./ServiceAreaMap'), { ssr: false, loading: () => <div className="sa-map" /> });
const RADII = [5, 10, 15, 25];
const round = (n: number) => Math.round(n * 100) / 100; // about 1 km: the exact position never leaves the browser

/** "Go online": where (my approximate location or a city), how far I go, for how long. Clients see an area, not a point. */
export default function GoOnline({ city, radius = 10 }: { city: string; radius?: number }) {
  const t = useT();
  const [open, setOpen] = useState(false); const [mode, setMode] = useState<'geo' | 'city'>('geo');
  const [pt, setPt] = useState<{ lat: number; lng: number } | null>(null); const [town, setTown] = useState(CITIES.some((c) => c.name === city) ? city : CITIES[0].name);
  const [r, setR] = useState(RADII.includes(radius) ? radius : 10); const [hours, setHours] = useState(4); const [live, setLive] = useState(false);
  const [msg, setMsg] = useState<string | null>(null); const [busy, start] = useTransition(); const [finding, setFinding] = useState(false);
  const locate = () => {
    if (!navigator.geolocation) { setMsg(t('This browser cannot share a location. Choose a city instead.')); setMode('city'); return; }
    setFinding(true); setMsg(null);
    navigator.geolocation.getCurrentPosition((p) => { setPt({ lat: round(p.coords.latitude), lng: round(p.coords.longitude) }); setFinding(false); },
      () => { setFinding(false); setMode('city'); setMsg(t('Location is turned off for this site. Choose a city, or allow location in the browser and try again.')); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
  };
  useEffect(() => { if (open && mode === 'geo' && !pt && !finding) locate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, mode]);
  const c = CITIES.find((x) => x.name === town)!;
  const center = mode === 'geo' ? pt : { lat: c.lat, lng: c.lon };
  const go = () => start(async () => { if (!center) return; await goOnline({ hours, lat: center.lat, lng: center.lng, radius: r, live: mode === 'geo' && live, city: mode === 'city' ? town : null }); setOpen(false); });

  if (!open) return <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}><i className="dot-live" aria-hidden /> {t('Go online')}</button>;
  return (
    <div className="card go-online">
      <b><i className="dot-live" aria-hidden /> {t('Go online: where are you working now?')}</b>
      <fieldset className="opt-set"><legend>{t('Where')}</legend>
        <label><input type="radio" name="go_mode" checked={mode === 'geo'} onChange={() => setMode('geo')} /> <span><b>📍 {t('Use my location')}</b><br /><span className="mu xs">{t('Clients see only an approximate area (about a mile), never your exact position.')}</span></span></label>
        <label><input type="radio" name="go_mode" checked={mode === 'city'} onChange={() => setMode('city')} /> <span><b>{t('Choose a city')}</b></span></label>
        {mode === 'city' && <select className="inp" value={town} onChange={(e) => setTown(e.target.value)} aria-label={t('City you are in now')}>{CITIES.map((x) => <option key={x.name}>{x.name}</option>)}</select>}
        {mode === 'geo' && <label><input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> <span><b>🚐 {t('I am on the road: update my area')}</b><br /><span className="mu xs">{t('Works while your account page stays open on the phone. Close the page and the area stays where it was.')}</span></span></label>}
      </fieldset>
      <div className="chips" role="group" aria-label={t('How far I go')}><span className="mu sm">{t('How far I go')}:</span>
        {RADII.map((x) => <button type="button" key={x} className="chip" aria-pressed={r === x} onClick={() => setR(x)}>{x} mi</button>)}</div>
      <div className="chips" role="group" aria-label={t('For how long')}><span className="mu sm">{t('For how long')}:</span>
        {[2, 4, 8].map((x) => <button type="button" key={x} className="chip" aria-pressed={hours === x} onClick={() => setHours(x)}>{x} {t('h')}</button>)}</div>
      {center ? <ServiceAreaMap key={`${center.lat},${center.lng},${r}`} readOnly lat={center.lat} lng={center.lng} radius={r} /> : <div className="sa-map go-wait">{finding ? t('Finding your location…') : t('Allow location or choose a city.')}</div>}
      <span className="mu xs">{t('This circle is what clients see: the area where you take jobs now.')}</span>
      {msg && <span className="err xs">{msg}</span>}
      <div className="chips"><button type="button" className="btn sm" disabled={!center || busy} onClick={go}>{busy ? t('Sending…') : t('Go online')}</button><button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>{t('Cancel')}</button>
        {mode === 'geo' && !finding && <button type="button" className="btn ghost sm" onClick={locate}>↻ {t('Find me again')}</button>}</div>
    </div>
  );
}

/** While the pro is online with "update my area": refreshes the approximate area every few minutes while this page is open. */
export function OnlineTracker() {
  useEffect(() => {
    if (!navigator.geolocation) return; let last = '';
    const tick = () => navigator.geolocation.getCurrentPosition((p) => { const lat = round(p.coords.latitude), lng = round(p.coords.longitude); const k = `${lat},${lng}`; if (k !== last) { last = k; moveOnline(lat, lng).catch(() => {}); } }, () => {}, { maximumAge: 60000, timeout: 15000 });
    tick(); const id = setInterval(tick, 180000); return () => clearInterval(id);
  }, []);
  return null;
}
