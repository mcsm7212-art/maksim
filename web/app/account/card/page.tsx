import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CardBack, CardFront } from '@/components/BizCard';
import { getMe } from '@/lib/auth';
import { cardData } from '@/lib/card-data';
import { getPro } from '@/lib/data';
import { getT } from '@/lib/i18n';
import { siteUrl } from '@/lib/site';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { saveCardPhone } from './actions';
import HandleForm from './HandleForm';

export const metadata = { title: 'My business card' };

export default async function CardPage() {
  const tr = await getT();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr('My business card')}</h2><p className="mu">{tr('Demo mode.')}</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/account/card');
  if (!me.pro) redirect('/account');
  const pro = await getPro(me.pro.slug);
  if (!pro) redirect('/account');
  const sb = await supabaseServer();
  const { data: priv } = await sb.from('pro_private').select('card_phone').eq('pro_id', me.id).maybeSingle();
  const d = await cardData(pro, priv?.card_phone ?? null, tr);
  const site = await siteUrl();
  const url = `${site}/${pro.slug}`;
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 860 }}>
      <div className="eyebrow"><Link href="/account">{tr('My account')}</Link> · {tr('Business card')}</div>
      <h2>{tr('My business card')}</h2>

      <div className="card formcard" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>1. {tr('Short address')}</h3>
        <div><a href={url} style={{ fontSize: 20, fontWeight: 700, color: 'var(--cu-l)' }}>{d.shortLabel}</a></div>
        <HandleForm current={pro.slug} host={site.replace(/^https?:\/\//, '')} />
      </div>

      <div className="card formcard" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>2. {tr('Card preview')}</h3>
        {!pro.photoUrl && <div className="note">{tr('Add your real photo in “Edit profile”: cards with a face get more calls.')}</div>}
        <div className="cardpair"><CardFront d={d} /><CardBack d={d} /></div>
        <form action={saveCardPhone} className="row2" style={{ alignItems: 'end' }}>
          <label className="f">{tr('Phone on the card (optional, printed only, not shown on the site)')}<input className="inp" name="phone" defaultValue={priv?.card_phone ?? ''} inputMode="tel" placeholder="(650) 555-0100" /></label>
          <button className="btn ghost sm" style={{ alignSelf: 'end' }}>{tr('Save phone')}</button>
        </form>
      </div>

      <div className="card formcard">
        <h3 style={{ margin: 0 }}>3. {tr('Print and share')}</h3>
        <div className="chips">
          <Link className="btn" href="/account/card/print" target="_blank">{tr('Print 10 cards (Letter sheet)')}</Link>
          <a className="btn ghost" href={`/api/qr/${pro.slug}?format=png`}>{tr('QR code for phone / Instagram (PNG)')}</a>
          <a className="btn ghost" href={`/api/qr/${pro.slug}`} download>{tr('QR code for print shops (SVG)')}</a>
          <a className="btn ghost" href={`/api/vcard/${pro.slug}`}>{tr('Contact file (vCard)')}</a>
        </div>
        <span className="mu xs">{tr('The sheet fits Avery 8371 / 5371 business card paper, or any print shop: print at 100% scale, both sides. The QR code works on any phone camera.')}</span>
      </div>
    </div></section>
  );
}
