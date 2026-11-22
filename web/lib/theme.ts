import 'server-only';
import { cookies } from 'next/headers';

export type Theme = 'dark' | 'light';
export type ThemeChoice = Theme | 'system';
/**
 * Site colour theme. The visitor picks light, dark or system (cookie "theme"). For "system" the browser
 * stores what the device currently uses in cookie "theme_sys" (set by a tiny script before the page paints).
 * Dark is the NovaFides default.
 */
export async function getTheme(): Promise<Theme> {
  const c = await cookies(); const v = c.get('theme')?.value;
  if (v === 'system') return c.get('theme_sys')?.value === 'light' ? 'light' : 'dark';
  return v === 'light' ? 'light' : 'dark';
}
export async function getThemeChoice(): Promise<ThemeChoice> {
  const v = (await cookies()).get('theme')?.value;
  return v === 'light' || v === 'system' ? v : 'dark';
}
