'use client';
import { useState, useTransition } from 'react';
import { toggleLike } from '@/app/social/actions';
import { useT } from './I18n';

export default function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
  const t = useT();
  const [on, setOn] = useState(liked); const [n, setN] = useState(count);
  const [pending, start] = useTransition();
  return (
    <button type="button" className={`btn sm ${on ? '' : 'ghost'}`} disabled={pending} aria-pressed={on} aria-label={t('Like')}
      onClick={() => start(async () => { const next = !on; setOn(next); setN(n + (next ? 1 : -1)); const r = await toggleLike(postId, next); if (r?.error) { setOn(!next); setN(n); } })}>
      👍 {n > 0 ? n : t('Like')}
    </button>
  );
}
