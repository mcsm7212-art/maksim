'use client';
import { supabaseBrowser } from './supabase/client';
import { isLive } from './supabase/config';

/** Shrinks a photo to at most `max` px on the long side and re-encodes it as JPEG (phone photos are 3–8 MB). */
export async function shrink(file: File, max = 1600): Promise<Blob> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error('Could not read photo'))), 'image/jpeg', 0.85));
}

/** Uploads photos straight to Supabase Storage (bucket "photos", folder = user id). Returns public URLs. */
export async function uploadPhotos(files: File[], prefix: string): Promise<string[]> {
  if (!isLive() || !files.length) return [];
  const sb = supabaseBrowser();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Please sign in again.');
  const urls: string[] = [];
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const path = `${user.id}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const { error } = await sb.storage.from('photos').upload(path, await shrink(f), { contentType: 'image/jpeg' });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    urls.push(sb.storage.from('photos').getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

/** Uploads one ready-made image (e.g. a transparent WebP cutout) without re-encoding. Returns its public URL. */
export async function uploadBlob(blob: Blob, prefix: string, ext = 'webp'): Promise<string> {
  const sb = supabaseBrowser();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Please sign in again.');
  const path = `${user.id}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: blob.type || `image/${ext}` });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
