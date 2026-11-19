import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A client's request to one chosen pro, before any price is agreed: it opens (or reuses) the chat with that pro
 * and posts the job, area and photos there, so the pro can answer or send a quote right away.
 * `ref` = the pro's work example the client started from ("I have the same problem").
 */
export async function requestToPro(sb: SupabaseClient, clientId: string, proId: string, msg: string, photos: string[], ref?: { post?: string | null; photo?: string | null }): Promise<string | null> {
  let { data: conv } = await sb.from('conversations').select('id').eq('client_id', clientId).eq('pro_id', proId).is('company_id', null).is('peer_id', null).maybeSingle();
  if (!conv) ({ data: conv } = await sb.from('conversations').insert({ client_id: clientId, pro_id: proId }).select('id').single());
  if (!conv) return null;
  const rows = [{ conversation_id: conv.id, sender_id: clientId, body: msg, photo_url: null as string | null },
    ...photos.slice(0, 6).map((u) => ({ conversation_id: conv!.id, sender_id: clientId, body: '', photo_url: u }))];
  const { error } = await sb.from('messages').insert(rows);
  if (error) return null;
  if (ref?.post || ref?.photo) await sb.from('work_requests').insert({ client_id: clientId, pro_id: proId, post_id: ref.post ?? null, photo_id: ref.photo ?? null, conversation_id: conv.id });
  return conv.id;
}
