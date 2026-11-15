/* eslint-disable @next/next/no-img-element */
// Pro photo. Until a real photo is uploaded, shows the NovaFides silhouette lit in the pro's accent color.
export default function Figure({ name, accent, photo, big }: { name: string; accent: string; photo?: string | null; big?: boolean }) {
  return (
    <span className={`fig-sil${big ? ' big' : ''}`} style={{ ['--acc' as string]: accent }}>
      <img src={photo || '/silhouette.webp'} alt={photo ? name : `${name}: photo coming soon`} loading="lazy" style={photo ? { objectFit: 'cover', width: '100%', height: '100%', bottom: 0 } : undefined} />
    </span>
  );
}
