import Link from 'next/link';
import { redirect } from 'next/navigation';
import ActionForm from '@/components/ActionForm';
import PhotoPicker from '@/components/PhotoPicker';
import { getMe } from '@/lib/auth';
import { TRADES, type Trade } from '@/lib/catalog';
import { getT } from '@/lib/i18n';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { createProject } from '../actions';

export const metadata = { title: 'Share a project' };
/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function NewProject({ searchParams }: { searchParams: Promise<{ pro?: string }> }) {
  const tr = await getT(); const sp = await searchParams;
  const me = await getMe();
  if (isLive() && !me) redirect('/login?next=/projects/new');
  if (me?.pro) redirect('/feed');
  // Pros you worked with (finished jobs) or saved.
  let pros: { id: string; name: string; trade: Trade }[] = [];
  if (isLive() && me) {
    const sb = await supabaseServer();
    const [{ data: b }, { data: s }] = await Promise.all([
      sb.from('bookings').select('pro:pros!bookings_pro_id_fkey(id, display_name, trade, is_demo, status)').eq('client_id', me.id).eq('status', 'done'),
      sb.from('pro_saves').select('pro:pros(id, display_name, trade, is_demo, status)').eq('user_id', me.id).eq('status', 'saved'),
    ]);
    const seen = new Map<string, { id: string; name: string; trade: Trade }>();
    for (const r of [...(b ?? []), ...(s ?? [])] as any[]) if (r.pro && !r.pro.is_demo && r.pro.status === 'verified') seen.set(r.pro.id, { id: r.pro.id, name: r.pro.display_name, trade: r.pro.trade });
    pros = [...seen.values()];
  }
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 640 }}>
      <div className="eyebrow">{tr('Your home, your story')}</div><h2>📸 {tr('Share a project')}</h2>
      <p className="mu">{tr('Show finished work in your home and tag the pro who did it. It goes public after the pro confirms it was their job. Do not show faces, house numbers or anything private.')}</p>
      {!pros.length ? <div className="card empty">{tr('First book a pro or save one with ♥, then you can share a project with their work.')} <Link href="/search">{tr('Find a pro')}</Link></div> :
      <ActionForm action={createProject} className="card formcard">
        <label className="f">{tr('Who did the work')}
          <select className="inp" name="pro" defaultValue={pros.some((p) => p.id === sp.pro) ? sp.pro : ''} required>
            <option value="" disabled>{tr('Choose a pro')}…</option>
            {pros.map((p) => <option key={p.id} value={p.id}>{p.name} · {tr(TRADES[p.trade]?.name ?? '')}</option>)}
          </select></label>
        <PhotoPicker name="photo_url" prefix="project" max={6} label={tr('Add photos (before and after if you have them)')} required />
        <label className="f">{tr('A few words (optional)')}<textarea className="inp" name="body" maxLength={1000} placeholder={tr('e.g. New tankless water heater in the garage. Clean work, done in one day.')} /></label>
        <button className="btn">{tr('Send to the pro to confirm')}</button>
      </ActionForm>}
    </div></section>
  );
}
