// Quick tone check for public replies to reviews. Keeps replies calm; an AI check can replace this later.
const RULES: [RegExp, string][] = [
  [/\b(liar|lying|lie|lies|fake|scam(mer)?|fraud|crazy|stupid|idiot|dumb|insane|psycho)\b/i, 'Avoid calling the client names or saying they lie. Explain what happened instead.'],
  [/\b(sue|lawyer|attorney|court|police|report you)\b/i, 'Do not threaten legal action in a public reply. Use “Report review” if it breaks the rules.'],
  [/\b(fuck|shit|damn|bitch|ass(hole)?|crap)\b/i, 'Please remove rude words.'],
  [/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|@[a-z0-9.-]+\.[a-z]{2,}|https?:\/\//i, 'Do not post phone numbers, emails or links in a reply.'],
  [/\b(address|lives at|her house|his house)\b/i, 'Do not share details about the client or their home.'],
];
export function toneCheck(text: string): string | null {
  const t = text.trim();
  if (t.length < 10) return 'Write at least a short sentence.';
  if (t.length > 600) return 'Keep the reply under 600 characters.';
  const letters = t.replace(/[^a-z]/gi, '');
  if (letters.length > 20 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.6) return 'Please do not write in capital letters. It reads as shouting.';
  if ((t.match(/!/g) ?? []).length > 3) return 'Fewer exclamation marks reads calmer.';
  for (const [re, msg] of RULES) if (re.test(t)) return msg;
  return null;
}
