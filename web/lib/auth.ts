import 'server-only';
import { cache } from 'react';
import { isLive } from './supabase/config';
import { supabaseServer } from './supabase/server';

export interface Me {
  id: string; email: string | null; role: 'client' | 'pro' | 'company' | 'admin'; name: string;
  pro: { id: string; slug: string; status: string; company_id: string | null } | null;
  companies: { id: string; slug: string; name: string; role: 'owner' | 'manager' | 'technician'; status: string }[];
}

export const getMe = cache(async (): Promise<Me | null> => {
  if (!isLive()) return null;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: pro }, { data: members }] = await Promise.all([
    sb.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle(),
    sb.from('pros').select('id, slug, status, company_id').eq('id', user.id).maybeSingle(),
    sb.from('company_members').select('role, company:companies(id, slug, name, status)').eq('profile_id', user.id),
  ]);
  return {
    id: user.id, email: user.email ?? null, role: (profile?.role ?? 'client') as Me['role'], name: profile?.full_name ?? '',
    pro: pro ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    companies: (members ?? []).filter((m: any) => m.company).map((m: any) => ({ ...m.company, role: m.role })),
  };
});
