'use client';
import { createContext, useContext, useMemo } from 'react';
import { makeT, type Lang } from '@/lib/i18n-core';

const Ctx = createContext<Lang>('en');
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}
export function useLang() { return useContext(Ctx); }
export function useT() { const lang = useContext(Ctx); return useMemo(() => makeT(lang), [lang]); }
