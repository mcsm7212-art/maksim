import type { MetadataRoute } from 'next';
import { PRIVATE, SITE } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE }], sitemap: `${SITE}/sitemap.xml`, host: SITE };
}
