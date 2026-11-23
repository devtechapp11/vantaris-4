// Mastery per skill, Elo-style: the learner and each difficulty level have a
// rating; a right answer against a hard item moves the rating more.

export const START = 1000;
const K = 24;

/** Rating of a difficulty level (1–5). */
export const itemRating = (difficulty: number) => 700 + 150 * Math.max(1, Math.min(5, difficulty));

export const expected = (rating: number, item: number) => 1 / (1 + 10 ** ((item - rating) / 400));

export function update(rating: number, difficulty: number, correct: boolean) {
  const delta = K * ((correct ? 1 : 0) - expected(rating, itemRating(difficulty)));
  return Math.round(Math.max(400, Math.min(2400, rating + delta)));
}

/** The difficulty whose success chance is closest to the target (flow: ~70%). */
export function pickDifficulty(rating: number, target = 0.7) {
  let best = 1;
  let gap = Infinity;
  for (let d = 1; d <= 5; d++) {
    const g = Math.abs(expected(rating, itemRating(d)) - target);
    if (g < gap) {
      gap = g;
      best = d;
    }
  }
  return best;
}

/** A readable band for the rating. */
export const band = (rating: number) => (rating >= 1450 ? 'Expert' : rating >= 1250 ? 'Fluent' : rating >= 1050 ? 'Solid' : rating >= 900 ? 'Building' : 'New');
