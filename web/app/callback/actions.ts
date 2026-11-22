'use server';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { getPro } from '@/lib/data';
import { requestToPro } from '@/lib/requests';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

type St = { error?: string; ok?: string } | undefined;
const WHEN: Record<string, string> = { today: 'today', tomorrow: 'tomorrow', week: 'this week', weekend: 'on the weekend' };
const PART: Record<string, string> = { morning: 'morning (8–12)', afternoon: 'afternoon (12–5)', evening: 'evening (5–8)', any: 'any time' };

/** "Call me back": the client's number, when it is convenient and a short problem go to the pro's chat. */
export async function requestCallback(_p: St, f: FormData): Promise<St> {
  const slug = String(f.get('pro') ?? '');
  if (!isLive()) return { error: 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.' };
  const me = await getMe(); if (!me) redirect(`/login?next=${encodeURIComponent(`/callback?pro=${slug}`)}`);
  const pro = await getPro(slug);
  if (!pro) return { error: 'Pro not found.' };
  if (pro.isDemo) return { error: 'This is an example profile. It shows how NovaFides works; requests cannot be sent to it.' };
  const phone = String(f.get('phone') ?? '').trim().slice(0, 30);
  if (phone.replace(/\D/g, '').length < 10) return { error: 'Enter a phone number with area code.' };
  const days = f.getAll('when').map(String).filter((x) => x in WHEN).map((x) => WHEN[x]);
  const part = PART[String(f.get('part') ?? 'any')] ?? PART.any;
  const problem = String(f.get('problem') ?? '').trim().slice(0, 600);
  const msg = `📞 Call-back request\nPhone: ${phone}\nWhen: ${days.length ? days.join(', ') : 'any day'}, ${part}${problem ? `\nProblem: ${problem}` : ''}`;
  const conv = await requestToPro(await supabaseServer(), me.id, pro.id, msg, []);
  if (!conv) return { error: 'Could not send. Please try again.' };
  redirect(`/messages/${conv}?sent=callback`);
}

/** A short first message to the pro (the chat opens with it). */
export async function sendFirstMessage(_p: St, f: FormData): Promise<St> {
  const slug = String(f.get('pro') ?? '');
  if (!isLive()) return { error: 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.' };
  const me = await getMe(); if (!me) redirect(`/login?next=${encodeURIComponent(`/callback?pro=${slug}&msg=1`)}`);
  const pro = await getPro(slug);
  if (!pro || pro.isDemo) return { error: 'This is an example profile. It shows how NovaFides works; requests cannot be sent to it.' };
  const text = String(f.get('problem') ?? '').trim().slice(0, 1000);
  if (text.length < 3) return { error: 'Write a few words.' };
  const conv = await requestToPro(await supabaseServer(), me.id, pro.id, text, []);
  if (!conv) return { error: 'Could not send. Please try again.' };
  redirect(`/messages/${conv}`);
}
