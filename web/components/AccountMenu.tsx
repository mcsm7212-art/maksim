'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** "My account ▾" dropdown in the header. Closes on navigation and on a click outside. */
export default function AccountMenu({ label, links, signOut }: { label: string; links: { href: string; text: string }[]; signOut: string }) {
  const ref = useRef<HTMLDetailsElement>(null); const path = usePathname();
  useEffect(() => { if (ref.current) ref.current.open = false; }, [path]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false; };
    document.addEventListener('click', close); return () => document.removeEventListener('click', close);
  }, []);
  return (
    <details className="acct" ref={ref}>
      <summary>{label} <span aria-hidden>▾</span></summary>
      <div className="acct-menu">
        {links.map((l) => <Link key={l.href} href={l.href}>{l.text}</Link>)}
        <form action="/auth/signout" method="post"><button>{signOut}</button></form>
      </div>
    </details>
  );
}
