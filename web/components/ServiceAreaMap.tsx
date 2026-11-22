'use client';
import 'leaflet/dist/leaflet.css';
import type { Circle, Map as LMap, Marker } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { findPlace, townAt } from '@/app/geo-actions';
import { useT } from './I18n';

const BAY = { lat: 37.55, lng: -122.2 };
const CA_BOUNDS: [[number, number], [number, number]] = [[28, -134], [46, -106]]; // California with room around it, so a circle near the coast stays centered
const tiles = () => `https://{s}.basemaps.cartocdn.com/${document.documentElement.dataset.theme === 'light' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`;
const ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>';

/**
 * Service area: a point and a radius in miles, anywhere in California.
 * Editable in the pro profile (click the map, drag the pin, search a city or ZIP, or use my location);
 * read-only on the pro's page, where only the circle is shown (no exact point).
 */
export default function ServiceAreaMap({ lat, lng, radius = 15, readOnly, onTown }: { lat?: number | null; lng?: number | null; radius?: number | null; readOnly?: boolean; onTown?: (name: string) => void }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null); const pin = useRef<Marker | null>(null); const ring = useRef<Circle | null>(null);
  const [pt, setPt] = useState<{ lat: number; lng: number } | null>(lat != null && lng != null ? { lat, lng } : null);
  const [r, setR] = useState<number>(radius ?? 15);
  const [q, setQ] = useState(''); const [msg, setMsg] = useState<string | null>(null);

  // Build the map once (Leaflet needs the browser).
  useEffect(() => {
    let alive = true;
    (async () => {
      const L = (await import('leaflet')).default;
      if (!alive || !box.current || map.current) return;
      const start = pt ?? BAY;
      const m = L.map(box.current, { maxBounds: CA_BOUNDS, maxBoundsViscosity: 0.8, minZoom: 5, zoomSnap: 0.25, scrollWheelZoom: !readOnly, dragging: true, zoomControl: !readOnly, attributionControl: true })
        .setView([start.lat, start.lng], pt ? 10 : 8);
      L.tileLayer(tiles(), { attribution: ATTR, subdomains: 'abcd', maxZoom: 18 }).addTo(m);
      map.current = m;
      if (!readOnly) m.on('click', (e) => place(e.latlng.lat, e.latlng.lng, true));
      // The box gets its final size after layout: tell Leaflet, then fit the circle.
      const fit = () => { m.invalidateSize(); draw(L); };
      setTimeout(fit, 60); setTimeout(fit, 400);
      const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(box.current);
      m.once('unload', () => ro.disconnect());
    })();
    return () => { alive = false; map.current?.remove(); map.current = null; pin.current = null; ring.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { (async () => draw((await import('leaflet')).default))(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pt, r]);

  function draw(L: typeof import('leaflet')) {
    const m = map.current; if (!m || !pt) return;
    const acc = getComputedStyle(document.documentElement).getPropertyValue('--cu-l').trim() || '#C08A62';
    const meters = r * 1609.34;
    if (!ring.current) ring.current = L.circle([pt.lat, pt.lng], { radius: meters, color: acc, weight: 2, fillColor: acc, fillOpacity: 0.16 }).addTo(m);
    else ring.current.setLatLng([pt.lat, pt.lng]).setRadius(meters);
    if (!readOnly) {
      if (!pin.current) {
        pin.current = L.marker([pt.lat, pt.lng], { draggable: true, icon: L.divIcon({ className: 'sa-pin', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(m);
        pin.current.on('dragend', () => { const p = pin.current!.getLatLng(); place(p.lat, p.lng, true); });
      } else pin.current.setLatLng([pt.lat, pt.lng]);
    }
    m.fitBounds(ring.current.getBounds(), { padding: [20, 20], maxZoom: 12 });
  }
  async function place(la: number, ln: number, name: boolean) {
    setPt({ lat: +la.toFixed(5), lng: +ln.toFixed(5) }); setMsg(null);
    if (name && onTown) { const town = await townAt(la, ln); if (town) onTown(town); }
  }
  async function search() {
    if (!q.trim()) return;
    const p = await findPlace(q);
    if (p) { await place(p.lat, p.lng, false); onTown?.(p.name); } else setMsg(t('Not found in California. Try a city or a ZIP code.'));
  }
  function here() {
    if (!navigator.geolocation) return setMsg(t('Location is not available on this device.'));
    navigator.geolocation.getCurrentPosition((p) => place(p.coords.latitude, p.coords.longitude, true), () => setMsg(t('Location was not allowed. Click the map or type a city.')), { timeout: 10000 });
  }

  return (
    <div className={`sa ${readOnly ? 'ro' : ''}`}>
      {!readOnly && <>
        <div className="sa-bar">
          <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} placeholder={t('City or ZIP in California')} aria-label={t('City or ZIP in California')} />
          <button type="button" className="btn ghost sm" onClick={search}>{t('Find')}</button>
          <button type="button" className="btn ghost sm" onClick={here}>📍 {t('My location')}</button>
        </div>
        <span className="mu xs">{t('Click the map or drag the pin to the center of your area, then set how far you travel.')}</span>
      </>}
      <div ref={box} className="sa-map" />
      {!readOnly && <>
        <label className="sa-radius"><span>{t('I travel up to')} <b>{r} {t('mi')}</b></span>
          <input type="range" min={1} max={100} step={1} value={r} onChange={(e) => setR(Number(e.target.value))} /></label>
        {msg && <span className="err xs">{msg}</span>}
        {!pt && <span className="mu xs">{t('No point yet: clients will see only the area you typed.')}</span>}
        <input type="hidden" name="base_lat" value={pt?.lat ?? ''} /><input type="hidden" name="base_lng" value={pt?.lng ?? ''} /><input type="hidden" name="radius" value={pt ? r : ''} />
      </>}
    </div>
  );
}
