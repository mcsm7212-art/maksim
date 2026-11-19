'use client';
import { useState, useTransition } from 'react';
import { toggleHelpful } from '@/app/social/actions';
import { useT } from './I18n';

/** "Helpful" on a review: one vote per reader; the author and the reviewed pro cannot vote. */
export default function HelpfulButton({ reviewId, count, voted, back, disabled }: { reviewId: string; count: number; voted: boolean; back: string; disabled?: boolean }) {
  const t = useT();
  const [on, setOn] = useState(voted); const [n, setN] = useState(count);
  const [pending, start] = useTransition();
  if (disabled) return n > 0 ? <span className="mu xs">👍 {t('{n} found this helpful', { n })}</span> : null;
  return (
    <button type="button" className={`btn sm ${on ? '' : 'ghost'} helpful`} disabled={pending} aria-pressed={on}
      onClick={() => start(async () => { const next = !on; setOn(next); setN(n + (next ? 1 : -1)); const r = await toggleHelpful(reviewId, next, back); if (r?.error) { setOn(!next); setN(n); } })}>
      👍 {t('Helpful')}{n > 0 ? ` · ${n}` : ''}
    </button>
  );
}
