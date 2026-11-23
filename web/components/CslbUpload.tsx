'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useT } from './I18n';

type Row = { license_no: string; name: string; name2: string; city: string; status: string; status2: string; classes: string[]; expires: string | null; updated: string | null };

/** Splits CSV text into rows of fields (quotes and commas inside quotes handled). Keeps the unfinished tail. */
function parseChunk(text: string, final: boolean): { rows: string[][]; rest: string } {
  const rows: string[][] = []; let row: string[] = []; let f = ''; let q = false; let start = 0; let i = 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); rows.push(row); row = []; f = ''; start = i + 1;
    } else f += c;
  }
  if (final) { if (f || row.length) { row.push(f); rows.push(row); } return { rows, rest: '' }; }
  return { rows, rest: text.slice(start) };
}
const day = (v: string) => { const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null; };
const classes = (v: string) => [...new Set(v.toUpperCase().split(/[|,;/\s]+/).map((x) => x.replace(/[^A-Z0-9]/g, '')).filter(Boolean))];

/**
 * Admin: upload the CSLB master list (CSV from the CSLB Data Portal). The file is read in the browser piece by piece,
 * only the needed columns are kept and sent to the database in batches; then every pro's number is checked again.
 */
export default function CslbUpload() {
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);

  async function run(file?: File) {
    if (!file) return; setErr(null); setBusy(true); setMsg(t('Reading the file…'));
    const sb = supabaseBrowser();
    let head: string[] | null = null; let idx: Record<string, number> = {}; let sent = 0; let dataDate: string | null = null;
    let batch: Row[] = []; const jobs: Promise<void>[] = [];
    const flush = async () => {
      if (!batch.length) return; const b = batch; batch = [];
      const { error } = await sb.from('cslb_licenses').upsert(b, { onConflict: 'license_no' });
      if (error) throw new Error(error.message);
      sent += b.length; setMsg(t('Uploaded {n} licenses…', { n: sent.toLocaleString('en-US') }));
    };
    const take = async (rows: string[][]) => {
      for (const r of rows) {
        if (!head) {
          head = r.map((x) => x.trim());
          const need = { no: 'LicenseNo', upd: 'LastUpdate', name: 'BusinessName', name2: 'BUS-NAME-2', city: 'City', st: 'PrimaryStatus', st2: 'SecondaryStatus', cls: 'Classifications(s)', exp: 'ExpirationDate' };
          for (const [k, v] of Object.entries(need)) idx[k] = head.findIndex((h) => h.toLowerCase() === v.toLowerCase());
          if (idx.no < 0 || idx.st < 0 || idx.cls < 0) throw new Error(t('This is not the CSLB master list: the LicenseNo, PrimaryStatus or Classifications column is missing. Download the CSV “License Master” file.'));
          continue;
        }
        const no = (r[idx.no] ?? '').replace(/\D/g, ''); if (!no) continue;
        const upd = idx.upd >= 0 ? day(r[idx.upd] ?? '') : null; if (upd && (!dataDate || upd > dataDate)) dataDate = upd;
        const g = (k: string, n = 120) => (idx[k] >= 0 ? (r[idx[k]] ?? '').trim().slice(0, n) : '');
        batch.push({ license_no: no.replace(/^0+(?=\d)/, ''), name: g('name'), name2: g('name2'), city: g('city', 60), status: g('st', 40), status2: g('st2', 120), classes: classes(g('cls', 200)), expires: day(g('exp', 12)), updated: upd });
        if (batch.length >= 1000) { jobs.push(flush()); if (jobs.length >= 3) await jobs.shift(); }
      }
    };
    try {
      if (/\.xlsx?$/i.test(file.name)) throw new Error(t('Please upload the CSV version of the list (on the CSLB page: “Master License File in CSV format”).'));
      const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader(); let rest = '';
      for (;;) {
        const { value, done } = await reader.read();
        const { rows, rest: r } = parseChunk(rest + (value ?? ''), done); rest = r;
        await take(rows); if (done) break;
      }
      jobs.push(flush()); await Promise.all(jobs);
      if (!sent) throw new Error(t('No licenses were found in the file.'));
      await sb.from('cslb_imports').insert({ rows: sent, data_date: dataDate });
      setMsg(t('Checking every pro again…'));
      const { data: k } = await sb.rpc('cslb_recheck_all');
      setMsg(t('Done: {n} licenses uploaded (list of {d}). {k} pros checked again.', { n: sent.toLocaleString('en-US'), d: dataDate ?? '—', k: Number(k ?? 0) }));
    } catch (e) { setErr((e as Error).message); setMsg(null); }
    setBusy(false);
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="sm">{t('Download the CSLB master list (CSV) on the CSLB Data Portal and upload it here once a week or month. Every license number pros type is then compared with it automatically.')}</span>
      <label className="drop">
        <input type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => { run(e.target.files?.[0]); e.target.value = ''; }} />
        <span><b>{busy ? t('Uploading… keep this page open') : t('Upload the CSLB list (CSV)')}</b><br /><span className="mu xs">{t('About 45 MB, takes a few minutes')}</span></span>
      </label>
      <a className="xs" href="https://www.cslb.ca.gov/onlineservices/dataportal/ContractorList" target="_blank" rel="noreferrer">{t('Open the CSLB Data Portal')} ↗</a>
      {msg && <span className="okmsg xs">{msg}</span>}
      {err && <span className="err xs">{err}</span>}
    </div>
  );
}
