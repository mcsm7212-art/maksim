import { getT } from '@/lib/i18n';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import CompanyForm from '@/app/join/company/CompanyForm';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'Edit company' };
export default async function EditCompany() {
  const tr = await getT();
  if (!isLive()) return <section className="sec pad"><div className="in"><h2>{tr("Edit company")}</h2><p className="mu">{tr("Demo mode.")}</p></div></section>;
  const me = await getMe();
  if (!me) redirect('/login?next=/business/profile');
  const co = me.companies.find((c) => c.role !== 'technician');
  if (!co) redirect('/join/company');
  const { data: c } = await (await supabaseServer()).from('companies').select('*').eq('id', co.id).single();
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/business">{tr("Business")}</Link> {tr("· Company")}</div><h2>{tr("Edit company page")}</h2>
      <CompanyForm initial={{ name: c.name, trade: c.trade, license: c.license_no ?? '', city: c.city ?? '', since: c.since_year, warranty: c.warranty_months ?? 0, about: c.about ?? '', accent: c.accent, base: c.base_theme, logo: c.logo_url }} />
    </div></section>
  );
}
