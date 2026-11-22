/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { getT } from '@/lib/i18n';
import { Suspense } from 'react';
import LangSwitch from './LangSwitch';
import AccountMenu from './AccountMenu';
import ThemeToggle from './ThemeToggle';
import UiFeel from './UiFeel';
import { getThemeChoice } from '@/lib/theme';
import NavLink from './NavLink';
import MoreMenu from './MoreMenu';
import Link2 from 'next/link';
import NavProgress from './NavProgress';

export default async function Header() {
  const me = await getMe(); const t = await getT(); const theme = await getThemeChoice();
  return (
    <>
      {!isLive() && <div className="demo">{t('Demo mode: sample pros, sign-up turns on when the database is connected.')}</div>}
      <Suspense><NavProgress /></Suspense>
      <header className="bar pad">
        <div className="in">
          <Link href="/" className="logo" aria-label="NovaFides Marketplace home">
            <img src="/emblem.png" width={38} height={38} alt="" />
            <span><b>Nova<span>Fides</span></b><small>MARKETPLACE</small></span>
          </Link>
          <nav className="nav" aria-label="Main">
            <NavLink href="/search">{t('Find a pro')}</NavLink>
            <NavLink href="/online">● {t('Online now')}</NavLink>
            <NavLink href="/questions">{t('Questions')}</NavLink>
            {!me && <NavLink href="/join">{t('For pros')}</NavLink>}
          </nav>
          <div className="hdr-me">
            {me && <Link href="/my-pros" className="ico" title={t('My pros')} aria-label={t('My pros')}>♥</Link>}
            {me && <Link href="/messages" className="ico ico-chat" title={t('Messages')} aria-label={t('Messages')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </Link>}
            {me ? <AccountMenu label={t('My account')} signOut={t('Sign out')} links={[
              { href: '/account', text: t('My account') },
              { href: '/my-pros', text: '♥ ' + t('My pros') },
              { href: '/my-home', text: '🏠 ' + t('My home') },
              { href: '/orders', text: t('Orders') },
              { href: '/messages', text: t('Messages') },
              ...(me.pro ? [{ href: '/lounge', text: t('Pro Lounge') }, { href: '/account/projects', text: '📸 ' + t('Client projects') }, { href: '/account/work', text: t('Work & chat settings') }] : [{ href: `/client/${me.id}`, text: '📸 ' + t('My projects') }]),
              { href: '/neighbors', text: t('Neighbors') },
              ...(me.companies.some((c) => c.role !== 'technician') ? [{ href: '/business', text: t('Business') }] : []),
              ...(me.role === 'admin' ? [{ href: '/admin', text: 'Admin' }] : []),
              ...(!me.pro && !me.companies.length ? [{ href: '/join', text: t('For pros') }] : []),
            ]} /> : <Link href="/login" className="btn sm">{t('Sign in')}</Link>}
            <UiFeel />
            <ThemeToggle initial={theme} />
            <Suspense><LangSwitch /></Suspense>
            <MoreMenu>
              <Link2 href="/companies">{t('Companies')}</Link2>
              <Link2 href="/online">● {t('Online now')}</Link2>
              <Link2 href="/feed">{t('Work & tips')}</Link2>
              <Link2 href="/questions">{t('Questions')}</Link2>
              <Link2 href="/photo">📷 {t('Search by photo')}</Link2>
              {!me?.pro && <Link2 href="/join">{t('For pros')}</Link2>}
              <div className="more-row"><UiFeel engine={false} /><Suspense><LangSwitch /></Suspense></div>
              <div className="more-theme"><ThemeToggle initial={theme} inline /></div>
            </MoreMenu>
          </div>
        </div>
      </header>
    </>
  );
}
