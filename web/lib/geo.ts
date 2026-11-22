import 'server-only';
import zipcodes from 'zipcodes';
import { CITIES } from './areas';

export type Place = { lat: number; lng: number; name: string };

/** Miles between two points (great-circle). */
export function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

/** A California place from what a person typed: a ZIP code, a Bay Area city, or any California city name. */
export function placeOf(text: string | null | undefined): Place | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  const zip = t.match(/\b(\d{5})\b/)?.[1];
  if (zip) { const z = zipcodes.lookup(zip); if (z) return { lat: z.latitude, lng: z.longitude, name: z.city }; }
  const known = [...CITIES].sort((a, b) => b.name.length - a.name.length).find((c) => t.toLowerCase().includes(c.name.toLowerCase()));
  if (known) return { lat: known.lat, lng: known.lon, name: known.name };
  // "City, ST" anywhere in the US; without a state we look in California.
  const m = t.match(/^(.*?)[,\s]+([A-Za-z]{2})\.?$/);
  const st = m && /^[A-Za-z]{2}$/.test(m[2]) && m[1].trim().length >= 3 ? m[2].toUpperCase() : 'CA';
  const name = (st !== 'CA' || m ? (m?.[1] ?? t) : t).replace(/,?\s*(california)\.?$/i, '').trim();
  const hits = name.length >= 3 ? zipcodes.lookupByName(name, st) : [];
  if (hits.length) {
    const lat = hits.reduce((s, h) => s + h.latitude, 0) / hits.length, lng = hits.reduce((s, h) => s + h.longitude, 0) / hits.length;
    return { lat, lng, name: hits[0].city };
  }
  return null;
}

/** Nearest town name for a point on the map (US). */
export function nameAt(lat: number, lng: number): string | null {
  const z = zipcodes.lookupByCoords(lat, lng);
  return z ? (z.state === 'CA' ? z.city : `${z.city}, ${z.state}`) : null;
}

/** Where a pro works from: the point on their map, else their online area or typed area. */
export function proPoint(p: { serviceArea?: { lat: number; lng: number } | null; onlineArea?: string | null; area: string }): { lat: number; lng: number } | null {
  if (p.serviceArea) return p.serviceArea;
  const x = placeOf(p.onlineArea) ?? placeOf(p.area);
  return x ? { lat: x.lat, lng: x.lng } : null;
}
/** Does the pro's map circle cover this point? (null when the pro has not drawn a circle) */
export function covers(p: { serviceArea?: { lat: number; lng: number; radius: number; polygon?: [number, number][] | null } | null }, pt: { lat: number; lng: number } | null): boolean | null {
  if (!p.serviceArea || !pt) return null;
  const poly = p.serviceArea.polygon;
  if (poly && poly.length >= 3) return inPolygon(pt, poly);
  return miles(p.serviceArea, pt) <= p.serviceArea.radius + 0.5;
}
/** Ray casting: is the point inside the polygon of [lat, lng] points? */
export function inPolygon(pt: { lat: number; lng: number }, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if ((yi > pt.lat) !== (yj > pt.lat) && pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
