// Notifications are stored in English by the database; this shows them in the reader's language.
import type { T } from './i18n-core';

const PATTERNS: [RegExp, string][] = [
  [/^New message from (.+)\.$/, 'New message from {a}.'],
  [/^(.+) assigned (.+) to your visit\.$/, '{a} assigned {b} to your visit.'],
  [/^(.+) changed your technician: (.+) → (.+)\.$/, '{a} changed your technician: {b} → {c}.'],
  [/^(.+) asks to change your technician to (.+)\. Your approval is needed\.$/, '{a} asks to change your technician to {b}. Your approval is needed.'],
  [/^Your profile was not approved: (.+)\.$/, 'Your profile was not approved: {a}.'],
  [/^Your company was not approved: (.+)\.$/, 'Your company was not approved: {a}.'],
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
