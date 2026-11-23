import Link from 'next/link';
import ActionForm from '@/components/ActionForm';
import PhotoPicker from '@/components/PhotoPicker';
import { askQuestion } from '@/app/community/actions';
import { getMe } from '@/lib/auth';
import { CITIES } from '@/lib/areas';
import { TRADES, type Trade, TRADE_KEYS } from '@/lib/catalog';
import { listQuestions } from '@/lib/community';
import { getLang, getT } from '@/lib/i18n';
import { isLive } from '@/lib/supabase/config';
import { dateLabel } from '@/lib/time';

export const metadata = { title: 'Ask the pros' };
export const dynamic = 'force-dynamic';

export default async function Questions({ searchParams }: { searchParams: Promise<{ trade?: string; show?: string }> }) {
  const sp = await searchParams; const tr = await getT(); const lang = await getLang(); const me = await getMe();
  const trade = sp.trade && sp.trade in TRADES ? (sp.trade as Trade) : null;
  const show = sp.show === 'mine' && me ? 'mine' : sp.show === 'open' ? 'open' : 'all';
  const list = await listQuestions({ trade, mine: show === 'mine', unanswered: show === 'open' });
  const href = (p: { trade?: string | null; show?: string }) => {
    const q = new URLSearchParams(); const t = p.trade !== undefined ? p.trade : trade; const s = p.show ?? show;
    if (t) q.set('trade', t); if (s !== 'all') q.set('show', s); return `/questions${q.size ? `?${q}` : ''}`;
  };
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 760 }}>
      <div className="eyebrow">{tr('Free answers from verified pros')}</div>
      <h2>{tr('Ask the pros')}</h2>
      <p className="mu" style={{ maxWidth: '60ch' }}>{tr('Not sure what is wrong or what it should cost? Ask here. Only verified local pros can answer, and you pick the most helpful answer.')}</p>
      {!isLive() && <p className="note">{tr('Demo mode: questions turn on when the database is connected.')}</p>}

      {me ? <details className="card formcard askbox" open={!list.length}>
        <summary><b>{tr('Ask a question')}</b></summary>
        <ActionForm action={askQuestion} className="list" style={{ gap: 10 }}>
          <input className="inp" name="title" maxLength={140} required placeholder={tr('E.g. “Why does my water heater make popping sounds?”')} aria-label={tr('Your question')} />
          <textarea className="inp" name="body" maxLength={2000} style={{ minHeight: 80 }} placeholder={tr('Details: what happens, since when, how old is the house or the appliance.')} aria-label={tr('Details')} />
          <div className="chips">
            <select className="inp" name="trade" defaultValue={trade ?? ''} style={{ width: 'auto' }} aria-label={tr('Trade')}>
              <option value="">{tr('Any trade')}</option>
              {TRADE_KEYS.map((t) => <option key={t} value={t}>{tr(TRADES[t].name)}</option>)}
            </select>
            <select className="inp" name="city" defaultValue="" style={{ width: 'auto' }} aria-label={tr('City')}>
              <option value="">{tr('City (optional)')}</option>
              {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <PhotoPicker name="q_photo" prefix="question" max={4} label={tr('Add photos')} />
          <span className="mu xs">{tr('Do not post your address, phone or other private details. Up to 5 questions a day.')}</span>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }}>{tr('Ask the pros')}</button>
        </ActionForm>
      </details>
        : <div className="card bk"><span>{tr('Sign in to ask a question. It is free.')}</span><Link className="btn sm" href="/login?next=/questions">{tr('Sign in')}</Link></div>}

      <div className="chips" style={{ margin: '18px 0 8px' }}>
        <Link className="chip" aria-pressed={show === 'all'} href={href({ show: 'all' })}>{tr('All')}</Link>
        <Link className="chip" aria-pressed={show === 'open'} href={href({ show: 'open' })}>{tr('Waiting for an answer')}</Link>
        {me && <Link className="chip" aria-pressed={show === 'mine'} href={href({ show: 'mine' })}>{tr('My questions')}</Link>}
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        <Link className="chip" aria-pressed={!trade} href={href({ trade: null })}>{tr('All trades')}</Link>
        {TRADE_KEYS.map((t) => <Link key={t} className="chip" aria-pressed={trade === t} href={href({ trade: t })}>{tr(TRADES[t].name)}</Link>)}
      </div>

      <div className="list">
        {list.map((q) => (
          <Link key={q.id} href={`/questions/${q.id}`} className="card qrow">
            <span className="qcount" aria-label={tr('{n} answers', { n: q.answers })}><b className="num">{q.answers}</b><small>{tr(q.answers === 1 ? 'answer' : 'answers')}</small></span>
            <span style={{ minWidth: 0 }}>
              <b>{q.title}</b>{q.bestId && <span className="badge ok" style={{ marginLeft: 8 }}>✓ {tr('Solved')}</span>}
              <br /><span className="mu xs">{q.name} · {q.trade ? tr(TRADES[q.trade as Trade].name) + ' · ' : ''}{q.city ? q.city + ' · ' : ''}{dateLabel(q.createdAt, lang)}</span>
            </span>
          </Link>
        ))}
        {isLive() && !list.length && <div className="card empty">{tr('No questions here yet. Be the first to ask.')}</div>}
      </div>
    </div></section>
  );
}
