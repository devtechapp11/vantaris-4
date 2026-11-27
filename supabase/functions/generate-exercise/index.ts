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
import { buildLesson, type Built } from '../_shared/lesson.ts';
import { ExercisePublic } from '../_shared/exercise-schema.ts';

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

/**
 * Lesson mode: five items from the engine, keys stored server-side, public
 * payloads returned. Multiple-choice wording may be re-told by Gemini; the
 * result must still pass the shared contract, with two tries at most,
 * otherwise the engine's own wording is kept.
 */
export async function lessonItems(skill: string, seed: number, difficulty: number, tell: (ex: Exercise) => Promise<z.infer<typeof Narrative> | null> = narrate): Promise<Built[]> {
  const built = buildLesson(skill, seed, difficulty);
  return Promise.all(built.map(async (b) => {
    if (b.pub.kind !== 'mcq') return b;
    const ex = makeExercise(b.src.template, b.src.seed, b.src.difficulty);
    for (let i = 0; i < 2; i++) {
      const story = await tell(ex);
      if (!story) continue;
      const pub = ExercisePublic.safeParse({ ...b.pub, prompt: `${story.scenario} ${ex.question}`.slice(0, 400) });
      if (pub.success) return { ...b, pub: pub.data };
    }
    return b;
  }));
}

async function startLesson(req: Request, db: SupabaseLike, user: string, anonymous: boolean, skill: string) {
  const { data: gate, error } = await db.rpc('begin_generation', { p_user: user });
  if (error) throw error;
  const difficulty = pickDifficulty(Number(gate?.rating?.[skill] ?? START));
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const { data: opened, error: openError } = await db.rpc('begin_lesson', { p_user: user, p_skill: skill, p_seed: seed, p_anonymous: anonymous });
  if (openError) throw openError;
  if (!opened?.allowed) throw new HttpError(429, 'ANON_LIMIT', 'Save your desk to keep playing today.');
  const items = await lessonItems(skill, seed, difficulty);
  const { error: insertError } = await db.from('lesson_items').insert(items.map((b, position) => ({
    session_id: opened.session_id, exercise_id: b.pub.id, position, pub: b.pub, key: b.key, brief: b.brief, base_xp: b.base,
  })));
  if (insertError) throw insertError;
  return json(req, 200, { sessionId: opened.session_id, midasDay: Boolean(opened.midas_day), items: items.map((b) => b.pub) });
}

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'METHOD_NOT_ALLOWED' });
  try {
    const { db, user, anonymous } = await authed(req);
    const input = await body(req);
    if (input.mode === 'lesson') {
      const lessonSkill = typeof input.skill === 'string' && SKILLS.includes(input.skill) ? input.skill : null;
      if (!lessonSkill) throw new HttpError(400, 'BAD_REQUEST', 'Unknown skill');
      return await startLesson(req, db, user, anonymous, lessonSkill);
    }
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
