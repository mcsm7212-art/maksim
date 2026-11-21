import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { I18nProvider } from '@/components/I18n';
import { getLang, getT } from '@/lib/i18n';
import { getTheme } from '@/lib/theme';
import BottomNav from '@/components/BottomNav';
import { getMe } from '@/lib/auth';
import { actionCount } from '@/lib/order-count';
import { SITE } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'NovaFides Marketplace · Pick your pro in the Bay Area', template: '%s · NovaFides' },
  description: 'Find a verified plumber, electrician, handyman or builder in the Bay Area. Real photos, real work, honest reviews. You choose one pro; your request goes only to them. Free for clients.',
  applicationName: 'NovaFides',
  icons: { icon: [{ url: '/emblem.png' }, { url: '/icon-192.png', sizes: '192x192' }], apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'NovaFides', statusBarStyle: 'black-translucent' },
  openGraph: { type: 'website', siteName: 'NovaFides Marketplace', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'NovaFides: pick your pro, not a lead auction' }] },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};
export const viewport: Viewport = { themeColor: '#0C0C0E', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang(); const t = await getT(); const theme = await getTheme();
  const me = await getMe(); const act = me ? await actionCount(me.id) : 0;
  return (
    <html lang={lang} data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800&family=Oswald:wght@600;700&family=Inter:wght@400;500;600&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <I18nProvider lang={lang}>
        <Header />
        <main className="wrap">{children}</main>
        <footer className="ft pad"><div className="in" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <span>© {new Date().getFullYear()} NovaFides Marketplace · Bay Area</span>
          <span style={{ display: 'flex', gap: 14 }}><Link href="/join">{t('For pros & companies')}</Link><Link href="/services">{t('Services & prices')}</Link><Link href="/rules">{t('Rules & reviews policy')}</Link><Link href="/terms">{t('Terms')}</Link><Link href="/privacy">{t('Privacy')}</Link></span>
        </div></footer>
        <BottomNav signedIn={Boolean(me)} act={act} />
        </I18nProvider>
      </body>
    </html>
  );
}
