import Link from 'next/link';
import { getT } from '@/lib/i18n';

export default async function NotFound() {
  const t = await getT();
  return (
    <section className="sec pad"><div className="in" style={{ textAlign: 'center', padding: '80px 0' }}>
      <div className="eyebrow">404</div>
      <h2>{t('This page could not be found.')}</h2>
      <p className="mu"><Link href="/">{t('Home')}</Link> · <Link href="/search">{t('Find a pro')}</Link></p>
    </div></section>
  );
}
