// generate-exercise: a deal-case exercise for one skill, at the difficulty the
// player's Elo rating calls for. The numbers and the answer always come from
// the deterministic finance engine; Gemini (server side only) may re-tell the
// scenario, and its text is kept only if it passes the schema and quotes every
// figure verbatim. Otherwise the engine's own wording is used.
//
// Secrets: GEMINI_API_KEY (optional: without it every exercise uses the
// engine's wording), GEMINI_MODEL (optional), ALLOWED_ORIGINS.
import { z } from 'npm:zod@3.25.76';
import { HttpError, authed, body, corsHeaders, fail, json } from '../_shared/http.ts';
import { makeExercise, mentionsAll, templatesFor, type Exercise } from '../_shared/templates.ts';
import { DealBriefSchema } from '../_shared/dealBrief.ts';
import { START, pickDifficulty } from '../_shared/elo.ts';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const SKILLS = ['statements', 'dcf', 'comps', 'precedents', 'lbo', 'ma', 'restructuring', 'structuring'];

const Narrative = z.object({
  scenario: z.string().trim().min(40).max(420),
  brief: DealBriefSchema,
});

/** The payload players receive: everything but the answer. */
export const publicPayload = (id: string, ex: Exercise, seed: number, prompt: string, brief: Exercise['brief']) => ({
  id, template: ex.template, seed, difficulty: ex.difficulty, skill: ex.skill,
  prompt, question: ex.question, data: ex.data, options: ex.options, brief,
});

/** Keeps a model narrative only if it is valid and quotes every figure verbatim. */
export function acceptNarrative(raw: unknown, ex: Exercise): z.infer<typeof Narrative> | null {
  const parsed = Narrative.safeParse(raw);
  if (!parsed.success) return null;
  if (!mentionsAll(parsed.data.scenario, ex.numbers)) return null;
  // No other figures than the engine's: every number in the text must be one of them.
  const allowed = ex.numbers.join(' ');
  const stray = (parsed.data.scenario.match(/\d[\d,.]*/g) ?? []).filter((n) => !allowed.includes(n) && !/^(19|20)\d\d$/.test(n) && !/^[1-9]$/.test(n));
  return stray.length ? null : parsed.data;
}

async function narrate(ex: Exercise): Promise<z.infer<typeof Narrative> | null> {
  const key = Deno.env.get('GEMINI_API_KEY')?.trim();
  if (!key) return null;
  const model = Deno.env.get('GEMINI_MODEL')?.trim() || DEFAULT_MODEL;
  if (!/^[a-z0-9.-]{3,60}$/.test(model)) return null;
  const instructions = [
    'Rewrite this investment-banking practice scenario as a short, concrete deal story (2 to 3 sentences, under 400 characters).',
    `Quote these figures exactly as written, each at least once, and use no other numbers: ${ex.numbers.join(', ')}.`,
    'Do not state, hint at or compute the answer. Plain English, no markdown.',
    'Also return a Deal Brief: rule (≤140 chars), trap (≤140), realWorld (≤180), formula (≤80).',
    'Reply with JSON only: {"scenario": string, "brief": {"rule": string, "trap": string, "realWorld": string, "formula": string}}',
    '',
    `Scenario: ${ex.prompt}`,
    `Question (do not answer): ${ex.question}`,
    `Reference brief: ${JSON.stringify(ex.brief)}`,
  ].join('\n');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: instructions }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 400, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    return acceptNarrative(JSON.parse(text), ex);
  } catch {
    return null;
  }
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'METHOD_NOT_ALLOWED' });
  try {
    const { db, user } = await authed(req);
    const input = await body(req);
    const skill = typeof input.skill === 'string' && SKILLS.includes(input.skill) ? input.skill : null;
    if (!skill) throw new HttpError(400, 'BAD_REQUEST', 'Unknown skill');
    const templates = templatesFor(skill);
    if (!templates.length) throw new HttpError(404, 'NO_TEMPLATE', 'No deal case for this skill yet');

    const { data: gate, error } = await db.rpc('begin_generation', { p_user: user });
    if (error) throw error;
    const rating = Number(gate?.rating?.[skill] ?? START);
    const difficulty = pickDifficulty(rating);

    // Reuse the pool half the time (and always once the daily quota is spent),
    // never an exercise this player has already answered.
    const { data: pooled, error: poolError } = await db
      .from('exercise_pool')
      .select('id, payload')
      .eq('skill', skill)
      .eq('difficulty', difficulty)
      .order('created_at', { ascending: false })
      .limit(40);
    if (poolError) throw poolError;
    const { data: seen } = await db.from('exercise_attempts').select('exercise_id').eq('user_id', user);
    const seenIds = new Set((seen ?? []).map((r: { exercise_id: string }) => r.exercise_id));
    const fresh = (pooled ?? []).filter((r: { id: string }) => !seenIds.has(r.id));
    if (fresh.length && (!gate?.allowed || Math.random() < 0.5)) {
      const row = fresh[Math.floor(Math.random() * fresh.length)];
      return json(req, 200, { ...row.payload, id: row.id, source: 'pool' });
    }
    if (!gate?.allowed) throw new HttpError(429, 'LIMIT', 'You have done every deal case for today. New ones come back tomorrow.');

    const template = templates[Math.floor(Math.random() * templates.length)];
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const ex = makeExercise(template, seed, difficulty);
    const story = await narrate(ex);
    const prompt = story?.scenario ?? ex.prompt;
    const brief = story?.brief ?? ex.brief;
    const { data: row, error: insertError } = await db
      .from('exercise_pool')
      .insert({
        template, seed, difficulty, skill,
        payload: publicPayload('', ex, seed, prompt, brief),
        answer_index: ex.answerIndex, source: story ? 'gemini' : 'template', created_by: user,
      })
      .select('id')
      .single();
    if (insertError) throw insertError;
    return json(req, 200, { ...publicPayload(row.id, ex, seed, prompt, brief), source: story ? 'gemini' : 'template' });
  } catch (err) {
    return fail(req, err, 'generate-exercise');
  }
}

if (!Deno.env.get('VANTARIS_TEST')) Deno.serve(handle);
