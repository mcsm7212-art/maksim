import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
type F = { properties: Record<string, string | undefined> };

/**
 * Address suggestions for the booking form. Uses the free OpenStreetMap search (Photon), California only, Bay Area first.
 * Only the typed text is sent there: no account, name or email.
 */
export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 120);
  if (q.length < 4) return NextResponse.json({ items: [] });
  if (process.env.NOVAFIDES_TEST_GEO === 'fake') return NextResponse.json({ items: [`${q.replace(/\s+/g, ' ')}, San Mateo, CA 94401`, `${q.replace(/\s+/g, ' ')}, San Jose, CA 95112`] });
  const typedNo = q.match(/^\d{1,6}[A-Za-z]?(?=\s)/)?.[0];
  try {
    const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=37.6&lon=-122.2&limit=8&lang=en&bbox=-124.5,32.4,-114.1,42.1`;
    const r = await fetch(u, { headers: { 'User-Agent': 'marketplace-address-suggest/1.0' }, signal: AbortSignal.timeout(3500), next: { revalidate: 86400 } });
    if (!r.ok) return NextResponse.json({ items: [] });
    const d = (await r.json()) as { features?: F[] };
    const items = [...new Set((d.features ?? []).map(({ properties: p }) => {
      if (p.countrycode !== 'US' || (p.state && p.state !== 'California')) return '';
      const street = p.street ?? (p.osm_key === 'highway' ? p.name : undefined); if (!street) return '';
      const city = p.city ?? p.town ?? p.village ?? p.county ?? '';
      const no = typedNo ?? p.housenumber; // the street is found, the house number is the one the person typed
      return [`${no ? `${no} ` : ''}${street}`, city, `CA${p.postcode ? ` ${p.postcode}` : ''}`].filter(Boolean).join(', ');
    }).filter(Boolean))].slice(0, 5);
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch { return NextResponse.json({ items: [] }); }
}
