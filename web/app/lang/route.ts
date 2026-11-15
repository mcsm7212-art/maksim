import { NextResponse, type NextRequest } from 'next/server';
import { isLang } from '@/lib/i18n-core';

// Language switcher: /lang?to=es → sets the cookie and returns to the page the visitor was on.
export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const to = url.searchParams.get('to');
  const back = url.searchParams.get('back') ?? '/';
  const res = NextResponse.redirect(new URL(back.startsWith('/') && !back.startsWith('//') ? back : '/', url.origin));
  if (isLang(to)) res.cookies.set('lang', to, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return res;
}
