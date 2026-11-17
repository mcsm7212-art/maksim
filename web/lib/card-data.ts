import 'server-only';
import { TRADES } from './catalog';
import type { T } from './i18n-core';
import { qrSvg } from './qr';
import { shortLabel, siteUrl } from './site';
import type { Pro } from './types';
import type { CardData } from '@/components/BizCard';

export async function cardData(pro: Pro, phone: string | null, tr: T): Promise<CardData> {
  const site = await siteUrl();
  return {
    name: pro.name, trade: tr(TRADES[pro.trade].name), who: pro.company ? pro.company.name : tr('Independent pro'),
    license: pro.license, rating: pro.reviewCount > 0 && pro.rating != null ? `${pro.rating.toFixed(1)} · ${tr(pro.reviewCount > 1 ? '{n} reviews' : '{n} review', { n: pro.reviewCount })}` : null,
    phone, photo: pro.photoUrl, accent: pro.accent, shortLabel: shortLabel(site, pro.slug),
    qrSvg: await qrSvg(`${site}/${pro.slug}`), scanText: tr('Scan: my work, reviews and online booking'), bookText: tr('Real photos of my jobs, verified license, honest reviews. Pick a time that suits you.'),
  };
}
