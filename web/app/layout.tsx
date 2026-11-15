import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'NovaFides Marketplace', template: '%s · NovaFides' },
  description: 'Book a verified plumber, electrician or handyman in the Bay Area. You choose one pro. No lead selling.',
  icons: { icon: '/emblem.png' },
};
export const viewport: Viewport = { themeColor: '#0C0C0E', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800&family=Inter:wght@400;500;600&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Header />
        <main className="wrap">{children}</main>
        <footer className="ft pad"><div className="in" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <span>© {new Date().getFullYear()} NovaFides Marketplace · Bay Area</span>
          <span style={{ display: 'flex', gap: 14 }}><Link href="/join">For pros &amp; companies</Link><Link href="/rules">Rules &amp; reviews policy</Link></span>
        </div></footer>
      </body>
    </html>
  );
}
