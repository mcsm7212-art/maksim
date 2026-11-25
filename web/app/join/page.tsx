import { getT } from '@/lib/i18n';
import Link from 'next/link';
import Icon from '@/components/Icon';

export const metadata = { title: 'Join as a pro or company' };
export default async function Join() {
  const tr = await getT();
  return (
    <section className="sec pad"><div className="in">
      <div className="eyebrow">{tr("For pros & companies")}</div>
      <h2>{tr("No lead fees. Free during the launch.")}</h2>
      <p style={{ fontSize: 18, margin: '0 0 8px' }}><b>{tr('Not a lead auction.')}</b> {tr('A client’s request is never sold to pros who then race to call first. The client picks pros by name, at most three, and you see how many got the request.')}</p>
      <p className="mu" style={{ maxWidth: '62ch' }}>{tr("Clients choose you by name. A request is never passed to anyone the client did not pick, and you never pay for it. Your reviews, job counts and skills stay with you.")}</p>
      <div className="note" style={{ margin: '14px 0 4px', maxWidth: '70ch' }}>
        <b>{tr("Free during the launch")}</b><br />
        {tr("Right now NovaFides charges nothing: no subscription, no lead fees, no card needed. A subscription will start only later, and only after we notify every pro by email and in the account at least 30 days in advance, with the exact start date. Pros who join now keep special terms.")}
      </div>
      <div className="grid2" style={{ marginTop: 18 }}>
        <Link href="/join/pro" className="card trade"><span className="ic"><Icon name="tool" size={24} /></span><h3>{tr("Independent pro")}</h3>
          <span className="mu sm">{tr("You work for yourself. Set your own prices, schedule and service levels. CSLB license required for plumbing and electrical.")}</span>
          <span className="btn sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>{tr("Create pro profile")}</span></Link>
        <Link href="/join/company" className="card trade"><span className="ic"><Icon name="shield" size={24} /></span><h3>{tr("Company")}</h3>
          <span className="mu sm">{tr("Your brand colors, your team. Clients chat with your office, book a technician or let you assign one.")}</span>
          <span className="btn sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>{tr("Register company")}</span></Link>
      </div>
      <h3 style={{ marginTop: 30 }}>{tr('How sign-up works')}</h3>
      <div className="steps-reg">
        <div className="card"><b>👤 {tr('Client')}</b><ol>
          <li>{tr('Tap “Sign in”, enter your email.')}</li><li>{tr('Enter the 6-digit code from the email. Done: no password, no form.')}</li>
          <li>{tr('Pick a pro and book, ask for an estimate or a call back.')}</li></ol></div>
        <div className="card"><b>🔧 {tr('Independent pro')}</b><ol>
          <li>{tr('“Create pro profile” → email and code.')}</li><li>{tr('Fill in the profile: real photo, trade, CSLB license, services and prices, days and hours.')}</li>
          <li>{tr('NovaFides checks the license and ID, then the profile goes public.')}</li></ol></div>
        <div className="card"><b>🏢 {tr('Company')}</b><ol>
          <li>{tr('“Register company” → email and code → company name, license, colors.')}</li>
          <li>{tr('Add technicians on the Business page: fill in a technician’s name and trade yourself, or just create an invite link.')}</li>
          <li>{tr('Send the link by text or email. The technician opens it, checks the prepared profile, adds a photo and joins your team.')}</li></ol></div>
      </div>
      <p className="mu sm" style={{ marginTop: 18 }}>{tr("Technician at a company? Ask your office for an invite link.")}</p>
    </div></section>
  );
}
