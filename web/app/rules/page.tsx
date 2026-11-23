import { getT } from '@/lib/i18n';
export const metadata = { title: 'Rules' };
export default async function Rules() {
  const tr = await getT();
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">{tr("How NovaFides works")}</div><h2>{tr("Rules for clients and pros")}</h2>
      <h3>{tr("One pro per request")}</h3><p className="mu">{tr("Your request goes only to the pro or company you choose. We never sell leads. Pros never pay per lead: when paid plans start, it will be one simple flat subscription.")}</p>
      <h3>{tr("Verified identity")}</h3><p className="mu">{tr("Every pro is tied to an ID check and, for plumbing and electrical, a CSLB license. One person, one profile. Deleting a profile does not erase its reviews.")}</p>
      <h3 id="reviews">{tr("Reviews")}</h3><p className="mu">{tr("Only clients with a finished booking can review. You rate five skills: punctuality, workmanship, cleanliness, communication and pricing transparency. Honest negative reviews are never removed. Pros may post one calm public reply of up to 600 characters. Reviews that are fake, abusive or not about the job can be reported to a moderator.")}</p>
      <h3>{tr("How the rating works")}</h3>
      <ul className="mu" style={{ lineHeight: 1.6 }}>
        <li>{tr("Every review stays visible, including negative ones.")}</li>
        <li>{tr("An honest one-off negative review counts in full.")}</li>
        <li>{tr("If an author rates many pros much lower (or higher) than all other clients rate the same pros, those reviews count 25%.")}</li>
        <li>{tr("If an author praises one pro and gives very low marks to several others that everyone else rates well, their reviews do not count until a moderator checks them.")}</li>
        <li>{tr("A low review where the problem was resolved with the pro counts 50%.")}</li>
        <li>{tr("Such reviews are shown in a separate section with the reason. A person makes the final decision.")}</li>
        <li>{tr("Search order uses a cautious score: a pro with one 5-star review does not jump ahead of a pro with forty 4.9 reviews.")}</li>
        <li>{tr("Readers can mark a review as helpful.")}</li>
      </ul>
      <h3>{tr("Companies")}</h3><p className="mu">{tr("If you choose a technician, the company cannot replace them without your OK. If the office assigned the technician, it may change them and you get a notification.")}</p>
      <h3>{tr("Handyman limits")}</h3><p className="mu">{tr("In California, a person without a contractor license may only take jobs under $1,000 total (labor and materials), that need no building permit and with no hired workers. A bigger job cannot be split into small ones.")}</p>
      <h3>{tr("Prices for pros")}</h3><p className="mu">{tr("During the launch NovaFides is free for pros and clients. When a subscription for pros is introduced, we will announce it at least 30 days in advance by email and in every pro account, with the exact start date and price. Nothing is charged without that notice. Pros who joined during the launch keep special terms. For clients, searching and booking stay free.")}</p>
    </div></section>
  );
}
