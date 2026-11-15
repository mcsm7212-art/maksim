import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { isLang, makeT, type Lang } from './i18n-core';

/** Language: the "lang" cookie set by the switcher, else the browser language, else English. */
export const getLang = cache(async (): Promise<Lang> => {
  const c = (await cookies()).get('lang')?.value;
  if (isLang(c)) return c;
  const al = ((await headers()).get('accept-language') ?? '').toLowerCase();
  const first = al.split(',')[0]?.slice(0, 2);
  return first === 'es' ? 'es' : first === 'ru' ? 'ru' : 'en';
});
export const getT = cache(async () => makeT(await getLang()));
