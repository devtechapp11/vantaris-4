// Turns Vale's Higgsfield exports into web-ready loops and wires them up.
//
//   1. Put one clip per mood in mascot-src/, named after the mood:
//        mascot-src/welcome.mp4, think.mp4, correct.mp4, wrong.mp4,
//        streak.mp4, levelup.mp4, idle.mp4   (.mp4, .mov, .webm or .m4v)
//   2. npm run mascot
//
// For each clip this writes public/mascot/<mood>.webm (VP9), .mp4 (H.264) and
// .webp (poster frame), square-cropped to 720×720 at 30 fps with no audio, then
// rewrites src/mascot/manifest.js. Moods without a clip keep the animated SVG Vale.
// Needs ffmpeg on your PATH (brew install ffmpeg / apt install ffmpeg).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MOODS = ['welcome', 'think', 'correct', 'wrong', 'streak', 'levelup', 'idle'];
const EXT = ['.mp4', '.mov', '.webm', '.m4v'];
const root = fileURLToPath(new URL('../', import.meta.url));
const src = `${root}mascot-src/`;
const out = `${root}public/mascot/`;
const SIZE = 720;
const VF = `crop='min(iw,ih)':'min(iw,ih)',scale=${SIZE}:${SIZE}:flags=lanczos,fps=30,format=yuv420p`;

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
}

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('ffmpeg was not found. Install it (brew install ffmpeg, or apt install ffmpeg) and run again.');
  process.exit(1);
}
if (!existsSync(src)) {
  mkdirSync(src, { recursive: true });
  console.log(`Created ${src}. Put the Higgsfield clips there (welcome.mp4, think.mp4, …) and run again.`);
  process.exit(0);
}
mkdirSync(out, { recursive: true });

const files = readdirSync(src);
const done = {};
for (const mood of MOODS) {
  const file = files.find((f) => EXT.some((e) => f.toLowerCase() === `${mood}${e}`));
  if (!file) continue;
  const input = `${src}${file}`;
  process.stdout.write(`${mood}: `);
  ffmpeg(['-i', input, '-an', '-vf', VF, '-c:v', 'libx264', '-profile:v', 'high', '-crf', '24', '-movflags', '+faststart', `${out}${mood}.mp4`]);
  ffmpeg(['-i', input, '-an', '-vf', VF, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', `${out}${mood}.webm`]);
  ffmpeg(['-i', `${out}${mood}.mp4`, '-frames:v', '1', '-vf', 'scale=360:360', '-c:v', 'libwebp', '-quality', '80', `${out}${mood}.webp`]);
  const kb = (f) => Math.round(statSync(`${out}${mood}.${f}`).size / 1024);
  console.log(`webm ${kb('webm')} KB · mp4 ${kb('mp4')} KB · poster ${kb('webp')} KB`);
  if (kb('mp4') > 1536) console.log(`  ${mood}.mp4 is over 1.5 MB; consider a shorter clip.`);
  done[mood] = true;
}

const entry = (m) => (done[m]
  ? `{ webm: \`\${BASE}mascot/${m}.webm\`, mp4: \`\${BASE}mascot/${m}.mp4\`, poster: \`\${BASE}mascot/${m}.webp\`, loop: true }`
  : 'null');

writeFileSync(`${root}src/mascot/manifest.js`, `// Vale's video clips (Higgsfield). \`npm run mascot\` converts the source clips
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
${MOODS.map((m) => `  ${m}: ${entry(m)},`).join('\n')}
};

// Moods that play once and then fall back to \`idle\` (all of Vale's clips loop by default).
export const ONE_SHOT = new Set([]);
`);

const n = Object.keys(done).length;
console.log(n ? `\nUpdated src/mascot/manifest.js with ${n} clip${n === 1 ? '' : 's'}.` : `\nNo clips found in ${src}. Expected names: ${MOODS.map((m) => `${m}.mp4`).join(', ')}`);
