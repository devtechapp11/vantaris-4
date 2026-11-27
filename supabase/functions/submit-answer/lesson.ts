// Lesson answers (V4): graded from the key stored by generate-exercise,
// idempotent by attemptId, combo computed over the session on the server.
import { HttpError, json } from '../_shared/http.ts';
import { ExerciseKey, ExercisePublic, SubmitRequest, SubmitResponse } from '../_shared/exercise-schema.ts';
import { grade } from '../_shared/lesson.ts';

/** The onboarding's first deal: fixed content, key seeded here (never sent to the client). */
const SEEDED: Record<string, { key: ExerciseKey; brief: { title: string; takeaway: string }; base: number }> = {
  'onb-first-deal': {
    key: { kind: 'mcq', correct: 'b' },
    brief: { title: 'Valuation multiple', takeaway: 'Value = earnings × multiple. Bankers price companies this way every day. You just did it.' },
    base: 10,
  },
};

// deno-lint-ignore no-explicit-any
export async function submitLessonAnswer(req: Request, db: any, user: string, input: Record<string, unknown>): Promise<Response> {
  const parsed = SubmitRequest.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'BAD_REQUEST', 'Invalid answer');
  const { sessionId, exerciseId, answer, attemptId } = parsed.data;

  let key: ExerciseKey;
  let pub: ExercisePublic | null = null;
  let brief: { title: string; takeaway: string };
  let base: number;
  const seeded = SEEDED[exerciseId];
  if (seeded) {
    // The first deal opens its own one-item session.
    const { data: s } = await db.from('lesson_sessions').select('id').eq('id', sessionId).eq('user_id', user).maybeSingle();
    if (!s) {
      const { error } = await db.from('lesson_sessions').insert({ id: sessionId, user_id: user, skill: 'onboarding', seed: 0, local_date: new Date().toISOString().slice(0, 10) });
      if (error && error.code !== '23505') throw error;
    }
    ({ key, brief, base } = seeded);
  } else {
    const { data: item, error } = await db.from('lesson_items')
      .select('pub, key, brief, base_xp, lesson_sessions!inner(user_id, finished_at)')
      .eq('session_id', sessionId).eq('exercise_id', exerciseId).maybeSingle();
    if (error) throw error;
    if (!item || item.lesson_sessions?.user_id !== user) throw new HttpError(404, 'NOT_FOUND', 'Exercise not found');
    key = ExerciseKey.parse(item.key);
    pub = ExercisePublic.parse(item.pub);
    brief = item.brief;
    base = item.base_xp;
  }
  if (key.kind !== answer.kind) throw new HttpError(400, 'BAD_REQUEST', 'Answer does not match the exercise');

  const g = pub ? grade(pub, key, answer) : key.kind === 'mcq' && answer.kind === 'mcq' ? { correct: answer.choiceId === key.correct, revealId: key.correct } : { correct: false };
  const { data: rec, error: recError } = await db.rpc('record_lesson_answer', {
    p_user: user, p_session: sessionId, p_exercise: exerciseId, p_attempt: attemptId,
    p_correct: g.correct, p_base: answer.kind === 'pairs' ? Math.min(base, 5) : answer.kind === 'slider' ? Math.round((base * (g.stars ?? 3)) / 3) : base,
    p_stars: g.stars ?? null,
  });
  if (recError) throw recError;
  const res = SubmitResponse.parse({
    correct: Boolean(rec.correct),
    combo: rec.combo,
    multiplier: rec.multiplier,
    xpAwarded: rec.xp,
    revealId: 'revealId' in g ? g.revealId : undefined,
    stars: g.stars,
    dealBrief: brief,
    midasState: rec.multiplier === 5 || Boolean(rec.midas_day),
  });
  return json(req, 200, res);
}

/** Closes a session: the streak counts the day (player's local date), earned freezes apply. */
// deno-lint-ignore no-explicit-any
export async function finishLesson(req: Request, db: any, user: string, sessionId: unknown): Promise<Response> {
  if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sessionId)) throw new HttpError(400, 'BAD_REQUEST', 'sessionId is required');
  const { data, error } = await db.rpc('finish_lesson', { p_user: user, p_session: sessionId });
  if (error) throw error;
  return json(req, 200, data);
}
