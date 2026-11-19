'use client';
import { useState } from 'react';
import { useT } from './I18n';

/** Share a pro with a neighbor: the phone's share sheet, or copy the link. */
export default function ShareLink({ url, title }: { url: string; title: string }) {
  const t = useT(); const [done, setDone] = useState(false);
  const share = async () => {
    const full = new URL(url, location.origin).toString();
    try { if (navigator.share) await navigator.share({ title, url: full }); else { await navigator.clipboard.writeText(full); setDone(true); } } catch { /* cancelled */ }
  };
  return <button type="button" className="btn ghost sm" onClick={share}>{done ? `✓ ${t('Link copied')}` : `↗ ${t('Share this pro')}`}</button>;
}
