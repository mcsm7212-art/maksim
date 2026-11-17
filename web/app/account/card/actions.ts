'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export type HandleState = { error?: string; ok?: string } | undefined;

export async function saveHandle(_p: HandleState, f: FormData): Promise<HandleState> {
  const me = await getMe(); if (!me?.pro) redirect('/account');
  const sb = await supabaseServer();
  const { error } = await sb.rpc('set_handle', { new_handle: String(f.get('handle') ?? '') });
  if (error) {
    const m = error.message;
    return { error: m.includes('reserved') ? 'This address is reserved by the site.' : m.includes('taken') ? 'This address is already taken.' : 'Use 3–30 Latin letters, digits or dashes.' };
  }
  revalidatePath('/account/card');
  return { ok: 'Saved. Your old address keeps working.' };
}

export async function saveCardPhone(f: FormData) {
  const me = await getMe(); if (!me?.pro) redirect('/account');
  const sb = await supabaseServer();
  const phone = String(f.get('phone') ?? '').replace(/[^\d+()\-. ]/g, '').slice(0, 30) || null;
  await sb.from('pro_private').upsert({ pro_id: me.id, card_phone: phone }, { onConflict: 'pro_id' });
  revalidatePath('/account/card');
}
