import { comboOf } from '../lib/sfx/engine';

// Session XP, shown live during a lesson. The server recomputes it from the
// graded answers (supabase/functions/submit-answer); these numbers must match.
export const XP_FIRST_TRY = 10;
export const XP_RETRY = 5;
export const XP_STREAK_BONUS = 25; // once, at 5 correct in a row
export const XP_SESSION_CAP = 400;

/** XP for one correct answer, given the run including it. */
export function xpForAnswer(run: number, retry: boolean) {
  return (retry ? XP_RETRY : XP_FIRST_TRY) * comboOf(run);
}
