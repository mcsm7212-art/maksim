'use server';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { normalizeIcsUrl, syncBusy } from '@/lib/calendar-sync';
import { supabaseServer } from '@/lib/supabase/server';

async function pro() { const me = await getMe(); if (!me?.pro) redirect('/account'); return me; }

export async function makeFeedLink() {
  const me = await pro(); const sb = await supabaseServer();
  await sb.from('pro_private').upsert({ pro_id: me.id, calendar_token: randomBytes(24).toString('hex') }, { onConflict: 'pro_id' });
  revalidatePath('/account/calendar');
}
export async function saveBusyLink(f: FormData) {
  const me = await pro(); const sb = await supabaseServer();
  const raw = String(f.get('url') ?? '');
  if (!raw.trim()) {
    await sb.from('pro_private').upsert({ pro_id: me.id, busy_ics_url: null, busy_sync_error: null }, { onConflict: 'pro_id' });
    await sb.from('pro_busy').delete().eq('pro_id', me.id);
    revalidatePath('/account/calendar'); return;
  }
  const url = normalizeIcsUrl(raw);
  if (!url) {
    await sb.from('pro_private').upsert({ pro_id: me.id, busy_sync_error: 'Use the secret iCal address from Google, Apple iCloud or Outlook calendar.' }, { onConflict: 'pro_id' });
    revalidatePath('/account/calendar'); return;
  }
  await sb.from('pro_private').upsert({ pro_id: me.id, busy_ics_url: url }, { onConflict: 'pro_id' });
  await syncBusy(me.id, url);
  revalidatePath('/account/calendar');
}
export async function syncNow() {
  const me = await pro(); const sb = await supabaseServer();
  const { data } = await sb.from('pro_private').select('busy_ics_url').eq('pro_id', me.id).maybeSingle();
  if (data?.busy_ics_url) await syncBusy(me.id, data.busy_ics_url);
  revalidatePath('/account/calendar');
}
