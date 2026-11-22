'use client';
import { useEffect, type RefObject } from 'react';

/**
 * Opens a <details> menu when the mouse rests on it and closes it a moment after the mouse leaves.
 * Small delays stop accidental opening while the mouse passes by, and keep the menu open when the mouse
 * slips off for a split second on the way to an item. Only for a real mouse: touch screens keep tap to open.
 */
export function useHoverIntent(ref: RefObject<HTMLDetailsElement | null>, openDelay = 140, closeDelay = 420) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let t: ReturnType<typeof setTimeout> | undefined; let byHover = false;
    const enter = () => { clearTimeout(t); if (!el.open) t = setTimeout(() => { el.open = true; byHover = true; }, openDelay); };
    const leave = () => { clearTimeout(t); t = setTimeout(() => { if (byHover) el.open = false; byHover = false; }, closeDelay); };
    // A click on the button while the hover already opened it keeps it open (instead of closing it again).
    const sum = el.querySelector('summary');
    const click = (e: Event) => { if (byHover && el.open) { e.preventDefault(); byHover = false; } };
    el.addEventListener('pointerenter', enter); el.addEventListener('pointerleave', leave); sum?.addEventListener('click', click);
    return () => { clearTimeout(t); el.removeEventListener('pointerenter', enter); el.removeEventListener('pointerleave', leave); sum?.removeEventListener('click', click); };
  }, [ref, openDelay, closeDelay]);
}
