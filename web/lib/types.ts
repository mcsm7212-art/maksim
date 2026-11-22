import type { Tier, Trade } from './catalog';

export type Base = 'dark' | 'graphite' | 'light' | 'teal';

export interface Company {
  id: string;
  slug: string;
  name: string;
  trade: Trade;
  accent: string;
  base: Base;
  city: string;
  license: string | null;
  since: number | null;
  warrantyMonths: number;
  about: string;
  logoUrl: string | null;
  rating: number | null;
  reviewCount: number;
}

export interface SkillScores {
  punctuality: number;
  workmanship: number;
  cleanliness: number;
  communication: number;
  pricing: number;
}

export interface ProService {
  id: string;
  jobs: number;
  /** Pro's Standard price; null = use market average */
  price: number | null;
}

export interface Review {
  id: string;
  who: string;
  date: string; // ISO
  service: string;
  tier: Tier;
  scores: SkillScores;
  text: string;
  reply?: string | null;
  resolved?: boolean;
  /** How much this review counts in the rating, 0..1 (every review stays visible) */
  weight?: number;
  /** Why it counts less: competitor | harsh | praise | resolved */
  why?: string | null;
  helpful?: number;
}

export interface Pro {
  id: string;
  slug: string;
  name: string;
  company: Company | null;
  trade: Trade;
  tiers: Tier[];
  years: number;
  area: string;
  bio: string;
  /** Free text: where the pro worked, what they are best at */
  experience: string;
  /** Short skill tags, e.g. "Tankless water heaters" */
  skillTags: string[];
  /** Work photos uploaded by the pro (portfolio) */
  photos: { id: string; url: string; caption: string | null }[];
  languages: string[];
  license: string | null;
  verified: { license: boolean; id: boolean; insured: boolean };
  /** When NovaFides checked each item (ISO), if known */
  checkedAt: { license: string | null; id: string | null; insured: string | null };
  photoUrl: string | null;
  /** Full-height cutout (transparent background) for the big figure on the pro page */
  figureUrl: string | null;
  uniform: string | null;
  accent: string;
  base: Base;
  online: boolean;
  /** Joined during the free launch period */
  founding: boolean;
  /** City the pro is working in right now (when online) */
  onlineArea: string | null;
  /** Example profile for the launch: labeled, never bookable, never counted as available */
  isDemo: boolean;
  /** Taking new jobs (a pause with an end date ends by itself) */
  accepting: boolean;
  /** Paused until this date (YYYY-MM-DD), if the pro set one */
  pausedUntil: string | null;
  /** Online now AND takes urgent calls */
  urgent: boolean;
  /** Extra call-out fee for urgent visits, if the pro set one */
  urgentFee: number | null;
  responseMin: number | null;
  tripFee: number;
  /** Phone and call hours the pro chose to show (null = not shown) */
  publicPhone?: string | null;
  /** Service area: center and radius in miles, if the pro set it on the map */
  serviceArea?: { lat: number; lng: number; radius: number } | null;
  callHours?: string | null;
  rating: number | null;
  reviewCount: number;
  /** Cautious score for ordering: few reviews are pulled toward the platform average */
  rankScore?: number | null;
  jobs: number;
  skills: SkillScores | null; // averages 1..5
  services: ProService[];
  reviews: Review[];
  /** weekday 0..6, hours "08:00" */
  availability: { weekday: number; start: string; end: string }[];
  /** Busy time ranges (ISO): NovaFides jobs and blocks imported from the pro's own calendar */
  busy: { start: string; end: string }[];
}
