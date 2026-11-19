'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from './I18n';

const I = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  find: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  orders: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  me: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
};
/** Five fixed sections on phones: Home, Find, Messages, Orders, Profile. */
export default function BottomNav({ signedIn, act }: { signedIn: boolean; act: number }) {
  const t = useT(); const path = usePathname();
  const items: [string, keyof typeof I, string, number?][] = [
    ['/', 'home', 'Home'], ['/search', 'find', 'Find'], ['/messages', 'chat', 'Messages'],
    ['/orders', 'orders', 'Orders', act], [signedIn ? '/account' : '/login', 'me', signedIn ? 'Profile' : 'Sign in'],
  ];
  const on = (h: string) => (h === '/' ? path === '/' : path === h || path.startsWith(h + '/'));
  return (
    <nav className="bnav" aria-label={t('Sections')}>
      {items.map(([h, ic, label, n]) => (
        <Link key={h} href={h} aria-current={on(h) ? 'page' : undefined}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[ic]}</svg>
          <span>{t(label)}</span>{n ? <i>{n}</i> : null}
        </Link>))}
    </nav>
  );
}
