import Link from 'next/link';
import { notFound } from 'next/navigation';
import ActionForm from '@/components/ActionForm';
import Figure from '@/components/Figure';
import { getPro } from '@/lib/data';
import { getT } from '@/lib/i18n';
import { requestCallback, sendFirstMessage } from './actions';

export const metadata = { title: 'Contact a pro', robots: { index: false } };

/** Request a call back (or, with ?msg=1, write a first message). On demo profiles the form is shown but sending is off. */
export default async function Callback({ searchParams }: { searchParams: Promise<{ pro?: string; msg?: string }> }) {
  const sp = await searchParams; const tr = await getT();
  const pro = sp.pro ? await getPro(sp.pro) : null; if (!pro) notFound();
  const first = pro.name.split(' ')[0]; const msg = Boolean(sp.msg);
  return (
    <section className="sec pad" style={{ ['--acc' as string]: pro.accent }}><div className="in" style={{ maxWidth: 620 }}>
      <div className="eyebrow">{msg ? tr('Message') : tr('Request a call back')}</div>
      <h2>{msg ? tr('Write to {name}', { name: first }) : tr('{name} will call you back', { name: first })}</h2>
      <div className="card pc" style={{ marginBottom: 14 }}>
        <span className="fig"><Figure name={pro.name} accent={pro.accent} photo={pro.photoUrl} /></span>
        <span><b>{pro.name}</b><br /><span className="mu sm">{pro.company?.name ?? tr('Independent pro')}{pro.callHours ? ` · ${tr('Calls')}: ${pro.callHours}` : ''}</span></span>
        <Link href={`/${pro.slug}`} className="btn ghost sm side">{tr('Profile')}</Link>
      </div>
      {!pro.accepting && !pro.isDemo && <div className="note" style={{ marginBottom: 14 }}>⏸ {tr('{name} is not taking new jobs right now and may not answer soon. You can still write.', { name: first })}</div>}
      {pro.isDemo && <div className="note" style={{ marginBottom: 14 }}>🧪 {tr('This is an example profile: the form shows how it works, but sending is turned off. With a real pro, your request goes to them.')}</div>}
      <ActionForm action={msg ? sendFirstMessage : requestCallback} className="card formcard">
        <input type="hidden" name="pro" value={pro.slug} />
        {!msg && <>
          <label className="f">{tr('Your phone')}<input className="inp" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="(650) 555-0123" /></label>
          <div className="f">{tr('When is it convenient?')}
            <div className="chips">{[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'This week'], ['weekend', 'Weekend']].map(([v, l]) => (
              <label key={v} className="chip"><input type="checkbox" name="when" value={v} defaultChecked={v === 'today'} /> {tr(l)}</label>))}</div>
          </div>
          <div className="f">{tr('What time?')}
            <div className="chips">{[['morning', 'Morning 8–12'], ['afternoon', 'Afternoon 12–5'], ['evening', 'Evening 5–8'], ['any', 'Any time']].map(([v, l]) => (
              <label key={v} className="chip"><input type="radio" name="part" value={v} defaultChecked={v === 'any'} /> {tr(l)}</label>))}</div>
          </div>
        </>}
        <label className="f">{msg ? tr('Your message') : tr('Short description of the problem (optional)')}
          <textarea className="inp" name="problem" maxLength={msg ? 1000 : 600} required={msg} placeholder={tr('E.g. Water heater leaks from the bottom, 40 gallons, about 10 years old.')} /></label>
        <span className="mu xs">{msg ? tr('The chat opens with this message. You can add photos there.') : tr('Your number goes only to {name}, in your chat. It is not shown anywhere else.', { name: first })}</span>
        <button className="btn" disabled={pro.isDemo}>{msg ? tr('Send') : tr('Ask {name} to call me', { name: first })}</button>
      </ActionForm>
      <p className="mu xs" style={{ marginTop: 12 }}><Link href={`/book?pro=${pro.slug}&estimate=1`}>{tr('Ask for estimate')}</Link> · <Link href={`/book?pro=${pro.slug}`}>{tr('Pick a time')}</Link></p>
    </div></section>
  );
}
