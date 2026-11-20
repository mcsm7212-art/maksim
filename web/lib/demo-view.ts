import { cookies } from 'next/headers';
import { getMe } from './auth';

/** Demo profiles are shown only to the admin and to people who opened the demo link (/demo), never to ordinary visitors. */
export async function showDemo(): Promise<boolean> {
  if ((await cookies()).get('nf_demo')?.value === '1') return true;
  const me = await getMe();
  return me?.role === 'admin';
}
