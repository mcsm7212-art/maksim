import { getT } from '@/lib/i18n';
export const metadata = { title: 'Rules' };
export default async function Rules() {
  const tr = await getT();
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">{tr("How NovaFides works")}</div><h2>{tr("Rules for clients and pros")}</h2>
      <h3>{tr("You choose who gets your request")}</h3><p className="mu">{tr("You see every pro, compare them and can ask up to three at once: each pro sees how many got the same request. Nobody else receives it, and the job goes to the one pro you choose. We never sell leads. Pros never pay per lead: when paid plans start, it will be one simple flat subscription.")}</p>
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
      <h3 id="license">{tr("License shown everywhere")}</h3><p className="mu">{tr("A pro with a checked CSLB license shows the number in the profile, in posts and in every quote, with a link to the state record. A pro without a license is marked “No contractor license” and cannot send a quote of ,000 or more.")}</p>
      <h3 id="messages">{tr("Messages")}</h3>
      <ul className="mu" style={{ lineHeight: 1.6 }}>
        <li>{tr("The client always writes first. A pro cannot write or call a client who did not contact them.")}</li>
        <li>{tr("Be polite: no insults, threats or pressure.")}</li>
        <li>{tr("Never pay with gift cards, and do not send money to a person you have not met. NovaFides never asks you for money or for a code from an email.")}</li>
        <li>{tr("No advertising of other services and no messages unrelated to the job.")}</li>
        <li>{tr("Agree on the price in a quote on the site: then both sides have the same record if something goes wrong.")}</li>
      </ul>
      <h3 id="problems">{tr("If something goes wrong")}</h3>
      <ul className="mu" style={{ lineHeight: 1.6 }}>
        <li>{tr("Open the order and press “Report a problem”. The other side sees it and can answer.")}</li>
        <li>{tr("If you cannot agree, a NovaFides moderator looks at the chat, the quote and the photos and writes the result in the order.")}</li>
        <li>{tr("NovaFides is not a party to your agreement and does not refund money. For work by a licensed contractor you can also file a complaint with CSLB; a licensed contractor carries a bond.")}</li>
      </ul>
      <h3 id="limits">{tr("Warnings, limits and removal")}</h3>
      <ul className="mu" style={{ lineHeight: 1.6 }}>
        <li>{tr("Warning: rude messages, wrong information in a profile, a first no-show.")}</li>
        <li>{tr("Temporary limit: repeated warnings, advertising, pressure to change a review.")}</li>
        <li>{tr("Removal: fake reviews, a false license or identity, threats, fraud, unsafe behavior at a visit.")}</li>
        <li>{tr("You can appeal any decision by email. A person, not a program, reads the appeal and answers.")}</li>
      </ul>
      <h3>{tr("Companies")}</h3><p className="mu">{tr("If you choose a technician, the company cannot replace them without your OK. If the office assigned the technician, it may change them and you get a notification.")}</p>
      <h3>{tr("Handyman limits")}</h3><p className="mu">{tr("In California, a person without a contractor license may only take jobs under $1,000 total (labor and materials), that need no building permit and with no hired workers. A bigger job cannot be split into small ones.")}</p>
      <h3>{tr("Prices for pros")}</h3><p className="mu">{tr("During the launch NovaFides is free for pros and clients. When a subscription for pros is introduced, we will announce it at least 30 days in advance by email and in every pro account, with the exact start date and price. Nothing is charged without that notice. Pros who joined during the launch keep special terms. For clients, searching and booking stay free.")}</p>
    </div></section>
  );
}
