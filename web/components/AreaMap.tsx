import Link from 'next/link';
import { CITIES } from '@/lib/areas';

// Schematic Bay Area map (SF to San Jose). Shows how many pros are online in each city. Not to scale.
const W = 600, LON0 = -122.56, LON1 = -121.82, LAT0 = 37.3, LAT1 = 37.86;
const H = Math.round(W * (LAT1 - LAT0) / ((LON1 - LON0) * 0.792));
const xy = (lat: number, lon: number) => [((lon - LON0) / (LON1 - LON0)) * W, ((LAT1 - lat) / (LAT1 - LAT0)) * H] as const;
const poly = (pts: [number, number][]) => pts.map(([la, lo]) => xy(la, lo).map((v) => v.toFixed(1)).join(',')).join(' ');
const OCEAN: [number, number][] = [[37.86, -122.56], [37.86, -122.48], [37.81, -122.48], [37.78, -122.512], [37.73, -122.507], [37.7, -122.497], [37.65, -122.497], [37.6, -122.502], [37.55, -122.512], [37.5, -122.482], [37.46, -122.442], [37.4, -122.412], [37.35, -122.402], [37.3, -122.402], [37.3, -122.56]];
const BAY: [number, number][] = [[37.81, -122.47], [37.81, -122.4], [37.78, -122.387], [37.74, -122.375], [37.71, -122.385], [37.66, -122.38], [37.63, -122.375], [37.61, -122.36], [37.59, -122.33], [37.57, -122.3], [37.555, -122.255], [37.53, -122.235], [37.5, -122.2], [37.47, -122.15], [37.45, -122.11], [37.43, -122.06], [37.42, -122.02], [37.44, -121.97], [37.48, -121.985], [37.52, -122.05], [37.57, -122.12], [37.62, -122.16], [37.68, -122.18], [37.73, -122.21], [37.77, -122.27], [37.8, -122.3], [37.835, -122.33], [37.845, -122.47]];

// Cities whose label goes to the left of the dot, so neighbors do not overlap.
const LEFT = new Set(['San Mateo', 'Belmont', 'Millbrae', 'Daly City', 'San Bruno', 'Palo Alto', 'Los Altos', 'Cupertino', 'Half Moon Bay', 'San Jose', 'Milpitas']);

export default function AreaMap({ counts, selected, hrefFor }: { counts: Record<string, number>; selected?: string | null; hrefFor: (city: string | null) => string }) {
  return (
    <div className="map">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of Bay Area cities with pros online now">
        <rect width={W} height={H} fill="#121418" />
        <polygon points={poly(OCEAN)} fill="#0E1D2B" />
        <polygon points={poly(BAY)} fill="#0E1D2B" stroke="#22384A" />
        {CITIES.map((c) => {
          const [x, y] = xy(c.lat, c.lon); const n = counts[c.name] ?? 0; const on = selected === c.name;
          return (
            <Link key={c.name} href={hrefFor(on ? null : c.name)} aria-label={`${c.name}: ${n} online`}>
              {n > 0 && <circle cx={x} cy={y} r={14 + Math.min(n, 6) * 3} fill="rgba(60,203,127,.14)" className="pulse" />}
              <circle cx={x} cy={y} r={n ? 7 : 3.5} fill={n ? '#3CCB7F' : '#4A4440'} stroke={on ? '#E2B48C' : 'none'} strokeWidth={3} />
              {n > 0 && <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0C0C0E">{n}</text>}
              <text x={LEFT.has(c.name) ? x - 11 : x + 11} y={y + 4} textAnchor={LEFT.has(c.name) ? 'end' : 'start'} fontSize={n || on ? 13 : 10.5} fill={on ? '#E2B48C' : n ? '#F3EDE7' : '#7A7068'} fontFamily="Inter, sans-serif">{c.name}</text>
            </Link>
          );
        })}
      </svg>
    </div>
  );
}
