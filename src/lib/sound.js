// The older sound API, kept for existing call sites. Every sound now comes
// from the FM engine (src/lib/sfx/engine.ts), so there is one audio context.
import { comboOf, sfx } from './sfx/engine';

export const sound = {
  /** Felt click for taps and presses. */
  tap: () => sfx.press(),
  /** Barely there: slider steps, hover on primary controls. */
  hover: () => sfx.tick(),
  /** Correct answer; `run` is the answers in a row (pitch climbs with the combo tier). */
  correct: (run = 1) => sfx.correct(comboOf(run)),
  /** A multiplier step (x2, x3, x5). */
  fever: (x = 2) => sfx.comboUp(x >= 5 ? 5 : x >= 3 ? 3 : 2),
  wrong: () => sfx.wrong(),
  combo: (level = 2) => sfx.comboUp(level >= 5 ? 5 : level >= 3 ? 3 : 2),
  /** Struck platinum: `k` 1–3 for each star in turn. */
  impact: (k = 1) => sfx.starImpact(Math.max(0, Math.min(2, Math.round(k) - 1))),
  rankUp: () => sfx.promotion(),
};
