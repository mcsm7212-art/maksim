import { redirect } from 'next/navigation';
import ProjectCard from '@/components/ProjectCard';
import { getMe } from '@/lib/auth';
import { getLang, getT } from '@/lib/i18n';
import { listProjects } from '@/lib/projects';
import { confirmProject, declineProject } from '@/app/projects/actions';

export const metadata = { title: 'Client projects' };
export const dynamic = 'force-dynamic';

/** For pros: clients tag you in their projects; confirm the ones that were your job. */
export default async function ProProjects() {
  const tr = await getT(); const lang = await getLang();
  const me = await getMe(); if (!me) redirect('/login?next=/account/projects'); if (!me.pro) redirect('/account');
  const [pending, done] = await Promise.all([listProjects({ proId: me.id, status: 'pending' }), listProjects({ proId: me.id })]);
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 720 }}>
      <div className="eyebrow">{tr('Free word of mouth')}</div><h2>📸 {tr('Client projects')}</h2>
      <p className="mu">{tr('Clients show finished work in their home and tag you. Confirm only jobs you really did: confirmed projects appear on your page and in the feed.')}</p>
      <h3>{tr('Waiting for you')} ({pending.length})</h3>
      <div className="list">
        {pending.map((p) => (
          <ProjectCard key={p.id} p={p} tr={tr} lang={lang}>
            <form action={confirmProject} className="chips"><input type="hidden" name="id" value={p.id} />
              <button className="btn sm confirm-proj">✓ {tr('Yes, this was my job')}</button>
              <button className="btn ghost sm" formAction={declineProject}>{tr('Not my job')}</button></form>
          </ProjectCard>))}
        {!pending.length && <div className="card empty">{tr('Nothing to confirm.')}</div>}
      </div>
      {done.length > 0 && <><h3 style={{ marginTop: 24 }}>{tr('Confirmed')}</h3><div className="list">{done.map((p) => <ProjectCard key={p.id} p={p} tr={tr} lang={lang} />)}</div></>}
    </div></section>
  );
}
