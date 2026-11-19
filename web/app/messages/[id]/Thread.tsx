/* eslint-disable @next/next/no-img-element */
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { uploadPhotos } from '@/lib/upload';
import Icon from '@/components/Icon';
import { useLang, useT } from '@/components/I18n';
import { sendMessage } from '../actions';
import QuoteCard, { type QuoteView } from '@/components/QuoteCard';

const CONTACT = /(\d{3}[\s.)-]*\d{3}[\s.-]*\d{4})|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(https?:\/\/|www\.)/i;
type Msg = { id: number; body: string; photo: string | null; mine: boolean; at: string; flagged: boolean; who: string };

export default function Thread({ id, messages, booked, quotes = [], role = 'client', quoteForm }: { id: string; messages: Msg[]; booked: boolean; quotes?: QuoteView[]; role?: 'client' | 'pro'; quoteForm?: React.ReactNode }) {
  const router = useRouter(); const t = useT(); const lang = useLang();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<{ url: string; preview: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function attach(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true); setErr(null);
    try {
      const files = [...list].slice(0, 6 - photos.length);
      const urls = await uploadPhotos(files, 'chat');
      setPhotos([...photos, ...files.map((f, i) => ({ url: urls[i], preview: URL.createObjectURL(f) }))]);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { const t = setInterval(() => router.refresh(), 5000); return () => clearInterval(t); }, [router]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length, quotes.length]);
  const warn = !booked && CONTACT.test(text);
  return (
    <>
      <div className="list" style={{ gap: 8, marginBottom: 14 }}>
        {[...messages.map((m) => ({ at: m.at, m, q: null as QuoteView | null })), ...quotes.map((q) => ({ at: q.at, m: null as Msg | null, q }))].sort((a, b) => a.at.localeCompare(b.at)).map(({ m, q }) => q ? <QuoteCard key={`q${q.id}`} q={q} role={role} /> : m && (
          <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            <div className="card" style={{ padding: m.photo ? 6 : '10px 14px', borderRadius: 16, background: m.mine ? '#22170F' : undefined, borderColor: m.mine ? 'var(--cu)' : undefined, whiteSpace: 'pre-wrap' }}>
              {m.photo && <a href={m.photo} target="_blank" rel="noreferrer"><img src={m.photo} alt="Photo" style={{ display: 'block', maxWidth: '100%', width: 260, borderRadius: 12 }} /></a>}
              {m.body && <div style={{ padding: m.photo ? '8px 8px 4px' : 0 }}>{m.body}</div>}
            </div>
            <div className="mu2 xs" style={{ textAlign: m.mine ? 'right' : 'left', marginTop: 2 }}>{m.mine ? t('You') : m.who} · {new Date(m.at).toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{m.flagged && ` · ${t('contact details shared before booking')}`}</div>
          </div>
        ))}
        {!messages.length && !quotes.length && <p className="mu">{t('Describe the job, ask about price or time. You can send photos.')}</p>}
        <div ref={end} />
      </div>
      {quoteForm && <div style={{ marginBottom: 10 }}>{quoteForm}</div>}
      <form action={async (f) => { const r = await sendMessage(f); if (r?.error) { setErr(t(r.error)); return; } setText(''); setPhotos([]); router.refresh(); }} className="list" style={{ gap: 8, position: 'sticky', bottom: 0, background: 'var(--bg)', paddingBlock: 10 }}>
        <input type="hidden" name="id" value={id} />
        {photos.map((p) => <input key={p.url} type="hidden" name="photo_url" value={p.url} />)}
        {photos.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{photos.map((p, i) => (
          <button type="button" key={p.preview} onClick={() => setPhotos(photos.filter((_, k) => k !== i))} title="Remove" style={{ padding: 0, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'none' }}>
            <img src={p.preview} alt="" style={{ width: 64, height: 64, objectFit: 'cover', display: 'block' }} /></button>))}</div>}
        <textarea className="inp" name="body" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder={photos.length ? t('Add a note (optional)') : t('Write a message')} style={{ minHeight: 60 }} required={!photos.length} />
        {err && <span className="err">{err}</span>}
        {warn && <div className="note" style={{ fontSize: 13 }}>{t('For your safety, keep talking here until the booking is confirmed. Deals made outside NovaFides have no reviews, no record and no help if something goes wrong.')}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <label className="btn ghost" style={{ cursor: 'pointer' }} aria-label={t('Attach photos')}>
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { attach(e.target.files); e.target.value = ''; }} />
            {busy ? t('Uploading…') : <><Icon name="camera" size={18} /> {t('Photo')}</>}
          </label>
          <button className="btn" disabled={busy}>{t('Send')}</button>
        </div>
      </form>
    </>
  );
}
