'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { setSave } from '@/app/social/actions';
import { useT } from './I18n';

/** ♥ Save a pro to "My pros" (also follows their posts). Small menu lets the user hide the pro instead. */
export default function SaveButton({ proId, initial, count, compact }: { proId: string; initial: 'saved' | 'hidden' | null; count: number; compact?: boolean }) {
  const t = useT(); const path = usePathname(); const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [n, setN] = useState(count);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const apply = (next: 'saved' | 'hidden' | '') => start(async () => {
    const prev = status;
    setStatus(next || null); setN(n + (next === 'saved' ? 1 : 0) - (prev === 'saved' ? 1 : 0));
    const r = await setSave(proId, next, path);
    if (r?.error) { setStatus(prev); setN(n); setMsg(t(r.error)); } else router.refresh();
  });
  if (status === 'hidden') return (
    <span className="chips"><span className="mu sm">{t('Hidden from your search')}</span>
      <button type="button" className="btn ghost sm" disabled={pending} onClick={() => apply('')}>{t('Show again')}</button></span>
  );
  return (
    <span className="chips" style={{ alignItems: 'center' }}>
      <button type="button" className={`btn sm ${status === 'saved' ? '' : 'ghost'}`} disabled={pending} aria-pressed={status === 'saved'} onClick={() => apply(status === 'saved' ? '' : 'saved')}>
        {status === 'saved' ? '♥' : '♡'} {t(status === 'saved' ? 'Following' : 'Save & follow')}{n > 0 && !compact ? ` · ${n}` : ''}
      </button>
      {!compact && status !== 'saved' && <button type="button" className="btn ghost sm" disabled={pending} onClick={() => apply('hidden')} title={t('Do not show this pro in my search')}>{t('Hide')}</button>}
      {msg && <span className="err xs">{msg}</span>}
    </span>
  );
}
