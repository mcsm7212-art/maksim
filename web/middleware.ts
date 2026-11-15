import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isLive, SUPABASE_ANON_KEY, SUPABASE_URL } from './lib/supabase/config';

// Keeps the login session fresh on every request.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isLive()) return response;
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|webp|svg|jpg)$).*)'] };
