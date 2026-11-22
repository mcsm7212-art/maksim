import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import LoginForm from './LoginForm';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'Sign in' };
const safeNext = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/account');

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getMe()) redirect(next);
  const tr = await getT();
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 480 }}>
      <div className="eyebrow">{tr('Clients, pros and companies')}</div><h2>{tr('Sign in or create an account')}</h2>
      {/* Where the person is going decides the hint: pro sign-up, company sign-up, a team invite, or a client. */}
      <div className="note" style={{ marginBottom: 14 }}>
        {next.startsWith('/join/pro') ? <><b>{tr('Pro sign-up · step 1 of 2')}</b><br />{tr('Enter your email and the code we send. Next you fill in your profile: photo, trade, license, services, prices and hours.')}</>
          : next.startsWith('/join/company') ? <><b>{tr('Company sign-up · step 1 of 2')}</b><br />{tr('Enter your email and the code we send. Next you add the company: name, license, colors. Then you invite your technicians.')}</>
          : next.startsWith('/invite/') ? <><b>{tr('Team invite · step 1 of 2')}</b><br />{tr('Enter your email and the code we send. Next you check the profile your office prepared and join the team.')}</>
          : <><b>{tr('Clients: no separate sign-up')}</b><br />{tr('Enter your email and the 6-digit code from the email. That is it: your account is created. No password.')} <Link href="/join">{tr('Are you a pro or a company?')}</Link></>}
      </div>
      {sp.error === 'link' && <div className="note" style={{ marginBottom: 14 }}>{tr('That sign-in link did not work. Open the link on the same phone or computer, in the same browser, where you asked for it. Or ask for a new email below.')}</div>}
      <LoginForm next={next} live={isLive()} />
    </div></section>
  );
}
