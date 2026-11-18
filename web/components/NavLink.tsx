'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Header link that marks the page you are on. */
export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const on = path === href || (href !== '/' && path.startsWith(href + '/'));
  return <Link href={href} aria-current={on ? 'page' : undefined}>{children}</Link>;
}
