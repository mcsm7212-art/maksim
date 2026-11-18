/* eslint-disable @next/next/no-img-element */
// Pro photo. A full-height cutout (transparent background) stands in the scene with a rim glow in the pro's colour.
// A normal photo fills the frame. With neither, shows the NovaFides silhouette lit in the pro's accent colour.
export default function Figure({ name, accent, photo, figure, big }: { name: string; accent: string; photo?: string | null; figure?: string | null; big?: boolean }) {
  const src = figure || photo || '/silhouette.webp';
  const fill = !figure && photo;
  return (
    <span className={`fig-sil${big ? ' big' : ''}${figure ? ' cut' : ''}`} style={{ ['--acc' as string]: accent }}>
      <img src={src} alt={figure || photo ? name : `${name}: photo coming soon`} loading={big ? 'eager' : 'lazy'} style={fill ? { objectFit: 'cover', width: '100%', height: '100%', bottom: 0 } : undefined} />
    </span>
  );
}
