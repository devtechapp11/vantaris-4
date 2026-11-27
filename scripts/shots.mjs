// Visual QA captures: node scripts/shots.mjs <phase> [baseUrl]
// Serve a QA build first: npm run build:qa && npx vite preview --outDir dist-qa --port 4180
// SHOT_ROUTES=/dev/vale,/start,/app (comma-separated). Signed-in routes use the
// preview backend with a seeded local account (no server, nothing leaves the page).
// Output: design/qa/<phase>/ (git-ignored). Exits 1 on any page or console error.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const phase = process.argv[2] ?? 'manual';
const base = (process.argv[3] ?? 'http://localhost:4180').replace(/\/$/, '');
const ROUTES = (process.env.SHOT_ROUTES ?? '/,/start,/app,/dev/vale').split(',').filter(Boolean);
const VIEWPORTS = (process.env.SHOT_VIEWPORTS ?? '375,768,1440').split(',').map((w) => ({
  375: { name: '375', width: 375, height: 812, isMobile: true, hasTouch: true },
  768: { name: '768', width: 768, height: 1024, isMobile: true, hasTouch: true },
  1440: { name: '1440', width: 1440, height: 900, isMobile: false, hasTouch: false },
})[w]);
const MOTION = (process.env.SHOT_MOTION ?? 'no-preference,reduce').split(',');
const WAIT = Number(process.env.SHOT_WAIT ?? 2600);
// Screens that need a signed-in, onboarded player.
const SIGNED_IN = /^\/(app|learn|blitz|practice|ranking|profile|plans)/;

const seed = () => {
  const now = new Date().toISOString();
  localStorage.setItem('vantaris-preview-v1', JSON.stringify({
    account: { email: 'qa@preview.local', password: 'qa-preview', display_name: 'Dev' }, signedIn: true,
    profile: { display_name: 'Dev', school: null, goal: null, onboarded: true, points: 120, solved: 4, attempted: 5, streak: 2, streak_best: 3, last_active_on: null, created_at: now },
    attempts: {}, ledger: [], sub: null, tutor: { date: null, used: 0 }, path: {}, review: {}, blitz: { best: 0, runs: 0 },
  }));
};
const consent = () => localStorage.setItem('vantaris-consent-v1', JSON.stringify({ analytics: false, decidedAt: new Date().toISOString() }));

const outDir = `design/qa/${phase}`;
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const failures = [];

for (const vp of VIEWPORTS) {
  for (const reducedMotion of MOTION) {
    for (const route of ROUTES) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: vp.isMobile, hasTouch: vp.hasTouch, reducedMotion });
      await ctx.addInitScript(consent);
      if (SIGNED_IN.test(route)) await ctx.addInitScript(seed);
      const page = await ctx.newPage();
      const tag = `${route} ${vp.name} ${reducedMotion}`;
      page.on('pageerror', (e) => failures.push(`${tag}: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' && !/ERR_NAME_NOT_RESOLVED|favicon/.test(m.text())) failures.push(`${tag} console: ${m.text()}`);
      });
      await page.goto(base + route, { waitUntil: 'networkidle' }).catch((e) => failures.push(`${tag}: ${e.message}`));
      await page.waitForTimeout(WAIT);
      const slug = route === '/' ? 'home' : route.replace(/\//g, '_').replace(/^_/, '');
      const full = route !== '/' && !route.startsWith('/dev/');
      await page.screenshot({ path: `${outDir}/${slug}-${vp.name}-${reducedMotion}.png`, fullPage: full }).catch(() =>
        page.screenshot({ path: `${outDir}/${slug}-${vp.name}-${reducedMotion}.png` }));
      // Horizontal overflow is a layout bug at every width.
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth).catch(() => 0);
      if (over > 1) failures.push(`${tag}: horizontal overflow ${over}px`);
      await ctx.close();
    }
  }
}
await browser.close();

if (failures.length) {
  console.error(`✗ ${failures.length} problem(s):\n` + failures.join('\n'));
  process.exit(1);
}
console.log(`✓ captures in ${outDir}`);
