// Post-build guard for the production bundle (dist/). Fails the build when it
// finds a source map, something shaped like a secret, the preview backend, or
// leftover debug markers. Public values (Supabase anon key, Razorpay key id)
// are allowed: they are meant to be in the browser.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
try {
  walk(root);
} catch {
  console.error('check-dist: dist/ not found. Run vite build first.');
  process.exit(1);
}

const SECRET = [
  [/sb_secret_[A-Za-z0-9_-]{10,}/, 'Supabase secret key'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\b(?:ghp|gho|ghu|ghs)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}/, 'GitHub token'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}/, 'API secret key'],
  [/\brzp_(?:live|test)_[A-Za-z0-9]{14}[^A-Za-z0-9"'`]{0,3}[A-Za-z0-9]{24}\b/, 'Razorpay key secret next to key id'],
  [/whsec_[A-Za-z0-9]{20,}/, 'webhook secret'],
];
const FORBIDDEN = [
  [/\bdebugger\b\s*;/, 'debugger statement'],
  [/sourceMappingURL=/, 'source map reference'],
];

const problems = [];
for (const file of files) {
  const rel = relative(root, file);
  if (file.endsWith('.map')) {
    problems.push(`${rel}: source map in the bundle`);
    continue;
  }
  if (!/\.(js|mjs|css|html|json|txt|webmanifest|svg)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  for (const [re, what] of [...SECRET, ...FORBIDDEN]) if (re.test(text)) problems.push(`${rel}: ${what}`);
  // The preview backend must never be bundled (public/boot.js only reads its key).
  if (rel.startsWith('assets/') && /vantaris-preview-v1/.test(text)) problems.push(`${rel}: the preview backend (demo build leaked into production)`);
  // JWTs are fine only when they are the public anon key.
  for (const jwt of text.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? []) {
    try {
      const role = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role;
      if (role !== 'anon') problems.push(`${rel}: JWT with role "${role}"`);
    } catch {
      problems.push(`${rel}: unreadable JWT`);
    }
  }
}

if (problems.length) {
  console.error(`check-dist: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-dist: ${files.length} files clean (no source maps, no secrets, no preview code).`);
