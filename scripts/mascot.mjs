// Turns the Higgsfield hero loop into web-ready files (see docs/higgsfield-prompts.md).
//
//   1. Put the export at mascot-src/hero-loop.mp4 (or .mov / .webm / .m4v)
//   2. npm run mascot
//
// Writes public/mascot/hero-loop.webm (VP9), hero-loop.mp4 (H.264) and
// hero-loop.webp (poster), 1280px wide, 30 fps, no audio, and fails if either
// video is over the 2.5 MB budget. Needs ffmpeg (brew install ffmpeg).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = `${root}public/mascot/`;
const BUDGET = 2.5 * 1024 * 1024;
const VF = 'scale=1280:-2:flags=lanczos,fps=30,format=yuv420p';

const src = ['.mp4', '.mov', '.webm', '.m4v'].map((e) => `${root}mascot-src/hero-loop${e}`).find(existsSync);
if (!src) {
  console.error('No mascot-src/hero-loop.(mp4|mov|webm|m4v) found. See docs/higgsfield-prompts.md, batch 4.');
  process.exit(1);
}
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('ffmpeg is not installed (brew install ffmpeg / apt install ffmpeg).');
  process.exit(1);
}
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

mkdirSync(out, { recursive: true });
ff(['-i', src, '-an', '-vf', VF, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', `${out}hero-loop.webm`]);
ff(['-i', src, '-an', '-vf', VF, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', `${out}hero-loop.mp4`]);
ff(['-i', src, '-vframes', '1', '-vf', 'scale=1280:-2', '-q:v', '80', `${out}hero-loop.webp`]);

let over = false;
for (const f of ['hero-loop.webm', 'hero-loop.mp4']) {
  const size = statSync(`${out}${f}`).size;
  console.log(`${f}: ${(size / 1024 / 1024).toFixed(2)} MB`);
  if (size > BUDGET) over = true;
}
if (over) {
  console.error('Over the 2.5 MB budget: raise -crf or shorten the clip.');
  process.exit(1);
}
console.log('Done. Set HERO_LOOP = true in src/content/landing.js to use it in the hero.');
