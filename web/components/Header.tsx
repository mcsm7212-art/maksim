/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';

export default async function Header() {
  const me = await getMe();
  return (
    <>
      {!isLive() && <div className="demo">Demo mode: sample pros, sign-up turns on when the database is connected.</div>}
      <header className="bar pad">
        <div className="in">
          <Link href="/" className="logo" aria-label="NovaFides Marketplace home">
            <img src="/emblem.png" width={38} height={38} alt="" />
            <span><b>Nova<span>Fides</span></b><small>MARKETPLACE</small></span>
          </Link>
          <nav className="nav" aria-label="Main">
            <Link href="/search">Find a pro</Link>
            <Link href="/companies">Companies</Link>
            <Link href="/online">● Online now</Link>
            {me?.role === 'admin' && <Link href="/admin">Admin</Link>}
            {me?.companies.some((c) => c.role !== 'technician') && <Link href="/business">Business</Link>}
            {me && <Link href="/messages">Messages</Link>}
            {me ? <Link href="/account">My account</Link> : <Link href="/login">Sign in</Link>}
            {!me?.pro && !me?.companies.length && <Link href="/join">For pros</Link>}
          </nav>
        </div>
      </header>
    </>
  );
}
