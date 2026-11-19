import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { SERVICES } from './catalog';

// Photo search: Claude looks at a client's photo of a home problem and picks the matching services
// from our catalog. Turned on by ANTHROPIC_API_KEY on the server. Without a key, or if the AI is slow
// or fails, the caller shows the regular word search instead (it never blocks the client).

const IDS = SERVICES.map((s) => s.id) as [string, ...string[]];
const Result = z.object({
  kind: z.enum(['home_job', 'unclear', 'not_home_job']).describe('home_job: a repair or install a plumber, electrician, handyman or builder does; unclear: cannot tell from the photo; not_home_job: anything else'),
  services: z.array(z.enum(IDS)).describe('1 to 3 catalog service ids that best match, most likely first. Empty if not a home job.'),
  summary: z.string().describe('One short sentence for the client: what the photo likely shows. In the requested language.'),
  urgent: z.boolean().describe('true if it looks like active water leaking, sparks, scorch marks, exposed live wiring, flooding or structural danger'),
  safety: z.string().describe('If urgent or risky: one short safety tip in the requested language (e.g. shut the main water valve). Otherwise empty.'),
});
export type PhotoResult = z.infer<typeof Result>;

const CATALOG = SERVICES.map((s) => `${s.id} | ${s.trade} | ${s.group} | ${s.name}`).join('\n');
const SYSTEM = `You help homeowners in the San Francisco Bay Area on NovaFides, a marketplace for plumbers, electricians, handymen and builders.
The user sends one photo of something in or around their home. Decide which jobs from the catalog below would fix it.
Pick only ids from the catalog. Prefer the specific repair over replacement when the photo shows a small problem.
If the photo shows a gas line, smell-related issue or anything you cannot judge, choose the closest inspection or repair service and say what to check.
Never identify people, read out addresses, or comment on anything unrelated to the repair.

Catalog (id | trade | group | name):
${CATALOG}`;

const LANG_NAME: Record<string, string> = { en: 'English', es: 'Spanish', ru: 'Russian' };
let client: Anthropic | null = null;

export const visionEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY) || process.env.NOVAFIDES_TEST_VISION === 'fake';

/** jpegBase64: the photo, already shrunk in the browser. Returns null when the AI is unavailable. */
export async function recognizePhoto(jpegBase64: string, lang: string): Promise<PhotoResult | null> {
  if (process.env.NOVAFIDES_TEST_VISION === 'fake') // local tests run without an API key
    return { kind: 'home_job', services: ['under-sink-leak-repair', 'faucet-replacement'], summary: 'Water is leaking under the kitchen sink.', urgent: true, safety: 'Close the shut-off valves under the sink.' };
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ timeout: 25_000, maxRetries: 1 });
  try {
    const res = await client.beta.messages.parse({
      model: process.env.NOVAFIDES_VISION_MODEL || 'claude-opus-5-5',
      max_tokens: 4096,
      // If the main model declines, the API retries on a fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 } },
        { type: 'text', text: `What job does this photo need? Answer in ${LANG_NAME[lang] ?? 'English'}.` },
      ] }],
      output_config: { effort: 'low', format: betaZodOutputFormat(Result) },
    });
    if (res.stop_reason === 'refusal') return null;
    const out = res.parsed_output;
    if (!out) return null;
    return { ...out, services: [...new Set(out.services)].slice(0, 3) };
  } catch (e) {
    console.error('photo search: AI unavailable', (e as Error).message);
    return null;
  }
}
