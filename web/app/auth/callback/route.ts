import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { LEGAL_VERSION } from '@/lib/legal-short';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const n = url.searchParams.get('next') ?? '/account';
  const next = n.startsWith('/') && !n.startsWith('//') ? n : '/account';
  const sb = await supabaseServer();
  if (code) {
    // Link from the sign-in email (opened in the same browser that asked for it)
    const { error } = await sb.auth.exchangeCodeForSession(code);
    // the link is only sent after the Terms checkbox was ticked on the sign-in form
    if (!error) await sb.rpc('accept_terms', { v: LEGAL_VERSION });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && (type === 'magiclink' || type === 'email' || type === 'signup')) {
    // One-time link that works on any device (custom email template or a link made by the admin)
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) await sb.rpc('accept_terms', { v: LEGAL_VERSION });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=link', url.origin));
}
