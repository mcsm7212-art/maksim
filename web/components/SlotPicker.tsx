'use client';
import { useState } from 'react';
import { useT } from './I18n';

export type DayView = { key: string; top: string; date: string; state: 'free' | 'part' | 'full' | 'off'; slots: { iso: string; label: string }[] };
const HINT = { free: 'Free day', part: 'Partly booked', full: 'Fully booked', off: 'Day off' } as const;

/** Booking calendar: first the day (green = free, yellow = partly booked, red = full, dim = day off), then the time. */
export default function SlotPicker({ days, picked }: { days: DayView[]; picked?: string }) {
  const t = useT();
  const first = days.find((d) => d.slots.some((s) => s.iso === picked)) ?? null;
  const [day, setDay] = useState<string | null>(first?.key ?? null);
  const cur = days.find((d) => d.key === day);
  const any = days.some((d) => d.slots.length);
  return (
    <div className="daypick">
      <div className="days" role="group" aria-label={t('Choose a day')}>
        {days.map((d) => (
          <button type="button" key={d.key} className={`day ${d.state}`} aria-pressed={d.key === day} disabled={d.state === 'off' || d.state === 'full'}
            title={t(HINT[d.state])} onClick={() => setDay(d.key)}>
            <span className="day-top">{d.top}</span><b>{d.date}</b><i aria-hidden />
          </button>))}
      </div>
      <div className="day-legend mu xs"><span className="free"><i />{t('Free day')}</span><span className="part"><i />{t('Partly booked')}</span><span className="full"><i />{t('Fully booked')}</span><span className="off"><i />{t('Day off')}</span></div>
      {cur
        ? <div className="tbtn" key={cur.key}>
            {cur.slots.map((s) => <label key={s.iso}><input type="radio" name="t" value={s.iso} defaultChecked={s.iso === picked} required />{s.label}</label>)}
          </div>
        : <span className="mu sm">{any ? `☝ ${t('Choose a day to see the open times.')}` : t('No open times. Send an estimate request instead.')}</span>}
      {/* keeps the form from being sent without a time */}
      {!cur && any && <input className="ghost-req" tabIndex={-1} aria-hidden required name="t" defaultValue="" onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(t('Please pick a time.'))} />}
    </div>
  );
}
