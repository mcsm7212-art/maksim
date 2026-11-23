import Link from 'next/link';

/** Under the name on a pro page: a few jobs with prices, so a new pro's page is useful from day one. */
export default function HeroJobs({ title, jobs, from }: { title: string; from: string; jobs: { id: string; name: string; price: number; href?: string }[] }) {
  if (!jobs.length) return null;
  const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  return (
    <div className="herojobs">
      <small>{title}</small>
      {jobs.map((j) => {
        const body = <><span>{j.name}</span><b>{from} {usd(j.price)}</b></>;
        return j.href ? <Link key={j.id} href={j.href}>{body}<i aria-hidden>→</i></Link> : <span key={j.id} className="hj">{body}</span>;
      })}
    </div>
  );
}
