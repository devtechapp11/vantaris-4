// Palette guard: fails the build when a colour outside the « Obsidian Platinum »
// palette appears in src/. Hex, rgb()/rgba() and hsl()/hsla() literals are
// checked; CSS variables and color-mix() of variables are always fine.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.frag', '.vert', '.glsl']);

const ALLOWED = [
  // surfaces
  '05070B', '0A0D13', '12161D', '1C222B', '2A3039', '5B6470', '9AA3AE',
  // metals and text
  'C9CED6', 'E6E9EE', 'F8FAFC',
  // cold reflections (never flat, ≤ 12%)
  '8FA3B8', '3B4A5C',
  // right / wrong answers only, always with an icon
  '7FB89A', 'C98A8A',
  // brushed and chrome gradient stops, engraved text, smoked glass
  'B9BFC8', '8E96A1', 'D5D9DF', '7C848F', 'A9B0BA', '4A515B', '1A1F27',
  // pure black and white
  '000000', 'FFFFFF',
];
const allowed = new Set(ALLOWED);
const rgbAllowed = new Set(ALLOWED.map((h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')));

const HEX = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const RGB = /rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/g;
const HSL = /hsla?\(/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.has(extname(p))) out.push(p);
  }
  return out;
}

const norm = (h) => {
  const v = h.length <= 4 ? h.slice(0, 3).split('').map((c) => c + c).join('') : h.slice(0, 6);
  return v.toUpperCase();
};

const problems = [];
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const at = `${relative(process.cwd(), file)}:${i + 1}`;
    for (const m of line.matchAll(HEX)) if (!allowed.has(norm(m[1]))) problems.push(`${at}  ${m[0]}`);
    for (const m of line.matchAll(RGB)) if (!rgbAllowed.has(`${+m[1]},${+m[2]},${+m[3]}`)) problems.push(`${at}  ${m[0]}…)`);
    for (const m of line.matchAll(HSL)) problems.push(`${at}  ${m[0]}…)`);
  });
}

if (problems.length) {
  console.error(`check-palette: ${problems.length} colour(s) outside the Obsidian Platinum palette:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('check-palette: every colour is on palette.');
