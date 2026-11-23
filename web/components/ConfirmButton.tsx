'use client';
import type { ReactNode } from 'react';

/** A submit button that asks "Are you sure?" first (only when `ask` is set). */
export default function ConfirmButton({ ask, className, style, children }: { ask?: string | null; className?: string; style?: React.CSSProperties; children: ReactNode }) {
  return <button className={className} style={style} onClick={(e) => { if (ask && !window.confirm(ask)) e.preventDefault(); }}>{children}</button>;
}
