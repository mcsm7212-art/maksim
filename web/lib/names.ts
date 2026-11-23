/**
 * Does the name the pro typed share a word with the name on the CSLB license?
 * Words of 3+ letters are compared; "Maks" and "Maksim" count as the same word.
 * Licenses are often in a company's name, so a mismatch is a warning for the admin, not a refusal.
 */
export function namesMatch(pro: string, ...license: (string | null | undefined)[]): boolean {
  const words = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter((w) => w.length >= 3);
  const a = words(pro); const b = license.flatMap((x) => words(x ?? ''));
  if (!a.length || !b.length) return false;
  return a.some((x) => b.some((y) => x === y || (Math.min(x.length, y.length) >= 4 && (x.startsWith(y) || y.startsWith(x)))));
}
