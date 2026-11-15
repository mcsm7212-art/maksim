import { getT } from '@/lib/i18n';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import CompanyForm from './CompanyForm';

export const metadata = { title: 'Register company' };
export default async function JoinCompany() {
  const tr = await getT();
  if (isLive()) {
    const me = await getMe();
    if (!me) redirect('/login?next=/join/company');
    if (me.companies.length) redirect('/business');
  }
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">{tr("Company")}</div><h2>{tr("Register your company")}</h2>
      <CompanyForm />
    </div></section>
  );
}
