// Renders public/og-image.png (1200×630) from the real mascot SVG and fonts,
// so the social preview always matches the product. Run: npm run og
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../', import.meta.url);
const icon = readFileSync(new URL('public/icon.svg', root), 'utf8')
  .replace('<rect width="512" height="512" rx="112" fill="#090A0B"/>', '');
// Inlined as data URLs: a page set from a string can't load file:// fonts.
const font = (path) => `data:font/woff2;base64,${readFileSync(new URL(path, root)).toString('base64')}`;
const serif = font('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2');
const inter = font('node_modules/@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2');
const html = `<html><head><style>
@font-face { font-family: 'OGSerif'; src: url('${serif}'); }
@font-face { font-family: 'Inter'; src: url('${inter}'); font-weight: 100 900; }
html, body { margin: 0; width: 1200px; height: 630px; background: #090A0B; color: #E7E8E5; font-family: Inter; overflow: hidden; }
.wrap { position: absolute; inset: 0; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
.mark { font-weight: 600; letter-spacing: .14em; font-size: 22px; background: linear-gradient(180deg,#E7E8E5,#B9BEC0 38%,#858D92 52%,#E7E8E5 64%,#B9BEC0); -webkit-background-clip: text; color: transparent; }
h1 { font-family: 'OGSerif'; font-weight: 400; font-size: 104px; line-height: .98; margin: 0; max-width: 640px;
  background: linear-gradient(180deg,#E7E8E5 0%,#B9BEC0 38%,#858D92 52%,#E7E8E5 64%,#B9BEC0 100%); -webkit-background-clip: text; color: transparent; }
p { margin: 0; color: #858D92; font-size: 24px; }
.rule { position: absolute; left: 80px; right: 80px; top: 130px; height: 1px; background: rgba(231,232,229,.09); }
.vale { position: absolute; right: 70px; top: 90px; width: 450px; height: 450px; }
.floor { position: absolute; right: 145px; bottom: 168px; width: 300px; height: 22px; border-radius: 50%; background: radial-gradient(closest-side, #000 40%, rgba(52,58,62,.35) 70%, transparent); }
</style></head><body><div class="rule"></div><div class="floor"></div><div class="vale">${icon.replace('<svg ', '<svg width="450" height="450" ')}</div>
<div class="wrap"><div class="mark">VANTARIS</div><div><h1>Don’t study finance. Do finance.</h1></div><p>Real DCF, LBO and M&amp;A deals · Analyst to MD</p></div></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: new URL('public/og-image.png', root).pathname });
await browser.close();
console.log('public/og-image.png written');
