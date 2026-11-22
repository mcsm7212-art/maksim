'use client';
import 'leaflet/dist/leaflet.css';
import type { LayerGroup, Map as LMap } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { findPlace, townAt } from '@/app/geo-actions';
import { useT } from './I18n';

type Pt = [number, number]; // [lat, lng]
const BAY: Pt = [37.55, -122.2];
// OpenStreetMap tiles: free, no key (credit shown in the corner). On the dark theme they are darkened with a CSS filter.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** A rough circle of `n` points around a center, `mi` miles across the radius. */
function ring(c: Pt, mi: number, n = 8): Pt[] {
  const dLat = mi / 69, dLng = mi / (69 * Math.cos((c[0] * Math.PI) / 180));
  return Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return [+(c[0] + dLat * Math.sin(a)).toFixed(5), +(c[1] + dLng * Math.cos(a)).toFixed(5)] as Pt; });
}
const center = (p: Pt[]): Pt => [p.reduce((s, x) => s + x[0], 0) / p.length, p.reduce((s, x) => s + x[1], 0) / p.length];

/**
 * Service area as a shape on the map. Drag the corner points; drag a small point in the middle of a side to add a corner;
 * double-click a corner to remove it; "+"/"−" grow or shrink the whole area. Read-only on the pro's page.
 */
