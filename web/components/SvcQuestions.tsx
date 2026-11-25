'use client';
import { useEffect, useRef, useState } from 'react';
import { SVC_QUESTIONS } from '@/lib/svc-questions';
import { useT } from './I18n';

/** Quick questions for the chosen service. The answers travel with the request, so the pro does not ask them again. */
export default function SvcQuestions({ initial }: { initial?: string }) {
  const t = useT(); const box = useRef<HTMLSpanElement>(null);
  const [svc, setSvc] = useState(initial ?? ''); const [ans, setAns] = useState<Record<string, string>>({});
  useEffect(() => {
    const f = box.current?.closest('form'); if (!f) return;
    const on = () => { const v = (f.elements.namedItem('svc') as HTMLSelectElement | null)?.value ?? ''; setSvc((old) => { if (old !== v) setAns({}); return v; }); };
    on(); f.addEventListener('change', on); return () => f.removeEventListener('change', on);
  }, []);
  const qs = SVC_QUESTIONS[svc] ?? [];
  return (
    <span ref={box} style={{ display: 'contents' }}>
      {qs.length > 0 && <div className="svc-q">
        <span className="mu xs">{t('A few quick questions, so the pro does not have to ask (optional)')}</span>
        {qs.map(([q, opts]) => (
          <div key={q} className="sctl-row"><span className="sm">{t(q)}</span>
            {opts.map((o) => <button type="button" key={o} className="chip" aria-pressed={ans[q] === o} onClick={() => setAns((a) => ({ ...a, [q]: a[q] === o ? '' : o }))}>{t(o)}</button>)}
          </div>))}
      </div>}
      <input type="hidden" name="qa" value={qs.filter(([q]) => ans[q]).map(([q]) => `${q} ${ans[q]}`).join('\n')} />
    </span>
  );
}
