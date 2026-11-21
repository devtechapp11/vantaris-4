// Session momentum computed from the server's record (me.recent is the last
// five submitted answers, newest first), so nothing here can be gamed or drift.

/** Correct answers in a row, counting back from the latest one (0–5). */
export function comboOf(recent = []) {
  let n = 0;
  for (const r of recent) {
    if (!r.correct) break;
    n += 1;
  }
  return n;
}

/** Display tier for a run: ×2 from two in a row, ×3 from three, ×5 from five. */
export function comboTier(n) {
  if (n >= 5) return 5;
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 0;
}

/** Deals answered today (device's local day). */
export function closedToday(recent = []) {
  const today = new Date().toDateString();
  return recent.filter((r) => r.submitted_at && new Date(r.submitted_at).toDateString() === today).length;
}

/** Today's target: three deals, or fewer when the free weekly allowance can't cover it. */
export function dailyGoal(me) {
  const done = closedToday(me?.recent);
  const remaining = me?.quota?.limit != null ? me.quota.remaining ?? 0 : Infinity;
  return Math.max(1, Math.min(3, done + remaining));
}
