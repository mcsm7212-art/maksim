import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ProjectCard from '@/components/ProjectCard';
import { getMe } from '@/lib/auth';
import { getLang, getT } from '@/lib/i18n';
import { listProjects } from '@/lib/projects';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { dateLabel } from '@/lib/time';
import { deleteProject } from '@/app/projects/actions';

export const metadata = { title: 'Client' };
export const dynamic = 'force-dynamic';

/** A client's public card: first name + last initial, member since, finished jobs (count), confirmed projects, questions. No contacts or address. */
export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const { id } = await params; const sp = await searchParams; const tr = await getT(); const lang = await getLang();
  if (!isLive() || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sb = await supabaseServer(); const me = await getMe();
  const { data: card } = await sb.rpc('client_card', { uid: id });
  const c = (card ?? [])[0] as { name: string; since: string; jobs: number; projects: number; is_pro: boolean } | undefined;
  if (!c) notFound();
  if (c.is_pro) { const { data: p } = await sb.from('pros').select('slug').eq('id', id).maybeSingle(); if (p?.slug) redirect(`/${p.slug}`); }
  const mine = me?.id === id;
  const [projects, pending, { data: qs }] = await Promise.all([
    listProjects({ clientId: id, limit: 30 }),
    mine ? listProjects({ clientId: id, status: 'pending', limit: 30 }) : Promise.resolve([]),
    sb.from('questions').select('id, title, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
  ]);
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 720 }}>
      <div className="eyebrow">{tr('NovaFides member')}</div>
      <h2>{c.name}</h2>
      <p className="mu sm">{tr('On NovaFides since {date}', { date: dateLabel(c.since, lang) })} · {tr('{n} finished jobs', { n: Number(c.jobs) })} · {tr('{n} projects', { n: Number(c.projects) })}</p>
      {sp.sent && mine && <div className="okmsg">{tr('Sent. Your project goes public after the pro confirms it was their job.')}</div>}
      {mine && <p><Link className="btn sm" href="/projects/new">📸 {tr('Share a project')}</Link></p>}
      {pending.length > 0 && <><h3>{tr('Waiting for the pro to confirm')}</h3><div className="list">{pending.map((p) => <ProjectCard key={p.id} p={p} tr={tr} lang={lang}><form action={deleteProject}><input type="hidden" name="id" value={p.id} /><button className="linkbtn xs">{tr('Delete')}</button></form></ProjectCard>)}</div></>}
      <h3>{tr('Projects')}</h3>
      <div className="list">
        {projects.map((p) => <ProjectCard key={p.id} p={p} tr={tr} lang={lang}>{mine && <form action={deleteProject}><input type="hidden" name="id" value={p.id} /><button className="linkbtn xs">{tr('Delete')}</button></form>}</ProjectCard>)}
        {!projects.length && <div className="card empty">{tr('No public projects yet.')}</div>}
      </div>
      {(qs ?? []).length > 0 && <><h3 style={{ marginTop: 24 }}>{tr('Questions')}</h3><div className="list">{(qs ?? []).map((q) => <Link key={q.id} href={`/questions/${q.id}`} className="card bk" style={{ textDecoration: 'none' }}><span>❓ {q.title}</span><span className="mu xs">{dateLabel(q.created_at, lang)}</span></Link>)}</div></>}
      <p className="mu xs" style={{ marginTop: 18 }}>{tr('Only the first name, last initial and public activity are shown. Addresses and contacts are never public.')}</p>
    </div></section>
  );
}
