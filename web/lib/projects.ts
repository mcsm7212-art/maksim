import { isLive } from './supabase/config';
import { supabaseServer } from './supabase/server';

export type Project = { id: string; clientId: string; author: string; body: string; photos: string[]; status: string; createdAt: string;
  pro: { id: string; slug: string; name: string; trade: string; accent: string } };

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Client projects: confirmed ones are public; the client and the tagged pro also see their pending ones. */
export async function listProjects(o: { proId?: string; clientId?: string; proIds?: string[]; status?: string; limit?: number } = {}): Promise<Project[]> {
  if (!isLive()) return [];
  let q = (await supabaseServer()).from('client_projects').select('id, client_id, author_name, body, photos, status, created_at, pro:pros(id, slug, display_name, trade, accent)')
    .order('created_at', { ascending: false }).limit(o.limit ?? 20);
  if (o.proId) q = q.eq('pro_id', o.proId);
  if (o.clientId) q = q.eq('client_id', o.clientId);
  if (o.proIds) q = q.in('pro_id', o.proIds.length ? o.proIds : ['00000000-0000-0000-0000-000000000000']);
  q = q.eq('status', o.status ?? 'confirmed');
  const { data } = await q;
  return (data ?? []).filter((r: any) => r.pro).map((r: any) => ({ id: r.id, clientId: r.client_id, author: r.author_name, body: r.body, photos: r.photos ?? [], status: r.status, createdAt: r.created_at,
    pro: { id: r.pro.id, slug: r.pro.slug, name: r.pro.display_name, trade: r.pro.trade, accent: r.pro.accent ?? '#B57A50' } }));
}
