/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { getT } from '@/lib/i18n';
import { Suspense } from 'react';
import LangSwitch from './LangSwitch';
import AccountMenu from './AccountMenu';

export default async function Header() {
  const me = await getMe(); const t = await getT();
  return (
    <>
      {!isLive() && <div className="demo">{t('Demo mode: sample pros, sign-up turns on when the database is connected.')}</div>}
      <header className="bar pad">
        <div className="in">
          <Link href="/" className="logo" aria-label="NovaFides Marketplace home">
            <img src="/emblem.png" width={38} height={38} alt="" />
            <span><b>Nova<span>Fides</span></b><small>MARKETPLACE</small></span>
          </Link>
          <nav className="nav" aria-label="Main">
            <Link href="/search">{t('Find a pro')}</Link>
            <Link href="/companies">{t('Companies')}</Link>
            <Link href="/online">● {t('Online now')}</Link>
            <Link href="/feed">{t('Feed')}</Link>
            {!me && <Link href="/join">{t('For pros')}</Link>}
          </nav>
          <div className="hdr-me">
            {me && <Link href="/my-pros" className="ico" title={t('My pros')} aria-label={t('My pros')}>♥</Link>}
            {me && <Link href="/messages" className="ico" title={t('Messages')} aria-label={t('Messages')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </Link>}
            {me ? <AccountMenu label={t('My account')} signOut={t('Sign out')} links={[
              { href: '/account', text: t('My account') },
              { href: '/my-pros', text: '♥ ' + t('My pros') },
              { href: '/messages', text: t('Messages') },
              ...(me.companies.some((c) => c.role !== 'technician') ? [{ href: '/business', text: t('Business') }] : []),
              ...(me.role === 'admin' ? [{ href: '/admin', text: 'Admin' }] : []),
              ...(!me.pro && !me.companies.length ? [{ href: '/join', text: t('For pros') }] : []),
            ]} /> : <Link href="/login" className="btn sm">{t('Sign in')}</Link>}
            <Suspense><LangSwitch /></Suspense>
          </div>
        </div>
      </header>
    </>
  );
}
