import { getT } from '@/lib/i18n';
export const metadata = { title: 'Rules' };
export default async function Rules() {
  const tr = await getT();
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">{tr("How NovaFides works")}</div><h2>{tr("Rules for clients and pros")}</h2>
      <h3>{tr("One pro per request")}</h3><p className="mu">{tr("Your request goes only to the pro or company you choose. We never sell leads. Pros never pay per lead: when paid plans start, it will be one simple flat subscription.")}</p>
      <h3>{tr("Verified identity")}</h3><p className="mu">{tr("Every pro is tied to an ID check and, for plumbing and electrical, a CSLB license. One person, one profile. Deleting a profile does not erase its reviews.")}</p>
      <h3>{tr("Reviews")}</h3><p className="mu">{tr("Only clients with a finished booking can review. You rate five skills: punctuality, workmanship, cleanliness, communication and pricing transparency. Honest negative reviews are never removed. Pros may post one calm public reply of up to 600 characters. Reviews that are fake, abusive or not about the job can be reported to a moderator.")}</p>
      <h3>{tr("Companies")}</h3><p className="mu">{tr("If you choose a technician, the company cannot replace them without your OK. If the office assigned the technician, it may change them and you get a notification.")}</p>
      <h3>{tr("Handyman limits")}</h3><p className="mu">{tr("In California, handymen without a license may only take jobs under $1,000 total, without permits.")}</p>
      <h3>{tr("Prices for pros")}</h3><p className="mu">{tr("During the launch NovaFides is free for pros and clients. When a subscription for pros is introduced, we will announce it at least 30 days in advance by email and in every pro account, with the exact start date and price. Nothing is charged without that notice. Pros who joined during the launch are Founding Pros and keep special terms. For clients, searching and booking stay free.")}</p>
    </div></section>
  );
}
