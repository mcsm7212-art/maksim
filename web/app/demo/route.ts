import { NextResponse, type NextRequest } from 'next/server';

// /demo turns on the example profiles for this browser (for showing the site); /demo?off=1 turns them off.
export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL('/', url.origin));
  if (url.searchParams.get('off')) res.cookies.set('nf_demo', '', { path: '/', maxAge: 0 });
  else res.cookies.set('nf_demo', '1', { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
  return res;
}
