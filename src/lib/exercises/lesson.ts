import { makeExercise, templatesFor, TEMPLATE_IDS, type Exercise } from '../finance/templates.ts';
import { ExerciseKey, ExercisePublic, multiplierFor, sliderStars, type Answer, type Multiplier } from './schema.ts';

/*
  Lessons of five built by the deterministic finance engine: the numbers and
  the keys always come from the engine, so a key can be recomputed on the
  server from (template, seed). Shared with the Edge Functions (sync-shared).
*/

export type Built = {
  pub: ExercisePublic;
  key: ExerciseKey;
  brief: { title: string; takeaway: string };
  base: number;
  /** The engine exercise behind it, so the server can re-tell (and re-check) it. */
  src: { template: string; seed: number; difficulty: number };
};

const LETTERS = ['a', 'b', 'c', 'd'];
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1)}…`);
const briefOf = (ex: Exercise) => ({ title: clip(ex.brief.formula ?? ex.template, 60), takeaway: clip(ex.brief.rule, 220) });
const srcOf = (ex: Exercise & { seed?: number }) => ({ template: ex.template, seed: ex.seed ?? 0, difficulty: ex.difficulty });

export function mcq(ex: Exercise, id: string): Built {
  return {
    pub: { kind: 'mcq', id, prompt: clip(`${ex.prompt} ${ex.question}`, 400), choices: ex.options.map((label, i) => ({ id: LETTERS[i], label: clip(label, 80) })) },
    key: { kind: 'mcq', correct: LETTERS[ex.answerIndex] },
    brief: briefOf(ex),
    base: 10,
    src: srcOf(ex),
  };
}

/** The unit an answer is shown in, from the right option's text. */
function unitOf(ex: Exercise): 'x' | '%' | 'M' | null {
  const s = ex.options[ex.answerIndex];
  if (/x$/.test(s)) return 'x';
  if (/%$/.test(s)) return '%';
  if (/M$/.test(s)) return 'M';
  return null;
}

/** A valuation slider on the same deal: the target is the engine's exact answer. */
export function slider(ex: Exercise, id: string, pick: (n: number) => number = () => 0): Built | null {
  const unit = unitOf(ex);
  if (!unit || !Number.isFinite(ex.answer) || ex.answer === 0) return null;
  const v = unit === '%' ? ex.answer * 100 : ex.answer;
  const mag = Math.abs(v);
  const step = unit === 'x' ? 0.1 : unit === '%' ? 0.1 : mag >= 1000 ? 10 : mag >= 100 ? 1 : 0.5;
  // An off-centre range: the middle of the track must never be the answer.
  const near = 0.25 + pick(30) / 100;
  const far = near + 0.3 + pick(30) / 100;
  const [below, above] = pick(2) ? [near, far] : [far, near];
  const lo = Math.floor((v - mag * below) / step) * step;
  const hi = Math.ceil((v + mag * above) / step) * step;
  return {
    pub: { kind: 'slider', id, prompt: clip(`${ex.prompt} ${ex.question} Set your estimate.`, 400), min: +lo.toFixed(4), max: +hi.toFixed(4), step, unit },
    key: { kind: 'slider', target: +v.toFixed(6), tolerance: 0.1 },
    brief: briefOf(ex),
    base: 10,
    src: srcOf(ex),
  };
}

const DECOYS = ['+', '−', '×', '÷', 'debt', 'cash', 'tax', 'growth', 'shares'];

/** Rebuild a deal's formula from its blocks (plus two decoys). */
export function formula(ex: Exercise, id: string, pick: (n: number) => number): Built | null {
  const f = ex.brief.formula?.trim();
  if (!f) return null;
  // A bracketed group is one block; subscripts become plain digits (no glyph in the fonts).
  const SUB: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  const parts = (f.replace(/[₀-₉]/g, (c) => SUB[c] ?? c).match(/\([^)]*\)|\S+/g) ?? []).filter(Boolean);
  if (parts.length < 3 || parts.length > 7 || parts.some((p) => p.length > 24)) return null;
  const blocks = parts.map((label, i) => ({ id: `t${i}`, label }));
  const pool = DECOYS.filter((d) => !parts.includes(d));
  const decoys = [0, 1].map((k) => ({ id: `d${k}`, label: pool.splice(pick(pool.length), 1)[0] ?? `n${k}` }));
  const tokens = [...blocks, ...decoys];
  // A stable shuffle: tokens never come in the answer's order.
  for (let i = tokens.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
  }
  return {
    pub: { kind: 'formula', id, prompt: clip(`Build the formula: ${ex.brief.rule}`, 400), tokens, slots: parts.length },
    key: { kind: 'formula', accepted: [blocks.map((b) => b.id)] },
    brief: briefOf(ex),
    base: 12,
    src: srcOf(ex),
  };
}

/** A tiny deterministic generator, so a lesson rebuilds identically from its seed. */
export function picker(seed: number) {
  let s = seed >>> 0 || 1;
  return (n: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return n <= 0 ? 0 : s % n;
  };
}

/**
 * Five exercises for a skill: three multiple choice, one formula build and
 * one valuation slider when the engine allows (always at least one non-MCQ).
 */
export function buildLesson(skill: string, seed: number, difficulty = 2): Built[] {
  const pick = picker(seed);
  const own = templatesFor(skill);
  const pool = own.length ? own : TEMPLATE_IDS;
  const ex = (i: number) => {
    const s = (seed + i * 7919) >>> 0;
    return { ...makeExercise(pool[pick(pool.length)], s, difficulty), seed: s };
  };
  const out: Built[] = [];
  const nonMcq = () => {
    for (let k = 0; k < 12; k++) {
      const e = ex(100 + k);
      const b = k % 2 ? slider(e, `x${out.length + 1}`, pick) : formula(e, `x${out.length + 1}`, pick);
      if (b) return b;
    }
    return null;
  };
  out.push(mcq(ex(1), 'x1'));
  const f = nonMcq();
  if (f) out.push(f);
  out.push(mcq(ex(2), `x${out.length + 1}`));
  for (let k = 0; k < 12 && out.length < 4; k++) {
    const s = slider(ex(200 + k), `x${out.length + 1}`, pick);
    if (s) out.push(s);
  }
  while (out.length < 5) out.push(mcq(ex(300 + out.length), `x${out.length + 1}`));
  // Every item must pass the shared contract.
  return out.map((b) => ({ ...b, pub: ExercisePublic.parse(b.pub), key: ExerciseKey.parse(b.key) }));
}

/** Grades one answer against its key. Pairs: right unless too fast (a script) or too many mistakes. */
export function grade(pub: ExercisePublic, key: ExerciseKey, a: Answer): { correct: boolean; stars?: number; revealId?: string } {
  if (key.kind === 'mcq' && a.kind === 'mcq') return { correct: a.choiceId === key.correct, revealId: key.correct };
  if (key.kind === 'formula' && a.kind === 'formula') {
    const allowed = pub.kind === 'formula' ? new Set(pub.tokens.map((t) => t.id)) : new Set<string>();
    if (!a.sequence.every((id) => allowed.has(id))) return { correct: false };
    return { correct: key.accepted.some((seq) => seq.length === a.sequence.length && seq.every((id, i) => id === a.sequence[i])) };
  }
  if (key.kind === 'slider' && a.kind === 'slider') {
    const stars = sliderStars(a.value, key.target, key.tolerance);
    return { correct: stars > 0, stars };
  }
  if (key.kind === 'pairs' && a.kind === 'pairs') return { correct: a.ms >= key.minMs && a.mistakes <= 2 };
  return { correct: false };
}

/** XP for one answer: base × multiplier; pairs capped; slider scaled by stars. */
export function xpFor(b: Pick<Built, 'base' | 'pub'>, correct: boolean, mult: Multiplier, stars?: number) {
  if (!correct) return 0;
  const base = b.pub.kind === 'pairs' ? Math.min(b.base, 5) : b.pub.kind === 'slider' ? Math.round((b.base * (stars ?? 3)) / 3) : b.base;
  return base * mult;
}

/** The run after this answer, and its multiplier. */
export function comboAfter(run: number, correct: boolean) {
  const combo = correct ? run + 1 : 0;
  return { combo, multiplier: multiplierFor(combo) };
}

/** Streak milestones that light the Midas State on the day's first lesson. */
export const MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365];
export const isMilestone = (streak: number) => MILESTONES.includes(streak) || (streak > 365 && streak % 100 === 0);
