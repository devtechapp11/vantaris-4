// submit-answer: checks a deal-case answer on the server. The exercise is
// rebuilt from its template and seed by the same deterministic engine and
// compared with the stored answer; the attempt, the Elo rating and the XP
// (10 for a first right answer, capped per day) are recorded by
// record_exercise_attempt. One attempt per exercise per player.
import { HttpError, authed, body, corsHeaders, fail, json } from '../_shared/http.ts';
import { makeExercise } from '../_shared/templates.ts';
import { START, update } from '../_shared/elo.ts';
import { finishLesson, submitLessonAnswer } from './lesson.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'METHOD_NOT_ALLOWED' });
  try {
    const { db, user } = await authed(req);
    const input = await body(req, 1024);
    // V4 lessons: { sessionId, exerciseId, answer, attemptId } or { finish: sessionId }.
    if (typeof input.attemptId === 'string') return await submitLessonAnswer(req, db, user, input);
    if (input.finish !== undefined) return await finishLesson(req, db, user, input.finish);
    const id = typeof input.exercise_id === 'string' && UUID.test(input.exercise_id) ? input.exercise_id : null;
    const choice = Number.isInteger(input.choice) && (input.choice as number) >= 0 && (input.choice as number) <= 3 ? (input.choice as number) : null;
    if (!id || choice === null) throw new HttpError(400, 'BAD_REQUEST', 'exercise_id and choice (0–3) are required');

    const { data: row, error } = await db.from('exercise_pool').select('template, seed, difficulty, skill, answer_index').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Exercise not found');

    // The stored answer must match a fresh computation: a tampered row never pays out.
    const ex = makeExercise(row.template, Number(row.seed), row.difficulty);
    if (ex.answerIndex !== row.answer_index) throw new HttpError(500, 'INTEGRITY', 'Exercise failed its integrity check');
    const correct = choice === ex.answerIndex;

    const { data: mastery } = await db.from('skill_mastery').select('rating').eq('user_id', user).eq('skill', row.skill).maybeSingle();
    const rating = update(mastery?.rating ?? START, row.difficulty, correct);
    const { data: rec, error: recError } = await db.rpc('record_exercise_attempt', {
      p_user: user, p_exercise: id, p_choice: choice, p_correct: correct, p_rating: rating,
    });
    if (recError) throw recError;
    return json(req, 200, { correct, answer_index: ex.answerIndex, credited: rec?.credited ?? 0, repeat: Boolean(rec?.repeat), rating: rec?.repeat ? mastery?.rating ?? START : rating });
  } catch (err) {
    return fail(req, err, 'submit-answer');
  }
}

if (!Deno.env.get('VANTARIS_TEST')) Deno.serve(handle);
