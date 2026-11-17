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
      {sp.error === 'link' && <div className="note" style={{ marginBottom: 14 }}>{tr('That sign-in link did not work. Open the link on the same phone or computer, in the same browser, where you asked for it. Or ask for a new email below.')}</div>}
      <LoginForm next={next} live={isLive()} />
    </div></section>
  );
}
