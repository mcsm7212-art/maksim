'use client';
import { DISCLAIMER } from '@/lib/legal-short';
import { useLang } from './I18n';

/** "NovaFides is an information platform…" — shown where a price is agreed or a visit is booked. */
export default function Disclaimer({ style }: { style?: React.CSSProperties }) {
  const lang = useLang();
  return <p className="disclaimer" style={style}>ⓘ {DISCLAIMER[lang] ?? DISCLAIMER.en} <a href="/terms">{lang === 'ru' ? 'Условия' : lang === 'es' ? 'Términos' : 'Terms'}</a></p>;
}
