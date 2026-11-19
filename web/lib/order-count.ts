import 'server-only';
import { cache } from 'react';
import { orderPhrase } from './orders';
import { isLive } from './supabase/config';
import { supabaseServer } from './supabase/server';

/** Number of orders waiting for this person's action (shown on the Orders tab). */
export const actionCount = cache(async (uid: string): Promise<number> => {
  if (!isLive()) return 0;
  const { data } = await (await supabaseServer()).from('bookings').select('client_id, status, client_confirmed_at').in('status', ['needs_time', 'requested', 'done']).limit(200);
  return (data ?? []).filter((b) => orderPhrase(b, b.client_id === uid ? 'client' : 'pro').tone === 'act').length;
});
