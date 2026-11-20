// Bay Area cities for the "Online now" map. Positions are city centers only: pros are shown by city, never by exact location.
export const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194 }, { name: 'Daly City', lat: 37.6879, lon: -122.4702 },
  { name: 'South San Francisco', lat: 37.6547, lon: -122.4077 }, { name: 'San Bruno', lat: 37.6305, lon: -122.4111 },
  { name: 'Millbrae', lat: 37.5985, lon: -122.3872 }, { name: 'Burlingame', lat: 37.5841, lon: -122.3661 },
  { name: 'San Mateo', lat: 37.563, lon: -122.3255 }, { name: 'Foster City', lat: 37.5585, lon: -122.2711 },
  { name: 'Belmont', lat: 37.5202, lon: -122.2758 }, { name: 'San Carlos', lat: 37.5072, lon: -122.2605 },
  { name: 'Redwood City', lat: 37.4852, lon: -122.2364 }, { name: 'Menlo Park', lat: 37.453, lon: -122.1817 },
  { name: 'Palo Alto', lat: 37.4419, lon: -122.143 }, { name: 'Los Altos', lat: 37.3852, lon: -122.1141 },
  { name: 'Mountain View', lat: 37.3861, lon: -122.0839 }, { name: 'Sunnyvale', lat: 37.3688, lon: -122.0363 },
  { name: 'Santa Clara', lat: 37.3541, lon: -121.9552 }, { name: 'Cupertino', lat: 37.323, lon: -122.0322 },
  { name: 'San Jose', lat: 37.3382, lon: -121.8863 }, { name: 'Milpitas', lat: 37.4323, lon: -121.8996 },
  { name: 'Fremont', lat: 37.5485, lon: -121.9886 }, { name: 'Hayward', lat: 37.6688, lon: -122.0808 },
  { name: 'Oakland', lat: 37.8044, lon: -122.2712 }, { name: 'Half Moon Bay', lat: 37.4636, lon: -122.4286 },
];
/** Finds the city named in free text like "Redwood City" or "near San Mateo". */
export function cityOf(text: string | null | undefined): string | null {
  const t = (text ?? '').toLowerCase();
  if (!t) return null;
  const hit = [...CITIES].sort((a, b) => b.name.length - a.name.length).find((c) => t.includes(c.name.toLowerCase()));
  return hit?.name ?? (/\bsf\b/.test(t) ? 'San Francisco' : /\bsj\b/.test(t) ? 'San Jose' : null);
}

// Common Bay Area ZIP codes → the nearest city above (ranges are inclusive).
const ZIPS: [number, number, string][] = [
  [94002, 94002, 'Belmont'], [94010, 94011, 'Burlingame'], [94014, 94017, 'Daly City'], [94019, 94019, 'Half Moon Bay'],
  [94022, 94024, 'Los Altos'], [94025, 94026, 'Menlo Park'], [94027, 94028, 'Menlo Park'], [94030, 94030, 'Millbrae'], [94035, 94043, 'Mountain View'],
  [94061, 94065, 'Redwood City'], [94066, 94067, 'San Bruno'], [94070, 94071, 'San Carlos'], [94080, 94083, 'South San Francisco'],
  [94085, 94090, 'Sunnyvale'], [94102, 94188, 'San Francisco'], [94301, 94310, 'Palo Alto'], [94401, 94403, 'San Mateo'],
  [94404, 94404, 'Foster City'], [94536, 94539, 'Fremont'], [94555, 94555, 'Fremont'], [94540, 94546, 'Hayward'], [94601, 94621, 'Oakland'],
  [95014, 95015, 'Cupertino'], [95035, 95036, 'Milpitas'], [95050, 95056, 'Santa Clara'], [95101, 95199, 'San Jose'],
];
/** City for a typed city name or a 5-digit Bay Area ZIP. */
export function locCity(loc: string | null | undefined): string | null {
  const t = (loc ?? '').trim();
  const zip = t.match(/\b(9[45]\d{3})\b/);
  if (zip) { const z = Number(zip[1]); const hit = ZIPS.find(([a, b]) => z >= a && z <= b); if (hit) return hit[2]; }
  return cityOf(t);
}
/** Straight-line distance in miles between two listed cities (null if one is unknown). */
export function milesBetween(a: string | null, b: string | null): number | null {
  const A = CITIES.find((c) => c.name === a); const B = CITIES.find((c) => c.name === b);
  if (!A || !B) return null;
  const dy = (A.lat - B.lat) * 69; const dx = (A.lon - B.lon) * 69 * Math.cos((A.lat * Math.PI) / 180);
  return Math.round(Math.hypot(dx, dy));
}
