/* eslint-disable @next/next/no-img-element */
'use client';
import { useState } from 'react';
import Icon from './Icon';

type Photo = { id: string; url: string; caption: string | null };
// Grid of work photos; tap to open full size. "demo:<trade>" urls draw a sample tile.
export default function WorkPhotos({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<Photo | null>(null);
  return (
    <>
      <div className="works">
        {photos.map((p) => (
          <button key={p.id} type="button" className="work" onClick={() => !p.url.startsWith('demo:') && setOpen(p)}>
            {p.url.startsWith('demo:')
              ? <span className="wph"><Icon name={p.url === 'demo:electrical' ? 'bolt' : p.url === 'demo:handyman' ? 'tool' : 'drop'} size={28} /><small>Sample photo</small></span>
              : <img src={p.url} alt={p.caption ?? 'Work photo'} loading="lazy" />}
            {p.caption && <span>{p.caption}</span>}
          </button>
        ))}
      </div>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="box" style={{ padding: 10 }}>
            <img src={open.url} alt={open.caption ?? 'Work photo'} style={{ width: '100%', borderRadius: 14, display: 'block' }} />
            {open.caption && <p style={{ margin: '10px 6px' }}>{open.caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}
