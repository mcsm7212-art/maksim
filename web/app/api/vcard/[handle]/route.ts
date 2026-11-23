import { TRADES, tradeLabel } from '@/lib/catalog';
import { getPro, resolveHandle } from '@/lib/data';
import { siteUrl } from '@/lib/site';

// "Save to contacts": a vCard with the pro's name, trade and NovaFides page (no private phone number).
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const slug = await resolveHandle((await params).handle);
  const pro = slug ? await getPro(slug) : null;
  if (!pro) return new Response('Not found', { status: 404 });
  const url = `${await siteUrl()}/${pro.slug}`;
  const [first, ...rest] = pro.name.split(' ');
  const title = `${tradeLabel(pro)}${pro.license ? ` · CSLB #${pro.license}` : ''}`;
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${esc(rest.join(' '))};${esc(first)};;;`, `FN:${esc(pro.name)}`, `ORG:${esc(pro.company?.name ?? 'NovaFides Marketplace')}`,
    `TITLE:${esc(title)}`, `URL:${url}`, `NOTE:${esc(`Book online, see work photos and reviews: ${url}`)}`];
  if (pro.photoUrl && pro.photoUrl.startsWith('https://')) lines.push(`PHOTO;VALUE=URI:${pro.photoUrl}`);
  if (pro.area) lines.push(`ADR;TYPE=WORK:;;;${esc(pro.area)};CA;;USA`);
  lines.push('END:VCARD');
  return new Response(lines.join('\r\n') + '\r\n', { headers: { 'content-type': 'text/vcard; charset=utf-8', 'content-disposition': `attachment; filename="${pro.slug}.vcf"` } });
}
