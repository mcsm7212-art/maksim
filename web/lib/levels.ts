// Launch rule: a profile looks like a simple listing (photo, experience, skills, work photos, reviews).
// Levels, job counters and the 5-skill passport appear only once a pro has enough real NovaFides history.
export const STATS_MIN_JOBS = 20;
export const STATS_MIN_REVIEWS = 10;
export const showStats = (p: { jobs: number; reviewCount: number }) => p.jobs >= STATS_MIN_JOBS && p.reviewCount >= STATS_MIN_REVIEWS;

export function levelOf(jobs: number, rating: number | null) {
  if (jobs >= 150 && (rating ?? 0) >= 4.8) return { n: 'Gold Specialist', rule: '150+ jobs on NovaFides, rating 4.8+' };
  if (jobs >= 60 && (rating ?? 0) >= 4.6) return { n: 'Silver Pro', rule: '60+ jobs, rating 4.6+' };
  return { n: 'Rising Pro', rule: 'Fewer than 60 jobs on NovaFides' };
}
