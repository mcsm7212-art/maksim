import { resolveHandle } from '@/lib/data';
import { qrPng, qrSvg } from '@/lib/qr';
import { siteUrl } from '@/lib/site';

// QR code that opens the pro's short address. ?format=png for social media / phones, SVG (default) for print shops.
export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const slug = await resolveHandle((await params).handle);
  if (!slug) return new Response('Not found', { status: 404 });
  const url = `${await siteUrl()}/${slug}`;
  const png = new URL(req.url).searchParams.get('format') === 'png';
  const name = `novafides-${slug}-qr.${png ? 'png' : 'svg'}`;
  if (png) return new Response(new Uint8Array(await qrPng(url)), { headers: { 'content-type': 'image/png', 'content-disposition': `attachment; filename="${name}"` } });
  return new Response(await qrSvg(url), { headers: { 'content-type': 'image/svg+xml', 'content-disposition': `inline; filename="${name}"` } });
}
