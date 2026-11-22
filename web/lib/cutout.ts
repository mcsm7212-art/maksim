'use client';
// Cuts a person out of a phone photo right in the browser (the photo never leaves the device for this step)
// and picks a glow colour from their clothes. Uses Google MediaPipe's multiclass selfie segmenter (Apache 2.0):
// classes 0 background, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 accessories.
import type { ImageSegmenter } from '@mediapipe/tasks-vision';

const WASM = '/mediapipe'; // copied from node_modules at build time (scripts/copy-mediapipe.mjs)
const MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';

let seg: Promise<ImageSegmenter> | null = null;
function segmenter() {
  seg ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
    const files = await FilesetResolver.forVisionTasks(WASM);
    const opts = (delegate: 'GPU' | 'CPU') => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'IMAGE' as const, outputConfidenceMasks: true, outputCategoryMask: false });
    try { return await ImageSegmenter.createFromOptions(files, opts('GPU')); } catch { return ImageSegmenter.createFromOptions(files, opts('CPU')); }
  })();
  seg.catch(() => { seg = null; });
  return seg;
}

export type Cutout = { blob: Blob; preview: string; accent: string; personShare: number };

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Returns a transparent-background WebP of the person (trimmed), plus a glow colour from their clothes. */
export async function cutOut(file: File, maxH = 1400): Promise<Cutout> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxH / bmp.height, 1600 / bmp.width);
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const src = document.createElement('canvas'); src.width = w; src.height = h;
  const sx = src.getContext('2d', { willReadFrequently: true })!; sx.drawImage(bmp, 0, 0, w, h);

  const s = await segmenter();
  const res = s.segment(src);
  const masks = res.confidenceMasks ?? [];
  if (masks.length < 5) throw new Error('Could not find a person in this photo.');
  const mw = masks[0].width, mh = masks[0].height;
  const bg = masks[0].getAsFloat32Array(), clothes = masks[4].getAsFloat32Array();

  const img = sx.getImageData(0, 0, w, h); const px = img.data;
  let minX = w, minY = h, maxX = 0, maxY = 0, n = 0;
  const bins = new Map<number, [number, number, number, number]>();
  for (let y = 0; y < h; y++) {
    const my = Math.min(mh - 1, Math.floor((y * mh) / h));
    for (let x = 0; x < w; x++) {
      const mi = my * mw + Math.min(mw - 1, Math.floor((x * mw) / w));
      const a = smooth(0.3, 0.7, 1 - bg[mi]);
      const i = (y * w + x) * 4; px[i + 3] = Math.round(a * 255);
      if (a > 0.5) { n++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      if (clothes[mi] > 0.6 && a > 0.6 && (x + y) % 3 === 0) {
        const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        if (mx < 0.12 || d / mx < 0.28) continue; // greys, blacks and whites don't decide the colour
        let hue = 0; if (d > 0) hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        const key = Math.floor((((hue * 60) + 360) % 360) / 15); const sat = d / mx; const wgt = sat * sat * mx;
        const cur = bins.get(key) ?? [0, 0, 0, 0]; cur[0] += wgt; cur[1] += px[i] * wgt; cur[2] += px[i + 1] * wgt; cur[3] += px[i + 2] * wgt; bins.set(key, cur);
      }
    }
  }
  masks.forEach((m) => m.close());
  const personShare = n / (w * h);
  if (personShare < 0.02) throw new Error('Could not find a person in this photo.');
  sx.putImageData(img, 0, 0);

  const pad = Math.round(h * 0.015);
  const cx = Math.max(0, minX - pad), cy = Math.max(0, minY - pad), cw = Math.min(w, maxX + pad) - cx, ch = Math.min(h, maxY + pad) - cy;
  const out = document.createElement('canvas'); out.width = cw; out.height = ch;
  out.getContext('2d')!.drawImage(src, cx, cy, cw, ch, 0, 0, cw, ch);
  const blob = await new Promise<Blob>((ok, bad) => out.toBlob((b) => (b ? ok(b) : bad(new Error('Could not save the photo.'))), 'image/webp', 0.9));
  return { blob, preview: URL.createObjectURL(blob), accent: glowFrom(bins), personShare };
}

/** Strongest clothing hue, made bright enough to glow on a dark page. Neutral clothes → NovaFides copper. */
function glowFrom(bins: Map<number, [number, number, number, number]>): string {
  let best: [number, number, number, number] | null = null;
  for (const v of bins.values()) if (!best || v[0] > best[0]) best = v;
  if (!best || best[0] < 25) return '#C08A62';
  let [r, g, b] = [best[1] / best[0], best[2] / best[0], best[3] / best[0]].map((x) => x / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hue = 0; if (d > 0) hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hue = ((hue * 60) + 360) % 360;
  const sat = Math.min(1, Math.max(0.45, (d / mx) * 1.5)), val = Math.max(0.78, mx);
  const c = val * sat, x = c * (1 - Math.abs(((hue / 60) % 2) - 1)), m = val - c;
  [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Mirror an image left↔right (keeps transparency). Works with our uploaded photos and local previews. */
export async function flipImage(src: string): Promise<Blob> {
  const img = new Image(); img.crossOrigin = 'anonymous';
  await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('Could not open the photo.')); img.src = src; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d')!; x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(img, 0, 0);
  const type = /\.jpe?g($|\?)/i.test(src) ? 'image/jpeg' : 'image/webp';
  return new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error('Could not save the photo.'))), type, 0.9));
}
