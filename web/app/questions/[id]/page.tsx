/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ActionForm from '@/components/ActionForm';
import Figure from '@/components/Figure';
import { answerQuestion, deleteAnswer, deleteQuestion, markBest, voteAnswer } from '@/app/community/actions';
import { startChat } from '@/app/messages/actions';
import { getMe } from '@/lib/auth';
import { TRADES, type Trade } from '@/lib/catalog';
import { getQuestion } from '@/lib/community';
import { getLang, getT } from '@/lib/i18n';
import { dateLabel } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function Question({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, me, tr, lang] = await Promise.all([getQuestion(id), getMe(), getT(), getLang()]);
  if (!data) notFound();
  const { q, answers } = data;
  const mineQ = me?.id === q.userId;
  const canAnswer = me?.pro?.status === 'verified' && !answers.some((a) => a.proId === me.id) && !mineQ;
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow"><Link href="/questions">{tr('Ask the pros')}</Link></div>
      <h2 style={{ marginBottom: 6 }}>{q.title}</h2>
      <div className="mu xs">{q.name} · {q.trade ? tr(TRADES[q.trade as Trade].name) + ' · ' : ''}{q.city ? q.city + ' · ' : ''}{dateLabel(q.createdAt, lang)}</div>
      {q.body && <p style={{ whiteSpace: 'pre-wrap' }}>{q.body}</p>}
      {q.photos.length > 0 && <div className={`post-photos n${Math.min(q.photos.length, 4)}`} style={{ marginBottom: 12 }}>{q.photos.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div>}
      {mineQ && <form action={deleteQuestion}><input type="hidden" name="id" value={q.id} /><button className="btn ghost sm">{tr('Delete question')}</button></form>}

      <h3 style={{ marginTop: 26 }}>{tr(answers.length === 1 ? '{n} answer' : '{n} answers', { n: answers.length })}</h3>
      <div className="list">
        {answers.map((a) => (
          <article key={a.id} className={`card ans${a.id === q.bestId ? ' best' : ''}`} style={{ ['--acc' as string]: a.accent }}>
            {a.slug ? <Link href={`/${a.slug}`} className="post-ava"><Figure name={a.name} accent={a.accent} photo={a.photoUrl} /></Link> : <span className="post-ava" />}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span>{a.slug ? <Link href={`/${a.slug}`}><b>{a.name}</b></Link> : <b>{a.name}</b>} <span className="badge ok" style={{ fontSize: 11 }}>✓ {tr('Verified pro')}</span>
                {a.id === q.bestId && <span className="badge ok" style={{ marginLeft: 6 }}>★ {tr('Best answer')}</span>}
                <br /><span className="mu xs">{a.trade ? tr(TRADES[a.trade as Trade].name) + ' · ' : ''}{dateLabel(a.createdAt, lang)}</span></span>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{a.body}</p>
              <div className="chips" style={{ alignItems: 'center' }}>
                {me && me.id !== a.proId
                  ? <form action={voteAnswer}><input type="hidden" name="question" value={q.id} /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="on" value={a.voted ? '0' : '1'} />
                      <button className={`btn sm ${a.voted ? '' : 'ghost'}`} aria-pressed={a.voted} title={tr('Helpful')}>▲ {tr('Helpful')} · {a.votes}</button></form>
                  : <span className="mu xs">▲ {a.votes}</span>}
                {mineQ && <form action={markBest}><input type="hidden" name="question" value={q.id} /><input type="hidden" name="id" value={a.id === q.bestId ? '' : a.id} />
                  <button className="btn ghost sm">{a.id === q.bestId ? tr('Unmark best') : `★ ${tr('Best answer')}`}</button></form>}
                {a.slug && me?.id !== a.proId && <>
                  <Link className="btn ghost sm" href={`/book?pro=${a.slug}`}>{tr('Book {name}', { name: a.name.split(' ')[0] })}</Link>
                  <form action={startChat}><input type="hidden" name="pro" value={a.slug} /><button className="btn ghost sm">{tr('Message')}</button></form>
                </>}
                {me?.id === a.proId && <form action={deleteAnswer}><input type="hidden" name="question" value={q.id} /><input type="hidden" name="id" value={a.id} /><button className="btn ghost sm">{tr('Delete')}</button></form>}
              </div>
            </div>
          </article>
        ))}
        {!answers.length && <div className="card empty">{tr('No answers yet. Local pros will see your question and reply here; you will get a notification.')}</div>}
      </div>

      {canAnswer && <ActionForm action={answerQuestion} className="card formcard" style={{ marginTop: 16 }}>
        <b>{tr('Your answer')}</b><input type="hidden" name="question" value={q.id} />
        <textarea className="inp" name="body" maxLength={2000} required style={{ minHeight: 110 }} placeholder={tr('Explain what it likely is, what to check safely, and what a fix usually costs. Clients can book you right from your answer.')} />
        <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Post answer')}</button>
      </ActionForm>}
      {me?.pro && me.pro.status !== 'verified' && <p className="mu sm">{tr('You can answer once your profile is verified.')}</p>}
      {!me && <p className="mu sm"><Link href={`/login?next=/questions/${q.id}`}>{tr('Sign in')}</Link> {tr('to vote for helpful answers.')}</p>}
    </div></section>
  );
}
