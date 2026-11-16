import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

// AI tone check for public replies to reviews. Runs after the rule check in lib/tone.ts.
// Turned on by setting ANTHROPIC_API_KEY on the server. If the key is missing, the call
// fails or takes too long, the reply is judged by the rules only (it never blocks a pro
// because the AI is unavailable).

const Verdict = z.object({
  ok: z.boolean().describe('true if the reply is calm, polite and fit to publish'),
  problem: z.enum(['none', 'insult', 'blame', 'threat', 'private_info', 'argument', 'off_topic', 'other']),
  suggestion: z.string().describe('If not ok: one short, friendly sentence telling the pro what to change. Empty if ok.'),
});
export type ToneVerdict = z.infer<typeof Verdict>;

const SYSTEM = `You check a home-service pro's public reply to a customer review on NovaFides, a marketplace for plumbers, electricians and handymen.
A reply is fit to publish when it is calm and polite, even if the pro disagrees or explains their side.
It is NOT fit when it insults or mocks the customer, calls them a liar, blames them aggressively, threatens (legal action, reporting, bad consequences), reveals private details about the customer or their home (address, phone, family, what is inside the house), argues back and forth, or is not about the job.
Short thanks are fine. Apologies are fine. Explaining a delay or a price is fine.
Write the suggestion in this language: {LANG}. Keep it under 25 words.`;

const LANG_NAME: Record<string, string> = { en: 'English', es: 'Spanish', ru: 'Russian' };
let client: Anthropic | null = null;

export async function aiToneCheck(reply: string, review: string, lang: string): Promise<ToneVerdict | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ timeout: 15_000, maxRetries: 1 });
  try {
    const res = await client.beta.messages.parse({
      model: process.env.NOVAFIDES_TONE_MODEL || 'claude-opus-5-5',
      max_tokens: 2048,
      // If the main model declines, the API retries on a fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM.replace('{LANG}', LANG_NAME[lang] ?? 'English'),
      messages: [{ role: 'user', content: `Customer review:\n<review>\n${review.slice(0, 2000)}\n</review>\n\nPro's reply to check:\n<reply>\n${reply.slice(0, 700)}\n</reply>` }],
      output_config: { effort: 'low', format: betaZodOutputFormat(Verdict) },
    });
    if (res.stop_reason === 'refusal' || !res.parsed_output) return null;
    return res.parsed_output;
  } catch (e) {
    console.error('AI tone check skipped:', e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : (e as Error).message);
    return null;
  }
}
