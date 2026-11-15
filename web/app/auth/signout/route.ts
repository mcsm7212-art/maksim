import { NextResponse, type NextRequest } from 'next/server';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  if (isLive()) await (await supabaseServer()).auth.signOut();
  return NextResponse.redirect(new URL('/', req.url), { status: 303 });
}
