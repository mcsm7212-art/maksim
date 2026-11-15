import { getT } from '@/lib/i18n';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import ProForm from './ProForm';

export const metadata = { title: 'Create pro profile' };
export default async function JoinPro({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const tr = await getT();
  const { invite } = await searchParams;
  let companyName: string | undefined;
  if (isLive()) {
    const me = await getMe();
    if (!me) redirect(`/login?next=${encodeURIComponent(`/join/pro${invite ? `?invite=${invite}` : ''}`)}`);
    if (me.pro) redirect('/account');
    if (invite) {
      const { data } = await (await supabaseServer()).rpc('invite_info', { invite_code: invite });
      companyName = data?.[0]?.company_name;
    }
  }
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">{invite ? 'Technician' : 'Independent pro'}</div><h2>{tr("Create your pro profile")}</h2>
      <ProForm invite={invite} companyName={companyName} />
    </div></section>
  );
}
