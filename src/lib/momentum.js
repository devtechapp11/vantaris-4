// Session momentum, computed from the server's record so nothing can be gamed:
// me.combo is the run of correct answers since the last miss (public.combo_run),
// me.recent the last five answers, newest first.

/** Correct answers in a row. Prefers the server's full count; falls back to the last five. */
export function comboOf(me) {
  if (typeof me?.combo === 'number') return me.combo;
  let n = 0;
  for (const r of me?.recent ?? []) {
    if (!r.correct) break;
    n += 1;
  }
  return n;
}

/** XP multiplier for a run, as the server pays it: x2 from 3 in a row, x3 from 5, x5 from 10. */
export function multiplierFor(run) {
  if (run >= 10) return 5;
  if (run >= 5) return 3;
  if (run >= 3) return 2;
  return 1;
}

/** Correct answers still needed for the next multiplier (null at the top). */
export function nextMultiplier(run) {
  const steps = [[3, 2], [5, 3], [10, 5]];
  const next = steps.find(([at]) => run < at);
  return next ? { in: next[0] - run, x: next[1] } : null;
}

/** "Bull Run": three or more in a row. */
export const isFever = (run) => run >= 3;

const sameDay = (iso) => iso && new Date(iso).toDateString() === new Date().toDateString();

/** Deals answered today (device's local day). */
export function closedToday(recent = []) {
  return recent.filter((r) => sameDay(r.submitted_at)).length;
}

/** Today's target: three deals, or fewer when the free weekly allowance can't cover it. */
export function dailyGoal(me) {
  const done = closedToday(me?.recent);
  const remaining = me?.quota?.limit != null ? me.quota.remaining ?? 0 : Infinity;
  return Math.max(1, Math.min(3, done + remaining));
}

/** Today's numbers for the closing memo. */
export function sessionStats(me) {
  const today = (me?.recent ?? []).filter((r) => sameDay(r.submitted_at));
  const right = today.filter((r) => r.correct);
  const timed = right.filter((r) => typeof r.time_ratio === 'number');
  return {
    deals: today.length,
    xp: today.reduce((s, r) => s + (r.points ?? 0), 0),
    accuracy: today.length ? Math.round((right.length / today.length) * 100) : 0,
    // Share of the clock left when you committed, on correct answers
    speed: timed.length ? Math.round((timed.reduce((s, r) => s + r.time_ratio, 0) / timed.length) * 100) : null,
  };
}
