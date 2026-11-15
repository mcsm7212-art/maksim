'use server';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export type AskState = { error?: string; demo?: boolean } | undefined;
// "Describe your job": one estimate request to each chosen pro (max 3). Never broadcast.
export async function askEstimate(_p: AskState, f: FormData): Promise<AskState> {
  const text = String(f.get('text') ?? '').trim().slice(0, 2000);
  const address = String(f.get('address') ?? '').trim().slice(0, 200);
  const pros = f.getAll('pro').map(String).slice(0, 3);
  if (text.length < 10) return { error: 'Describe the job in a few words.' };
  if (!address) return { error: 'Enter the job address.' };
  if (!pros.length) return { error: 'Choose 1 to 3 pros.' };
  if (!isLive()) return { demo: true };
  const me = await getMe();
  if (!me) redirect('/login?next=/ask');
  const sb = await supabaseServer();
  const { data: ids } = await sb.from('pros').select('id').in('slug', pros);
  for (const p of ids ?? []) {
    await sb.from('bookings').insert({ client_id: me.id, pro_id: p.id, chosen_by: 'client', status: 'requested', day_pref: 'week', address, notes: `Estimate request: ${text}` });
  }
  redirect('/account?booked=ask');
}
