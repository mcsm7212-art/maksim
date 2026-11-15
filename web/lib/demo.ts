// Sample data shown while the database is not connected (demo mode).
import { SERVICES, type Tier, type Trade } from './catalog';
import { accentFromUniform, baseFor } from './colors';
import type { Base, Company, Pro, Review } from './types';

function rng(seed: number) {
  let a = seed * 9301 + 49297;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const C = (slug: string, name: string, trade: Trade, accent: string, base: Base, city: string, license: string, since: number, warrantyMonths: number, rating: number, reviewCount: number, about: string): Company =>
  ({ id: `demo-${slug}`, slug, name, trade, accent, base, city, license, since, warrantyMonths, about, logoUrl: null, rating, reviewCount });

export const DEMO_COMPANIES: Company[] = [
  C('bayline', 'Bayline Plumbing', 'plumbing', '#2F7FE0', 'graphite', 'San Mateo', '1045872', 2011, 12, 4.8, 412, 'Family-owned plumbing company serving the Peninsula since 2011. Same-day service, upfront flat-rate pricing and a 12-month labor warranty.'),
  C('redwood-rooter', 'Redwood Rooter & Drain', 'plumbing', '#D9412E', 'dark', 'Redwood City', '1102394', 2016, 6, 4.7, 268, 'Drains, sewers and emergency plumbing. Trucks on the road until 10 PM every day.'),
  C('sunline', 'Sunline Electric', 'electrical', '#E8A400', 'light', 'Palo Alto', '998761', 2008, 12, 4.9, 530, 'Residential electricians for older Peninsula homes: panels, EV chargers, rewiring and lighting.'),
];

type Seed = [slug: string, name: string, co: string | null, trade: Trade, tiers: Tier[], years: number, rating: number, reviews: number, jobs: number, resp: number, uniform: string, online: boolean, area: string, mult: number, license: string | null, langs: string[], bio: string];
const SEEDS: Seed[] = [
  ['mike', 'Mike Reyes', 'bayline', 'plumbing', ['standard', 'premium'], 14, 4.9, 186, 248, 12, '#1F3E6E', true, 'San Mateo', 1.08, null, ['English', 'Spanish'], 'Fourteen years in residential plumbing. Water heaters and repipes are my specialty. I walk you through options before I start and leave the place cleaner than I found it.'],
  ['tom', 'Tom Becker', 'bayline', 'plumbing', ['economy', 'standard'], 7, 4.7, 92, 131, 18, '#1F3E6E', false, 'Burlingame', 1.0, null, ['English'], 'Fixtures, drains and toilets. Quick, careful and on time.'],
  ['jason', 'Jason Park', 'bayline', 'plumbing', ['economy'], 2, 4.6, 21, 34, 9, '#1F3E6E', true, 'Foster City', 0.9, null, ['English', 'Korean'], 'Licensed journeyman, two years in the field. Great value for faucets, toilets and small repairs.'],
  ['carlos', 'Carlos Diaz', 'redwood-rooter', 'plumbing', ['standard'], 11, 4.8, 143, 302, 6, '#B8352A', true, 'Redwood City', 1.02, null, ['English', 'Spanish'], "Drains, sewer lines and emergencies. If it's backing up, call me."],
  ['kevin', "Kevin O'Neil", 'redwood-rooter', 'plumbing', ['standard', 'premium'], 16, 4.9, 121, 211, 15, '#B8352A', false, 'Menlo Park', 1.12, null, ['English'], 'Sewer camera inspections and trenchless repairs. I show you the video and explain every option.'],
  ['priya', 'Priya Shah', 'sunline', 'electrical', ['standard', 'premium'], 12, 4.95, 168, 224, 14, '#F2B705', false, 'Palo Alto', 1.1, null, ['English', 'Hindi', 'Gujarati'], 'Master electrician. Panel upgrades and EV chargers for older homes, done safely and permitted.'],
  ['sam', 'Sam Torres', 'sunline', 'electrical', ['economy', 'standard'], 5, 4.7, 64, 97, 10, '#F2B705', true, 'Mountain View', 0.96, null, ['English', 'Spanish'], 'Outlets, lighting, ceiling fans and troubleshooting. Clear quotes, no surprises.'],
  ['maksim', 'Maksim Otto', null, 'plumbing', ['standard', 'premium'], 9, 4.9, 128, 246, 11, '#15151A', true, 'Redwood City', 1.05, '1121547', ['English', 'Russian'], 'Independent plumber in Redwood City. Water heaters, sewer lines, fixtures. Clean work, clear prices, and I answer my own phone.'],
  ['luis', 'Luis Moreno', null, 'handyman', ['economy', 'standard'], 8, 4.8, 97, 188, 16, '#138A84', true, 'Sunnyvale', 1.0, null, ['English', 'Spanish'], 'TV mounting, furniture assembly, drywall and doors. Small jobs done right the first time.'],
  ['grace', 'Grace Lin', null, 'electrical', ['standard', 'premium'], 10, 4.9, 84, 156, 20, '#2E4A7A', false, 'San Jose', 1.06, '1088203', ['English', 'Mandarin'], 'Independent electrician. Smart homes, lighting design and EV chargers.'],
  ['andre', 'Andre Johnson', null, 'handyman', ['economy'], 3, 4.6, 29, 47, 8, '#6E7A3A', true, 'Daly City', 0.9, null, ['English'], 'Affordable help with assembly, mounting and small fixes around the house.'],
];

const RVT: Record<Tier, string[]> = {
  premium: ['Showed up exactly on time in a clean uniform, put down drop cloths and shoe covers, and left the bathroom spotless. Worth every dollar.', 'Explained every option before starting and sent photos when he finished. Most professional service I have had.', 'Careful, clean and fast. Gave me tips to avoid the same problem next year.'],
  standard: ['Good work, fair price. Arrived a few minutes late but texted ahead.', 'Fixed it in under an hour and cleaned up after. Would hire again.', 'Clear quote, no surprises on the bill. Recommended.'],
  economy: ['Great value. Did the job well, though I had to sweep up a little afterward.', 'Quick and affordable. A bit quiet, but the work is solid.', 'Exactly what I needed for a small job. Fair price.'],
};
const NAMES = ['Anna K.', 'David R.', 'Emily S.', 'Raj P.', 'Laura M.', 'Chen W.', 'Monica T.', 'Steve B.', 'Olga V.', 'James H.', 'Fatima A.', 'Brian L.'];
const DAY = 864e5;

function build(s: Seed, i: number): Pro {
  const [slug, name, co, trade, tiers, years, rating, reviewCount, jobs, resp, uniform, online, area, mult, license, languages, bio] = s;
  const company = co ? DEMO_COMPANIES.find((c) => c.slug === co)! : null;
  const R = rng(i + 7);
  const list = SERVICES.filter((x) => x.trade === trade && x.lo < 9000);
  const pick = list.filter(() => R() < 0.62).slice(0, 14);
  if (pick.length < 6) pick.push(...list.slice(0, 6 - pick.length));
  let left = jobs;
  const services = pick.map((x, k) => {
    const n = k === pick.length - 1 ? Math.max(1, left) : Math.max(1, Math.round(left * (0.12 + R() * 0.18)));
    left = Math.max(1, left - n);
    return { id: x.id, jobs: n, price: Math.round(((x.lo + x.hi) / 2) * mult) };
  }).sort((a, b) => b.jobs - a.jobs);

  const accent = company ? company.accent : accentFromUniform(uniform);
  const r2 = rng(i * 29 + 5);
  const reviews: Review[] = Array.from({ length: 6 }, (_, k) => {
    const tier = tiers[Math.floor(r2() * tiers.length)];
    const low = k === 4; const base = low ? 3 : r2() > 0.25 ? 5 : 4;
    const svc = SERVICES.find((x) => x.id === services[k % services.length].id)!;
    return {
      id: `${slug}-${k}`, who: NAMES[(i * 3 + k) % NAMES.length],
      date: new Date(Date.UTC(2026, 10, 10) - (3 + k * 9 + Math.floor(r2() * 6)) * DAY).toISOString(),
      service: svc.name, tier,
      scores: { punctuality: low ? 2 : base, workmanship: low ? 4 : base, cleanliness: base, communication: base, pricing: base },
      text: low ? 'The repair works, but he was 40 minutes late and I had to call twice to find out where he was.' : RVT[tier][k % 3],
      reply: low ? "Thank you for the honest feedback. The job before yours ran long and I should have called you myself. I'm sorry. I've added a free follow-up check to your warranty." : k === 1 ? 'Thanks so much! It was a pleasure working in your home.' : null,
      resolved: low,
    };
  });
  const sk = (d: number) => Math.min(5, Math.round((rating + d) * 100) / 100);
  return {
    id: `demo-${slug}`, slug, name, company, trade, tiers, years, area, bio, languages,
    license: company ? company.license : license,
    verified: { license: true, id: true, insured: true }, photoUrl: null, uniform, accent,
    base: company ? company.base : baseFor(accent), online, responseMin: resp, tripFee: 95,
    rating, reviewCount, jobs,
    skills: { punctuality: sk(0), workmanship: sk(0.04), cleanliness: sk(-0.03), communication: sk(0), pricing: sk(-0.02) },
    services, reviews,
    availability: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: '08:00', end: '18:00' })),
    busy: [],
  };
}

export const DEMO_PROS: Pro[] = SEEDS.map(build);
