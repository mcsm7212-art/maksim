'use client';
import { useState } from 'react';
import Icon from './Icon';

export interface SkillRow { key: string; name: string; icon: string; score: number; desc: string; sample: string }
export default function SkillPassport({ rows }: { rows: SkillRow[] }) {
  const [open, setOpen] = useState<string | null>(rows[0]?.key ?? null);
  return (
    <div className="sk3">
      {rows.map((r) => (
        <button key={r.key} type="button" aria-expanded={open === r.key} onClick={() => setOpen(open === r.key ? null : r.key)}>
          <span className="r1"><span className="ic"><Icon name={r.icon} size={22} /></span><b>{r.name}</b><span className="num">{r.score.toFixed(1)}</span><small>/5</small></span>
          <span className="dash"><i style={{ width: `${(r.score / 5) * 100}%` }} /></span>
          {open === r.key && <><span className="desc" style={{ display: 'block' }}>{r.desc}</span><span className="sample" style={{ display: 'block' }}>{r.sample}</span></>}
        </button>
      ))}
    </div>
  );
}
