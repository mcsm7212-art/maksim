'use server';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { CITIES } from '@/lib/areas';
import { getLang } from '@/lib/i18n';
import { makeT } from '@/lib/i18n-core';
import { ownPhotoUrl } from '@/lib/photos';
import { requestToPro } from '@/lib/requests';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export type AskState = { error?: string; demo?: boolean } | undefined;
// "Compare offers": the same request to each pro the client chose by name (max 3), each in its own chat. Never broadcast.
export async function askEstimate(_p: AskState, f: FormData): Promise<AskState> {
  const text = String(f.get('text') ?? '').trim().slice(0, 2000);
  const city = CITIES.some((c) => c.name === String(f.get('city'))) ? String(f.get('city')) : '';
  const zip = /^\d{5}$/.test(String(f.get('zip') ?? '').trim()) ? String(f.get('zip')).trim() : '';
  const pros = f.getAll('pro').map(String).slice(0, 3);
  if (text.length < 10) return { error: 'Describe the job in a few words.' };
  if (!city && !zip) return { error: 'Choose your city or enter a ZIP code.' };
  if (!pros.length) return { error: 'Choose 1 to 3 pros.' };
  if (!isLive()) return { demo: true };
  const me = await getMe();
  if (!me) redirect('/login?next=/ask');
  const sb = await supabaseServer(); const tr = makeT(await getLang());
  const photos = f.getAll('photo_url').map(String).filter((u) => ownPhotoUrl(u, me.id)).slice(0, 6);
  const { data: ids } = await sb.from('pros').select('id').in('slug', pros).eq('is_demo', false);
  let sent = 0; const n = (ids ?? []).length;
  // Each pro sees how many pros got the same request: nobody bids blind.
  const many = n > 1 ? `\n👥 ${tr('The client sent this request to {n} pros', { n })}` : '';
  for (const p of ids ?? []) if (await requestToPro(sb, me.id, p.id, `📋 ${tr('Estimate request')}\n${tr('Area')}: ${[city, zip].filter(Boolean).join(' ')}\n${text}${many}`, photos)) sent++;
  if (!sent) return { error: 'Could not send. Please try again.' };
  redirect('/messages?sent=ask');
}
