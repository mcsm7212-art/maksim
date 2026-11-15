import { SUPABASE_URL } from './supabase/config';
/** Only accept photo URLs from this user's own folder in our storage. */
export const ownPhotoUrl = (url: string, uid: string) =>
  url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/photos/${uid}/`) && !url.includes('..');
