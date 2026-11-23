// Same rule as public.bad_text() in the database (migration 0033): rude words in English, Spanish and Russian,
// also with tricks like sh1t or f*ck. Used to warn in the form; the database refuses them anyway.
const ANY = /(fuck|shit|bitch|cunt|asshole|whore|nigg|fagg|porn|pussy|motherf|mierda|chingad|pendej|cabron|maricon|хуй|хуе|хуя|пизд|бляд|блят|шлюх|дерьм|говн|залуп|пидор|пидар|гандон|pizd|blyad|blyat|pidor|zalup)/;
const WORD = /(^|[^a-zа-я])(cock|cocks|sex|sexy|anal|cum|tits|boobs?|penis|vagina|rape|slut|bastard|retard|nude|ass|puta|puto|culo|verga|joto|pinche|жоп[аыуе]|сук[аи]|мудак|мраз[ьи]|еба[лт]|ебл[аио]|zhop[ae]|suka)($|[^a-zа-я])/;
const START = /(^|[^a-zа-я])(ебан|заеб|уеб|выеб|отъеб)/;
const plain = (s: string) => ANY.test(s) || WORD.test(s) || START.test(s);

export function badText(t: string | null | undefined): boolean {
  const map: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '@': 'a', $: 's', '5': 's', '!': 'i', '|': 'i' };
  const s = (t ?? '').replace(/[0134@$5!|]/g, (c) => map[c]).toLowerCase().replace(/ё/g, 'е');
  return ['u', 'i', 'a', 'o', 'e'].some((v) => plain(s.replace(/\*/g, v)));
}
export const hasCyrillic = (t: string | null | undefined) => /[А-Яа-яЁё]/.test(t ?? '');

/** Turns the database refusals into words people understand. */
export function cleanWordsError(msg: string): string | null {
  if (/inappropriate words/.test(msg)) return 'Please remove rude or offensive words. Clients see this text.';
  if (/english only/.test(msg)) return 'Write your trade and your own jobs in English (Latin letters).';
  return null;
}
