/* eslint-disable @next/next/no-img-element */
/** 3D copper icon from the NovaFides icon kit (public/icons/3d). Decorative: the text next to it says what it is. */
export type Ic3dName = 'plumbing' | 'electrical' | 'handyman' | 'construction' | 'emergency' | 'photo-search' | 'verified' | 'reviews' | 'chat' | 'calendar' | 'company' | 'location';
export default function Ic3d({ name, size = 40, className = '' }: { name: Ic3dName; size?: number; className?: string }) {
  return <img src={`/icons/3d/${name}.webp`} alt="" aria-hidden width={size} height={size} loading="lazy" className={`ic3d-i ${className}`} style={{ width: size, height: size }} />;
}
