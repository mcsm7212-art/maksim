import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

async function accept(form: FormData) {
  'use server';
  const sb = await supabaseServer();
  const { error } = await sb.rpc('accept_invite', { invite_code: String(form.get('code')) });
  redirect(error ? `/invite/${form.get('code')}?error=1` : '/account?joined=team');
}

export default async function Invite({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const { code } = await params; const { error } = await searchParams;
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>Team invite</h2><p className="mu">Demo mode.</p></div></section>;
  const me = await getMe();
  if (!me) redirect(`/login?next=/invite/${code}`);
  if (!me.pro) redirect(`/join/pro?invite=${code}`);
  const { data } = await (await supabaseServer()).rpc('invite_info', { invite_code: code });
  const info = data?.[0];
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 520 }}>
      <div className="eyebrow">Team invite</div>
      {info?.valid ? <>
        <h2>Join {info.company_name}</h2>
        <p className="mu">Your reviews and job counts stay yours. The company sees and assigns your jobs.</p>
        <form action={accept}><input type="hidden" name="code" value={code} /><button className="btn">Join the team</button></form>
      </> : <><h2>This invite is not valid</h2><p className="mu">It was used or expired. Ask the office for a new link. <Link href="/account">My account</Link></p></>}
      {error && <p className="err">Could not join. Ask the office for a new link.</p>}
    </div></section>
  );
}
