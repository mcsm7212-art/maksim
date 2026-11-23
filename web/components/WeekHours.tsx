'use client';
import { useState } from 'react';
import { useT } from './I18n';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // the week starts on Monday
type Day = { on: boolean; start: string; end: string };

/** Working hours for each day of the week: a day can be off, or have its own hours (e.g. Thursday afternoon only). */
export default function WeekHours({ initial }: { initial?: Record<number, { start: string; end: string }> | null }) {
  const t = useT();
  const [days, setDays] = useState<Day[]>(() => [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const h = initial?.[i];
    return initial ? { on: Boolean(h), start: h?.start ?? '08:00', end: h?.end ?? '18:00' } : { on: i >= 1 && i <= 5, start: '08:00', end: '18:00' };
  }));
  const set = (i: number, p: Partial<Day>) => setDays((d) => d.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const first = days[ORDER.find((i) => days[i].on) ?? 1];
  return (
    <div className="week-hours">
      {ORDER.map((i) => {
        const d = days[i]; const bad = d.on && d.end <= d.start;
        return (
          <div key={i} className={`wh-row${d.on ? '' : ' off'}`}>
            <label className="wh-day"><input type="checkbox" name={`day_${i}`} checked={d.on} onChange={(e) => set(i, { on: e.target.checked })} />{t(DAYS[i])}</label>
            {d.on ? <>
              <input className="inp" type="time" name={`start_${i}`} value={d.start} step={900} onChange={(e) => set(i, { start: e.target.value })} aria-label={`${t(DAYS[i])} ${t('From')}`} />
              <span className="mu">–</span>
              <input className="inp" type="time" name={`end_${i}`} value={d.end} step={900} onChange={(e) => set(i, { end: e.target.value })} aria-label={`${t(DAYS[i])} ${t('To')}`} />
              {bad && <small className="err">{t('The end must be after the start')}</small>}
            </> : <span className="mu sm">{t('Day off')}</span>}
          </div>
        );
      })}
      <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setDays((d) => d.map((x) => (x.on ? { ...x, start: first.start, end: first.end } : x)))}>
        ⇣ {t('Same hours for all working days')}
      </button>
    </div>
  );
}
