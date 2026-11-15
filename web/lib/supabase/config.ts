export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
/** Without keys the site runs in demo mode with sample pros and no sign-up. */
export const isLive = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
