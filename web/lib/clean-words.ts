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
/** Letters that are not Latin (Cyrillic, Greek, Hebrew, Arabic, Indic, Thai, Chinese, Japanese, Korean). Accents are fine. */
export const nonLatin = (t: string | null | undefined) => /[\u0400-\u052F\u0370-\u03FF\u0590-\u06FF\u0900-\u0DFF\u0E00-\u0EFF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/.test(t ?? '');
/** @deprecated kept for older imports */
export const hasCyrillic = nonLatin;

// Spanish typed in Latin letters: recognised by typical words (place names like Los Altos or Del Mar alone are not enough).
const ES_STRONG = new Set('que con para por muy más mas soy tengo años trabajo trabajos servicio servicios reparación reparacion reparaciones instalación instalacion baño baños cocina agua tubería tuberia tuberías plomero plomería plomeria hago también tambien todo todos casa casas precio precios calentador fuga fugas limpieza pintura techo techos electricista mantenimiento cliente clientes rápido rapido calidad experiencia hablo español espanol y o pero cuando donde nuestro nuestros sus mis hacemos ofrezco ofrecemos garantía garantia'.split(' '));
const ES_WEAK = new Set('el la los las del una unos un de al'.split(' '));
const EN = new Set('the and for with to of in on my i we you your a an is are at by from or our it this that have has will can all do fix install repair service services'.split(' '));
export function looksSpanish(t: string | null | undefined): boolean {
  const s = (t ?? '').toLowerCase();
  if (/[¿¡]/.test(s)) return true;
  const w = s.split(/[^a-záéíóúüñ]+/).filter(Boolean);
  const strong = w.filter((x) => ES_STRONG.has(x)).length, weak = w.filter((x) => ES_WEAK.has(x)).length, en = w.filter((x) => EN.has(x)).length;
  return strong >= 1 && strong + weak > en;
}
/** Not English: other alphabets, or Spanish words. Use for texts; for names use nonLatin only. */
export const notEnglish = (t: string | null | undefined) => nonLatin(t) || looksSpanish(t);
export const ENGLISH_ONLY = 'Write in English (Latin letters): clients in California read English. The site translates only its own menus, not your text.';

/** Turns the database refusals into words people understand. */
export function cleanWordsError(msg: string): string | null {
  if (/inappropriate words/.test(msg)) return 'Please remove rude or offensive words. Clients see this text.';
  if (/english only/.test(msg)) return ENGLISH_ONLY;
  return null;
}
