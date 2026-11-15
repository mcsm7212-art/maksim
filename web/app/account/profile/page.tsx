import { getT } from '@/lib/i18n';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ProForm, { type ProInitial } from '@/app/join/pro/ProForm';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'Edit profile' };
export default async function EditProfile() {
  const tr = await getT();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr("Edit profile")}</h2><p className="mu">{tr("Demo mode.")}</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/account/profile');
  if (!me.pro) redirect('/join/pro');
  const sb = await supabaseServer();
  const [{ data: p }, { data: svcs }, { data: hours }] = await Promise.all([
    sb.from('pros').select('*').eq('id', me.id).single(),
    sb.from('pro_services').select('service_id, price, active').eq('pro_id', me.id),
    sb.from('availability_rules').select('weekday, start_time, end_time').eq('pro_id', me.id),
  ]);
  const initial: ProInitial = {
    name: p.display_name, trade: p.trade, years: p.years_exp ?? 0, area: p.area ?? '', languages: (p.languages ?? []).join(', '),
    bio: p.bio ?? '', experience: p.experience ?? '', skills: (p.skills ?? []).join(', '), insured: p.insured, uniform: p.uniform_color,
    photo: p.photo_url, tiers: p.tiers,
    services: Object.fromEntries((svcs ?? []).filter((x) => x.active).map((x) => [x.service_id, x.price != null ? Number(x.price) : null])),
    days: (hours ?? []).map((h) => h.weekday), start: hours?.[0]?.start_time?.slice(0, 5) ?? '08:00', end: hours?.[0]?.end_time?.slice(0, 5) ?? '18:00',
  };
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/account">{tr("My account")}</Link> {tr("· Profile")}</div><h2>{tr("Edit your profile")}</h2>
      <p className="mu sm">{tr("Work photos are on the")} <Link href="/account">{tr("account page")}</Link>. <Link href={`/pro/${p.slug}`}>{tr("View my public page")}</Link></p>
      <ProForm initial={initial} />
    </div></section>
  );
}
