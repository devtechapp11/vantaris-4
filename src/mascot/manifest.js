// Mascot clips from Higgsfield. Drop the files into public/mascot/ and fill in
// the paths below; every screen picks them up automatically. Leave a mood as
// null and the app shows the built-in placeholder for it.
//
// Export specs (see src/mascot/README.md):
//   square 1:1, 720×720, 24–30 fps, 2–4 s, seamless loop for idle/think
//   webm (VP9) + mp4 (H.264) for each mood, under ~1.5 MB each
//   plus a poster .webp (first frame) for instant display and reduced motion
//
// Moods and where they appear:
//   idle       Home header, Practice empty states
//   wave       Welcome screen
//   think      Tutor, paywall, locked problems
//   cheer      Correct answer (plays once, then returns to idle)
//   sad        Wrong answer (plays once)
//   celebrate  Payment confirmed, level up (plays once)
export const MASCOT = {
  idle: null,
  wave: null,
  think: null,
  cheer: null,
  sad: null,
  celebrate: null,
};

// Example once the files exist:
// idle: { webm: '/mascot/idle.webm', mp4: '/mascot/idle.mp4', poster: '/mascot/idle.webp', loop: true },
// cheer: { webm: '/mascot/cheer.webm', mp4: '/mascot/cheer.mp4', poster: '/mascot/cheer.webp', loop: false },

// Moods that should play once and then fall back to `idle`.
export const ONE_SHOT = new Set(['cheer', 'sad', 'celebrate', 'wave']);
