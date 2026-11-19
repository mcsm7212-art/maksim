import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { SERVICES } from './catalog';

// "Find this part": Claude looks at a photo of a part (a shower cartridge, a breaker, a fill valve),
// reads the brand and any markings, then searches the web for the exact manufacturer part number.
// Needs ANTHROPIC_API_KEY. Fails open: the caller falls back to plain search links.

const IDS = SERVICES.map((s) => s.id) as [string, ...string[]];
const Seen = z.object({
  is_part: z.boolean().describe('true if the photo shows a home plumbing/electrical/hardware part or fixture'),
  part_type: z.string().describe('What it is, short, in English, e.g. "pressure balance shower valve cartridge"'),
  brand: z.string().describe('Brand if a logo or name is visible or the design is unmistakable, else empty'),
  markings: z.array(z.string()).describe('Exact text/numbers readable on the part. Never invent.'),
  features: z.string().describe('Key physical features that matter for fit (size, screws, stem splines, connections)'),
  queries: z.array(z.string()).describe('1-3 precise shopping search queries in English, most specific first'),
  services: z.array(z.enum(IDS)).describe('0-2 catalog service ids for installing/replacing this part'),
  tip: z.string().describe('What to photograph next to get the exact part number (in the requested language). Empty if markings already give it.'),
  summary: z.string().describe('One short sentence for the user, in the requested language: what this part is.'),
});
export type Candidate = { partNo: string; name: string; why: string; url: string };
export type PartResult = z.infer<typeof Seen> & { candidates: Candidate[] };

const SYSTEM = `You identify replacement parts for homeowners and tradespeople in the US (San Francisco Bay Area) on NovaFides.
Look at the photo of a part. Read logos and any molded, printed or engraved text exactly; do not guess numbers that are not visible.
Describe the features that decide whether a replacement fits. Write shopping queries a plumber or electrician would use.
Service ids must come from this catalog (id | name):
${SERVICES.map((s) => `${s.id} | ${s.name}`).join('\n')}`;

const LANG_NAME: Record<string, string> = { en: 'English', es: 'Spanish', ru: 'Russian' };
const Cands = z.object({ candidates: z.array(z.object({ part_no: z.string(), name: z.string(), why: z.string(), url: z.string() })).max(3) });

let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic({ timeout: 45_000, maxRetries: 1 }));
const MODEL = () => process.env.NOVAFIDES_VISION_MODEL || 'claude-opus-5-5';

export async function identifyPart(jpegBase64: string, lang: string): Promise<PartResult | null> {
  if (process.env.NOVAFIDES_TEST_VISION === 'fake')
    return { is_part: true, part_type: 'pressure balance shower valve cartridge', brand: 'Grohe', markings: ['GROHE'], features: 'Black plastic body on a 4-screw brass valve, splined brass stem',
      queries: ['Grohe pressure balance valve cartridge 47678000', 'Grohe shower cartridge 4 screw'], services: ['shower-valve-cartridge-replacement'].filter((id) => IDS.includes(id)) as PartResult['services'],
      tip: '', summary: 'A Grohe pressure balance shower cartridge.', candidates: [{ partNo: '47678000', name: 'Grohe pressure balance valve cartridge', why: 'Grohe logo, 4-screw body', url: 'https://www.grohe.us' }] };
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    // 1) What is it? (photo → structured description)
    const seen = await api().beta.messages.parse({
      model: MODEL(), max_tokens: 4096,
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 } },
        { type: 'text', text: `Identify this part. Write "summary" and "tip" in ${LANG_NAME[lang] ?? 'English'}; everything else in English.` },
      ] }],
      output_config: { effort: 'low', format: betaZodOutputFormat(Seen) },
    });
    if (seen.stop_reason === 'refusal' || !seen.parsed_output) return null;
    const s = seen.parsed_output;
    const out: PartResult = { ...s, services: [...new Set(s.services)].slice(0, 2), queries: s.queries.slice(0, 3), candidates: [] };
    if (!s.is_part) return out;
    out.candidates = await findPartNumbers(s).catch(() => []);
    return out;
  } catch (e) {
    console.error('find part: AI unavailable', (e as Error).message);
    return null;
  }
}

/** 2) Which exact part number? (web search; best effort, a few searches at most) */
async function findPartNumbers(s: z.infer<typeof Seen>): Promise<Candidate[]> {
  const prompt = `A part was photographed. Type: ${s.part_type}. Brand: ${s.brand || 'unknown'}. Visible markings: ${s.markings.join(', ') || 'none'}. Features: ${s.features}.
Search the web for the manufacturer part number(s) that match. Only include a part number if a page you found shows it for this kind of part and brand.
Finish with only a JSON object, no other text after it: {"candidates":[{"part_no":"","name":"","why":"","url":""}]} (at most 3, best first; empty list if unsure).`;
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: prompt }];
  for (let turn = 0; turn < 3; turn++) {
    const r = await api().beta.messages.create({
      model: MODEL(), max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
      output_config: { effort: 'low' },
      messages,
    });
    if (r.stop_reason === 'pause_turn') { messages.push({ role: 'assistant', content: r.content }); continue; }
    if (r.stop_reason === 'refusal') return [];
    const text = r.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n');
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = Cands.safeParse(JSON.parse(json || '{}'));
    if (!parsed.success) return [];
    return parsed.data.candidates.filter((c) => c.part_no.trim()).map((c) => ({ partNo: c.part_no.trim().slice(0, 40), name: c.name.slice(0, 120), why: c.why.slice(0, 200), url: /^https?:\/\//.test(c.url) ? c.url : '' }));
  }
  return [];
}

/** Shopping links. Amazon links carry the NovaFides Associates tag when AMAZON_ASSOCIATE_TAG is set. */
export function shopLinks(query: string) {
  const q = encodeURIComponent(query);
  const tag = process.env.AMAZON_ASSOCIATE_TAG;
  return [
    { name: 'Amazon', url: `https://www.amazon.com/s?k=${q}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`, sponsored: Boolean(tag) },
    { name: 'Home Depot', url: `https://www.homedepot.com/s/${q}`, sponsored: false },
    { name: "Lowe's", url: `https://www.lowes.com/search?searchTerm=${q}`, sponsored: false },
    { name: 'Google', url: `https://www.google.com/search?q=${q}`, sponsored: false },
  ];
}
export const affiliateOn = () => Boolean(process.env.AMAZON_ASSOCIATE_TAG);
