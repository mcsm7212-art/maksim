'use client';
// Reads the rows of the first sheet of a big .xlsx file in the browser without unpacking it all at once:
// the sheet is inflated piece by piece and only complete <row> elements are parsed. Values come back as text.
import { Unzip, UnzipInflate, unzipSync } from 'fflate';

const unescape = (s: string) => s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e: string) =>
  e === 'amp' ? '&' : e === 'lt' ? '<' : e === 'gt' ? '>' : e === 'quot' ? '"' : e === 'apos' ? "'"
    : String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));
const texts = (xml: string) => { let out = ''; for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1]; return unescape(out); };
const colIndex = (ref: string) => { let n = 0; for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

/** Calls `onRows` with batches of rows (arrays of cell text). Awaits it between pieces, so uploads can keep up. */
export async function readXlsxRows(buf: Uint8Array, onRows: (rows: string[][]) => Promise<void>): Promise<void> {
  // 1) the shared strings (all text cells point into this list)
  const ssFile = unzipSync(buf, { filter: (f) => f.name === 'xl/sharedStrings.xml' })['xl/sharedStrings.xml'];
  const shared: string[] = [];
  if (ssFile) { const xml = new TextDecoder().decode(ssFile); for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(texts(m[1])); }

  // 2) the first worksheet, streamed
  const names: string[] = [];
  unzipSync(buf, { filter: (f) => { names.push(f.name); return false; } }); // only lists the names, unpacks nothing
  const sheetName = names.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))[0] ?? '';
  if (!sheetName) throw new Error('No worksheet in the file.');

  const dec = new TextDecoder(); let text = ''; let pending: string[][] = [];
  const parseRows = (final: boolean) => {
    const end = final ? text.length : text.lastIndexOf('</row>') + 6;
    if (end < 6) return;
    const part = text.slice(0, end); text = text.slice(end);
    for (const rm of part.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row: string[] = []; let next = 0;
      for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1]; const body = cm[2] ?? '';
        const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1]; const i = ref ? colIndex(ref) : next; next = i + 1;
        const type = attrs.match(/\bt="(\w+)"/)?.[1];
        let v = '';
        if (type === 'inlineStr') v = texts(body);
        else { const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? ''; v = type === 's' ? shared[Number(raw)] ?? '' : unescape(raw); }
        while (row.length < i) row.push('');
        row[i] = v;
      }
      pending.push(row);
    }
  };
  const uz = new Unzip();
  uz.register(UnzipInflate);
  uz.onfile = (f) => {
    if (f.name !== sheetName) return;
    f.ondata = (err, chunk, final) => { if (err) throw err; text += dec.decode(chunk, { stream: !final }); parseRows(final); };
    f.start();
  };
  const STEP = 1 << 20; // 1 MB of the file at a time
  for (let i = 0; i < buf.length; i += STEP) {
    uz.push(buf.subarray(i, i + STEP), i + STEP >= buf.length);
    if (pending.length) { const rows = pending; pending = []; await onRows(rows); }
  }
  if (pending.length) await onRows(pending);
}
