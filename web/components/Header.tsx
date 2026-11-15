/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { getT } from '@/lib/i18n';
import { Suspense } from 'react';
import LangSwitch from './LangSwitch';

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
            {me?.role === 'admin' && <Link href="/admin">Admin</Link>}
            {me?.companies.some((c) => c.role !== 'technician') && <Link href="/business">{t('Business')}</Link>}
            {me && <Link href="/messages">{t('Messages')}</Link>}
            {me ? <Link href="/account">{t('My account')}</Link> : <Link href="/login">{t('Sign in')}</Link>}
            {!me?.pro && !me?.companies.length && <Link href="/join">{t('For pros')}</Link>}
          </nav>
          <Suspense><LangSwitch /></Suspense>
        </div>
      </header>
    </>
  );
}
