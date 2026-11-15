'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { LANGS } from '@/lib/i18n-core';
import { useLang } from './I18n';

export default function LangSwitch() {
  const lang = useLang(); const path = usePathname(); const sp = useSearchParams();
  const back = encodeURIComponent(`${path}${sp.size ? `?${sp}` : ''}`);
  return (
    <span className="langs" aria-label="Language">
      {LANGS.map((l) => <a key={l.code} href={`/lang?to=${l.code}&back=${back}`} aria-current={l.code === lang} hrefLang={l.code}>{l.label}</a>)}
    </span>
  );
}
