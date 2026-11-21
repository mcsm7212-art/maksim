// Notifications are stored in English by the database; this shows them in the reader's language.
import type { T } from './i18n-core';

const PATTERNS: [RegExp, string][] = [
  [/^New message from (.+)\.$/, 'New message from {a}.'],
  [/^(.+) assigned (.+) to your visit\.$/, '{a} assigned {b} to your visit.'],
  [/^(.+) changed your technician: (.+) → (.+)\.$/, '{a} changed your technician: {b} → {c}.'],
  [/^(.+) asks to change your technician to (.+)\. Your approval is needed\.$/, '{a} asks to change your technician to {b}. Your approval is needed.'],
  [/^Your profile was not approved: (.+)\.$/, 'Your profile was not approved: {a}.'],
  [/^Your company was not approved: (.+)\.$/, 'Your company was not approved: {a}.'],
  [/^New invoice (\S+): (\$[\d.,]+)\.$/, 'New invoice {a}: {b}.'],
  [/^New post from (.+)\.$/, 'New post from {a}.'],
  [/^New quote from (.+): \$([\d.,]+)\.$/, 'New quote from {a}: ${b}.'],
  [/^(.+) accepted your quote \(\$([\d.,]+)\)\.$/, '{a} accepted your quote (${b}).'],
  [/^(.+) declined your quote\.$/, '{a} declined your quote.'],
  [/^(.+) added you as a colleague\.$/, '{a} added you as a colleague.'],
  [/^(.+) commented on your post\.$/, '{a} commented on your post.'],
  [/^(.+) answered your question\.$/, '{a} answered your question.'],
  [/^(.+) picked your answer as the best\.$/, '{a} picked your answer as the best.'],
  [/^(.+) replied in the Lounge\.$/, '{a} replied in the Lounge.'],
  [/^(.+) recommends you on their page\.$/, '{a} recommends you on their page.'],
  [/^(.+) shared a project with your work\. Confirm it was your job\.$/, '{a} shared a project with your work. Confirm it was your job.'],
  [/^(.+) confirmed your project\. It is now public\.$/, '{a} confirmed your project. It is now public.'],
  [/^(.+) did not confirm your project\.$/, '{a} did not confirm your project.'],
  [/^New verified pro on NovaFides: (.+)\.$/, 'New verified pro on NovaFides: {a}.'],
];
export function noteText(body: string, tr: T): string {
  const direct = tr(body);
  if (direct !== body) return direct;
  for (const [re, key] of PATTERNS) {
    const m = body.match(re);
    if (m) return tr(key, { a: m[1] ?? '', b: m[2] ?? '', c: m[3] ?? '' });
  }
  return body;
}
