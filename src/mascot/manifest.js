// Vale's video clips (Higgsfield). `npm run mascot` converts the source clips
// in mascot-src/ and rewrites this file, so you normally never edit it by hand.
// A mood left as null shows the built-in animated SVG Vale instead, and so do
// small sizes (under 64px) and people who turn on "Reduce motion".
//
// Export specs (see src/mascot/README.md):
//   square 1:1, 720×720, 24–30 fps, 2–4 s, seamless loop (first frame = last frame)
//   background #0A0F1E (the app's navy) so the feathered edge disappears
//
// Moods and where they appear:
//   welcome   Landing hero, sign-in, onboarding step 1
//   think     Hint button, tutor while it types, paywall, locked problems
//   correct   Correct answer
//   wrong     Wrong answer ("Even senior analysts miss this one")
//   streak    Home when the streak is 3 days or more
//   levelup   Promotion to a new tier, payment confirmed
//   idle      Home header, empty states, tutor at rest
const BASE = import.meta.env.BASE_URL;

export const MASCOT = {
  welcome: null,
  think: null,
  correct: null,
  wrong: null,
  streak: null,
  levelup: null,
  idle: null,
};

// Moods that play once and then fall back to `idle` (all of Vale's clips loop by default).
export const ONE_SHOT = new Set([]);
