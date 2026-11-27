import { api } from '../api';
import { IS_DEMO } from '../config';
import { buildLesson, comboAfter, grade, type Built } from './lesson';
import type { Answer, ExercisePublic, SubmitResponse } from './schema';

/*
  The lesson loop's backend. With VITE_LESSON_SERVER=1 (once the V4 migration
  and functions are deployed) every answer is graded by submit-answer and XP
  is credited per answer. Otherwise the lesson is built and graded on this
  device from the same engine, and XP is credited once at the end by the
  existing credit_lesson_xp (10 per right answer): the screen only ever
  shows what will really be credited.
*/
const SERVER = !IS_DEMO && import.meta.env.VITE_LESSON_SERVER === '1';

export type LessonStart = { sessionId: string; items: ExercisePublic[]; server: boolean; midasDay: boolean };

const local = new Map<string, { skill: string; items: Built[]; run: number; answered: Map<string, SubmitResponse>; right: number; best: number }>();

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
export const newAttemptId = uuid;

type Api = {
  startLesson?: (skill: string, difficulty?: number) => Promise<{ sessionId: string; items: ExercisePublic[]; midasDay?: boolean } | null>;
  submitLessonAnswer?: (req: unknown) => Promise<SubmitResponse>;
  finishLesson?: (id: string) => Promise<{ streak?: number } | null>;
  saveLesson: (o: { node: string; stars: number; firstTry: number; missed: string[]; cleared: string[] }) => Promise<unknown>;
  creditLesson: (o: { node: string; correct: number; bestRun: number }) => Promise<{ credited?: number } | null>;
};
const a = api as unknown as Api;

export async function startLesson(skill: string, difficulty = 2): Promise<LessonStart> {
  if (SERVER) {
    const res = await a.startLesson?.(skill, difficulty);
    if (res?.sessionId) return { sessionId: res.sessionId, items: res.items, server: true, midasDay: Boolean(res.midasDay) };
  }
  const sessionId = uuid();
  const items = buildLesson(skill, Math.floor(Math.random() * 2 ** 31), difficulty);
  local.set(sessionId, { skill, items, run: 0, answered: new Map(), right: 0, best: 0 });
  return { sessionId, items: items.map((b) => b.pub), server: false, midasDay: false };
}

/** Grades one answer. Same attemptId → same result (a double tap never counts twice). */
export async function submit(start: LessonStart, exerciseId: string, answer: Answer, attemptId: string): Promise<SubmitResponse> {
  if (start.server) return (await a.submitLessonAnswer!({ sessionId: start.sessionId, exerciseId, answer, attemptId })) as SubmitResponse;
  const s = local.get(start.sessionId);
  const b = s?.items.find((i) => i.pub.id === exerciseId);
  if (!s || !b) throw new Error('Unknown exercise');
  const done = s.answered.get(attemptId) ?? s.answered.get(exerciseId);
  if (done) return done;
  const g = grade(b.pub, b.key, answer);
  const { combo, multiplier } = comboAfter(s.run, g.correct);
  s.run = combo;
  s.best = Math.max(s.best, combo);
  if (g.correct) s.right += 1;
  const res: SubmitResponse = {
    correct: g.correct,
    combo,
    multiplier,
    xpAwarded: g.correct ? 10 : 0,
    revealId: g.revealId,
    stars: g.stars,
    dealBrief: b.brief,
    midasState: multiplier === 5,
  };
  s.answered.set(attemptId, res);
  s.answered.set(exerciseId, res);
  return res;
}

/** Ends the lesson; returns the XP really credited for it. */
export async function finish(start: LessonStart, skill: string, stars: number, firstTry: number, totalXp: number): Promise<number> {
  if (start.server) {
    await a.finishLesson?.(start.sessionId).catch(() => null);
    return totalXp;
  }
  const s = local.get(start.sessionId);
  local.delete(start.sessionId);
  try {
    await a.saveLesson({ node: skill, stars, firstTry, missed: [], cleared: [] });
    const r = await a.creditLesson({ node: skill, correct: s?.right ?? 0, bestRun: s?.best ?? 0 });
    return r?.credited ?? 0;
  } catch {
    return 0;
  }
}