export default function ServiceAreaMap({ polygon, lat, lng, radius = 15, readOnly, onTown }: { polygon?: Pt[] | null; lat?: number | null; lng?: number | null; radius?: number | null; readOnly?: boolean; onTown?: (name: string) => void }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null); const layer = useRef<LayerGroup | null>(null); const Lref = useRef<typeof import('leaflet') | null>(null);
  const [pts, setPts] = useState<Pt[] | null>(polygon && polygon.length >= 3 ? polygon : lat != null && lng != null ? ring([lat, lng], radius ?? 15) : null);
  const [q, setQ] = useState(''); const [msg, setMsg] = useState<string | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const L = (await import('leaflet')).default; Lref.current = L;
      if (!alive || !box.current || map.current) return;
      const start = pts ? center(pts) : BAY;
      const m = L.map(box.current, { zoomSnap: 0.25, scrollWheelZoom: !readOnly, zoomControl: true, doubleClickZoom: false }).setView(start, pts ? 10 : 9);
      L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 }).addTo(m);
      map.current = m; layer.current = L.layerGroup().addTo(m);
      // No area yet: the first click drops a shape around that spot.
      if (!readOnly) m.on('click', (e) => setPts((cur) => cur ?? ring([e.latlng.lat, e.latlng.lng], 10)));
      const fit = () => { m.invalidateSize(); draw(); };
      setTimeout(fit, 60); setTimeout(fit, 400);
      const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(box.current);
      m.once('unload', () => ro.disconnect());
    })();
    return () => { alive = false; map.current?.remove(); map.current = null; layer.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { draw(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pts]);
  // Name the area after the town at its center.
  useEffect(() => {
    if (readOnly || !pts || !onTown) return;
    const c = center(pts); const id = setTimeout(async () => { const n = await townAt(c[0], c[1]); if (n) onTown(n); }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts && center(pts).join(',')]);

  function draw() {
    const L = Lref.current, m = map.current, g = layer.current; if (!L || !m || !g) return;
    g.clearLayers(); if (!pts) return;
    const acc = getComputedStyle(document.documentElement).getPropertyValue('--cu-l').trim() || '#C08A62';
    const shape = L.polygon(pts, { color: acc, weight: 2.5, fillColor: acc, fillOpacity: 0.18 }).addTo(g);
    if (!readOnly) {
      // Corner points: drag to move, double-click to remove (at least 3 stay).
      pts.forEach((p, i) => {
        const mk = L.marker(p, { draggable: true, icon: L.divIcon({ className: 'sa-v', iconSize: [18, 18], iconAnchor: [9, 9] }), title: t('Drag to change the area · double-click to remove') }).addTo(g);
        mk.on('drag', () => { const ll = mk.getLatLng(); const next = pts.slice(); next[i] = [ll.lat, ll.lng]; shape.setLatLngs(next); });
        mk.on('dragend', () => { const ll = mk.getLatLng(); setPts((cur) => cur && cur.map((x, j) => (j === i ? [+ll.lat.toFixed(5), +ll.lng.toFixed(5)] as Pt : x))); });
        mk.on('dblclick', (e) => { L.DomEvent.stop(e); setPts((cur) => (cur && cur.length > 3 ? cur.filter((_, j) => j !== i) : cur)); });
      });
      // Middle of each side: drag (or click) to add a new corner there.
      pts.forEach((p, i) => {
        const q2 = pts[(i + 1) % pts.length]; const mid: Pt = [(p[0] + q2[0]) / 2, (p[1] + q2[1]) / 2];
        const mk = L.marker(mid, { draggable: true, icon: L.divIcon({ className: 'sa-mid', iconSize: [12, 12], iconAnchor: [6, 6] }), title: t('Drag to add a point') }).addTo(g);
        const add = (ll: { lat: number; lng: number }) => setPts((cur) => { if (!cur || cur.length >= 60) return cur; const n = cur.slice(); n.splice(i + 1, 0, [+ll.lat.toFixed(5), +ll.lng.toFixed(5)]); return n; });
        mk.on('dragend', () => add(mk.getLatLng()));
        mk.on('click', (e) => { L.DomEvent.stop(e); add(mk.getLatLng()); });
      });
    }
    if (!fitted.current || readOnly) { m.fitBounds(shape.getBounds(), { padding: [24, 24], maxZoom: 13 }); fitted.current = true; }
  }
  const scale = (k: number) => setPts((cur) => { if (!cur) return cur; const c = center(cur); return cur.map(([a, b]) => [+(c[0] + (a - c[0]) * k).toFixed(5), +(c[1] + (b - c[1]) * k).toFixed(5)] as Pt); });
  const refit = () => { const L = Lref.current; if (L && map.current && pts) map.current.fitBounds(L.polygon(pts).getBounds(), { padding: [24, 24], maxZoom: 13 }); };
  async function search() {
    if (!q.trim()) return;
    const p = await findPlace(q);
    if (p) { fitted.current = false; setPts(ring([p.lat, p.lng], 10)); onTown?.(p.name); setMsg(null); } else setMsg(t('Place not found. Try a city with its state (e.g. Reno, NV) or a ZIP code.'));
  }
  function here() {
    if (!navigator.geolocation) return setMsg(t('Location is not available on this device.'));
    navigator.geolocation.getCurrentPosition((p) => { fitted.current = false; setPts(ring([p.coords.latitude, p.coords.longitude], 10)); }, () => setMsg(t('Location was not allowed. Click the map or type a city.')), { timeout: 10000 });
  }

  return (
    <div className={`sa ${readOnly ? 'ro' : ''}`}>
      {!readOnly && <div className="sa-bar">
        <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} placeholder={t('City or ZIP')} aria-label={t('City or ZIP')} />
        <button type="button" className="btn ghost sm" onClick={search}>{t('Find')}</button>
        <button type="button" className="btn ghost sm" onClick={here}>📍 {t('My location')}</button>
      </div>}
      <div ref={box} className="sa-map" />
      {!readOnly && <>
        <div className="chips">
          <button type="button" className="btn ghost sm" onClick={() => scale(1.15)} disabled={!pts}>＋ {t('Bigger area')}</button>
          <button type="button" className="btn ghost sm" onClick={() => scale(0.87)} disabled={!pts}>－ {t('Smaller area')}</button>
          <button type="button" className="btn ghost sm" onClick={refit} disabled={!pts}>⤢ {t('Show whole area')}</button>
          {pts && <button type="button" className="btn ghost sm" onClick={() => setPts(null)}>{t('Clear')}</button>}
        </div>
        <span className="mu xs">{pts ? t('Drag the big points to change the border. Drag or click a small point in the middle of a side to add a new point. Double-click a point to remove it.') : t('Click the map where you work, or find your city above.')}</span>
        {msg && <span className="err xs">{msg}</span>}
        <input type="hidden" name="service_polygon" value={pts ? JSON.stringify(pts) : ''} />
      </>}
    </div>
  );
}
