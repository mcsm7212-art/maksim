import { createClient } from '@supabase/supabase-js';
import { serviceById } from '@/lib/catalog';
import { buildFeed } from '@/lib/ics';
import { isLive, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

// Secret iCal feed of a pro's NovaFides jobs. Calendar apps fetch it without signing in; the token is the key.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = token.replace(/\.ics$/, '');
  if (!isLive() || !/^[a-f0-9]{48}$/.test(t)) return new Response('Not found', { status: 404 });
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('calendar_feed', { token: t });
  if (error) return new Response('Calendar unavailable', { status: 503 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const ics = buildFeed('NovaFides jobs', (data ?? []).map((b: { id: string; starts_at: string; status: string; service_id: string | null; address: string | null; notes: string | null; client_name: string | null }) => ({
    uid: b.id,
    start: new Date(b.starts_at),
    end: new Date(new Date(b.starts_at).getTime() + 2 * 36e5),
    summary: `NovaFides: ${serviceById(b.service_id ?? '')?.name ?? 'Estimate visit'}${b.client_name ? ` · ${b.client_name}` : ''}${b.status === 'requested' ? ' (not confirmed yet)' : ''}`,
    location: b.address ?? undefined,
    description: [b.notes, site && `${site}/account`].filter(Boolean).join('\n'),
    status: b.status === 'requested' ? 'TENTATIVE' as const : 'CONFIRMED' as const,
  })));
  return new Response(ics, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=300', 'content-disposition': 'inline; filename="novafides.ics"' } });
}
