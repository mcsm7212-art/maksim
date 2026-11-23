'use client';
import { useState } from 'react';
import { useT } from './I18n';
import WeekHours from './WeekHours';

type Days = Record<number, { start: string; end: string }>;
/** Phone and calls: who may call, call hours (the work schedule or own hours per day), and what happens while the pro is not taking jobs. */
export default function CallSettings({ phone, from, days, pause, hide, workText }: { phone: string; from: 'all' | 'clients'; days: Days | null; pause: boolean; hide: boolean; workText: string }) {
  const t = useT();
  const [who, setWho] = useState(from); const [own, setOwn] = useState(Boolean(days));
  return (
    <>
      <label className="f">{t('Phone')}<input className="inp" name="phone" type="tel" inputMode="tel" defaultValue={phone} placeholder="(650) 555-0123" /></label>
      <fieldset className="opt-set"><legend>{t('Who can call me')}</legend>
        <label><input type="radio" name="call_from" value="all" checked={who === 'all'} onChange={() => setWho('all')} /> <span><b>{t('Everyone')}</b><br /><span className="mu xs">{t('The “Call” button is on your page for all visitors.')}</span></span></label>
        <label><input type="radio" name="call_from" value="clients" checked={who === 'clients'} onChange={() => setWho('clients')} /> <span><b>{t('Only my clients')}</b><br /><span className="mu xs">{t('Only clients whose job you confirmed see your number. New clients write to you or ask for a call back.')}</span></span></label>
      </fieldset>
      <fieldset className="opt-set"><legend>{t('When I take calls')}</legend>
        <label><input type="radio" name="call_sched" value="work" checked={!own} onChange={() => setOwn(false)} /> <span><b>{t('Same as my work schedule')}</b><br /><span className="mu xs">{workText || t('Set your work schedule below.')}</span></span></label>
        <label><input type="radio" name="call_sched" value="own" checked={own} onChange={() => setOwn(true)} /> <span><b>{t('Own call hours for each day')}</b></span></label>
        {own && <WeekHours initial={days} />}
      </fieldset>
      <fieldset className="opt-set"><legend>{t('While I am not taking jobs')}</legend>
        <label><input type="checkbox" name="call_pause" defaultChecked={pause} /> <span><b>{t('I do not take calls')}</b><br /><span className="mu xs">{t('The “Call” button is hidden. Your clients see that you are not taking calls now and can write to you.')}</span></span></label>
        <label><input type="checkbox" name="hide_paused" defaultChecked={hide} /> <span><b>{t('Do not show me to new clients')}</b><br /><span className="mu xs">{t('You are not in the search and lists until you take jobs again. Your clients still find you in their orders and chats.')}</span></span></label>
      </fieldset>
    </>
  );
}
