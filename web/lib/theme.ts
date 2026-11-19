import 'server-only';
import { cookies } from 'next/headers';

export type Theme = 'dark' | 'light';
/** Site colour theme chosen by the visitor (cookie "theme"); dark is the NovaFides default. */
export async function getTheme(): Promise<Theme> {
  return (await cookies()).get('theme')?.value === 'light' ? 'light' : 'dark';
}
