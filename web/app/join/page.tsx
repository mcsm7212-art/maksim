import Link from 'next/link';
import Icon from '@/components/Icon';

export const metadata = { title: 'Join as a pro or company' };
export default function Join() {
  return (
    <section className="sec pad"><div className="in">
      <div className="eyebrow">For pros &amp; companies</div>
      <h2>Flat monthly subscription. No lead fees.</h2>
      <p className="mu" style={{ maxWidth: '62ch' }}>Clients choose you directly. A request goes only to you, never to five competitors. Your reviews, job counts and skills stay with you.</p>
      <div className="grid2" style={{ marginTop: 18 }}>
        <Link href="/join/pro" className="card trade"><span className="ic"><Icon name="tool" size={24} /></span><h3>Independent pro</h3>
          <span className="mu sm">You work for yourself. Set your own prices, schedule and service levels. CSLB license required for plumbing and electrical.</span>
          <span className="btn sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>Create pro profile</span></Link>
        <Link href="/join/company" className="card trade"><span className="ic"><Icon name="shield" size={24} /></span><h3>Company</h3>
          <span className="mu sm">Your brand colors, your team. Clients chat with your office, book a technician or let you assign one.</span>
          <span className="btn sm" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>Register company</span></Link>
      </div>
      <p className="mu sm" style={{ marginTop: 18 }}>Technician at a company? Ask your office for an invite link.</p>
    </div></section>
  );
}
