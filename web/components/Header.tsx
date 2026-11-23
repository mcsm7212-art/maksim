/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
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
import Ic3d from './Ic3d';

export default async function Header() {
  const me = await getMe(); const t = await getT(); const theme = await getThemeChoice();
  // Unread things: the chat icon and "My account" pulse softly so people see where to look.
  let newMsgs = 0, newAny = 0;
  if (me && isLive()) {
    const { data } = await (await supabaseServer()).from('notifications').select('link').eq('user_id', me.id).is('read_at', null).limit(100);
    newAny = (data ?? []).length; newMsgs = (data ?? []).filter((n) => String(n.link ?? '').startsWith('/messages/')).length;
  }
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
            {me && <Link href="/messages" className={`ico ico-chat${newMsgs ? ' pulse-green' : ''}`} title={t('Messages')} aria-label={t('Messages')}>
              {newMsgs > 0 && <b className="ico-n">{newMsgs > 9 ? '9+' : newMsgs}</b>}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </Link>}
            {me ? <AccountMenu alert={newAny > 0} label={t('My account')} signOut={t('Sign out')} links={[
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
              <Link2 href="/companies" className="mm"><Ic3d name="company" size={38} /><span><b>{t('Companies')}</b><small>{t('Licensed companies and their teams')}</small></span></Link2>
              <Link2 href="/online" className="mm in-nav"><Ic3d name="location" size={38} /><span><b>{t('Online now')} <i className="dot-live" /></b><small>{t('Pros on the site right now, by city')}</small></span></Link2>
              <Link2 href="/feed" className="mm"><Ic3d name="handyman" size={38} /><span><b>{t('Work & tips')}</b><small>{t('Real jobs and advice from pros')}</small></span></Link2>
              <Link2 href="/questions" className="mm in-nav"><Ic3d name="chat" size={38} /><span><b>{t('Questions')}</b><small>{t('Ask, verified pros answer')}</small></span></Link2>
              <Link2 href="/photo" className="mm"><Ic3d name="photo-search" size={38} /><span><b>{t('Search by photo')}</b><small>{t('Snap the problem, find the job')}</small></span></Link2>
              {!me?.pro && <Link2 href="/join" className="mm in-nav"><Ic3d name="verified" size={38} /><span><b>{t('For pros')}</b><small>{t('Free during the launch')}</small></span></Link2>}
              <span className="mm-sect phone-only">{t('Interface settings')}</span>
              <div className="more-row phone-only"><UiFeel engine={false} /><Suspense><LangSwitch /></Suspense></div>
              <div className="more-theme phone-only"><ThemeToggle initial={theme} inline /></div>
            </MoreMenu>
          </div>
        </div>
      </header>
    </>
  );
}
