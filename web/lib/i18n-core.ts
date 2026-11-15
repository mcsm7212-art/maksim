// Translations. The English text is the key; missing translations fall back to English.
import { ES, RU } from './i18n-dict';
import type { Service } from './catalog';

export type Lang = 'en' | 'es' | 'ru';
export const LANGS: { code: Lang; label: string }[] = [{ code: 'en', label: 'EN' }, { code: 'es', label: 'ES' }, { code: 'ru', label: 'RU' }];
export const isLang = (x: unknown): x is Lang => x === 'en' || x === 'es' || x === 'ru';
export type T = (s: string, v?: Record<string, string | number>) => string;

export function makeT(lang: Lang): T {
  const d: Record<string, string> = lang === 'es' ? ES : lang === 'ru' ? RU : {};
  return (s, v) => {
    let r = d[s] ?? s;
    if (v) for (const [k, x] of Object.entries(v)) r = r.split(`{${k}}`).join(String(x));
    return r;
  };
}
/** Service name in the chosen language (Russian names come from the catalog). */
export const svcName = (s: Pick<Service, 'name' | 'ru'> | undefined, lang: Lang) => (!s ? '' : lang === 'ru' && s.ru ? s.ru : s.name);
