// Palette guard: fails the build when a colour outside the « Prism Chrome »
// palette appears in src/. Hex, rgb()/rgba() and hsl()/hsla() literals are
// checked; CSS variables and color-mix() of variables are always fine.
// The four prism hues (the dispersion of light) may only be written in
// src/styles/tokens.css: everywhere else they are used through var(--prism-*).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.frag', '.vert', '.glsl']);

const ALLOWED = [
  // void and steel
  '05070B', '0A0D13', '12161D', '1C222B', '2A3039', '5B6470', '9AA3AE',
  // chrome
  'FFFFFF', 'F8FAFC', 'E6E9EE', 'C9CED6', '8A929D', '7C848F',
  // right / wrong answers only, always with an icon
  '7FB89A', 'C98A8A',
  // pure black
  '000000',
];
// Prism: edges and reflections only, and only declared in tokens.css.
const PRISM = ['A8E6F0', 'C7BEFF', 'FFD8C7', 'D9F7E0'];
const TOKENS = 'styles/tokens.css';
const allowed = new Set(ALLOWED);
const prism = new Set(PRISM);
const triplet = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
const rgbAllowed = new Set(ALLOWED.map(triplet));
const rgbPrism = new Set(PRISM.map(triplet));

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
  const inTokens = relative(ROOT, file).split('\\').join('/') === TOKENS;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const at = `${relative(process.cwd(), file)}:${i + 1}`;
    for (const m of line.matchAll(HEX)) {
      const h = norm(m[1]);
      if (allowed.has(h) || (inTokens && prism.has(h))) continue;
      problems.push(`${at}  ${m[0]}${prism.has(h) ? '  (prism: use var(--prism-*) outside tokens.css)' : ''}`);
    }
    for (const m of line.matchAll(RGB)) {
      const t = `${+m[1]},${+m[2]},${+m[3]}`;
      if (rgbAllowed.has(t) || (inTokens && rgbPrism.has(t))) continue;
      problems.push(`${at}  ${m[0]}…)`);
    }
    for (const m of line.matchAll(HSL)) problems.push(`${at}  ${m[0]}…)`);
  });
}

if (problems.length) {
  console.error(`check-palette: ${problems.length} colour(s) outside the Prism Chrome palette:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('check-palette: every colour is on palette.');
