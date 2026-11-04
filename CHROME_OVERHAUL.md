# Chrome overhaul — report (branch `design/chrome-overhaul`)

Visual and experiential pass only. No change to the database schema, auth logic,
payment logic, API keys or backend code. No secrets in front-end code. Not merged.

## Phase 0: what was there

1. **Stack:** React 19 + Vite 8, react-router 7, Motion 12, Supabase (auth, Postgres,
   edge functions), Razorpay subscriptions, Gemini tutor (server-side), three.js + R3F
   in a lazy chunk, Lucide icons, PWA manifest. A demo build swaps the backend module.
2. **Tokens:** `src/styles/tokens.css` (CSS variables, single source), motion values
   mirrored in `src/design/tokens.js`; canvas/WebGL read colours with `cssVar()`.
3. **Animation:** Motion variants in `src/design/motion.js`; route transitions via
   `AnimatePresence` in `App.jsx` (kept as they were); CSS keyframes in
   `components.css`; 3D scenes in `src/components/three/`.
4. **Navigation:** signed-out `/welcome`, `/signin|/signup|/forgot`; onboarding; app tabs
   Home · Practice · Ranking · Profile (sidebar on desktop) plus `/practice/:id`, `/plans`.
5. **Home:** greeting, quota card, 4 stat tiles, continue card, daily card, tier card,
   8-module grid, activity chart, recent deals (18 controls, ~30 figures, 2,941 px tall).
6. **Problem / Solution:** stepper, timer, 4 chips, terms → calculator, options, hint,
   submit; result card, then steps and formula **open by default**.
7. **Rank / Profile / Pricing / Auth / Onboarding:** podium + list; profile with emblem,
   6 stats, 3D trophy shelf, radar, member card, plan, settings; 3 plan cards + compare
   table; sign-up with 3 fields and **no consent box**; onboarding with a required name
   and a required goal.
8. **Public pages:** only the landing page. No legal pages, no 404 (unknown URLs
   redirected), no sitemap, OG image was the app icon.

## Before → after (390 px phone, demo data)

| Screen | Before | After |
|---|---|---|
| Home | 18 controls · 4 stat tiles + ~26 other figures · 235 words · 2,941 px · gold CTA + several gold accents | 11 controls (8 are path steps) · **3 stats** · 69 words · 1,184 px · **1 primary** |
| Problem | 10 controls · 4 chips · calculator open on desktop | 11 controls · one meta line · calculator collapsed · 1 primary (Submit) |
| Solution | 12 controls · steps + formula open · 165 words · 1,968 px | 12 controls · result first, details collapsed · 109 words · 1,586 px |
| Rank | 3 controls · gold/silver/bronze podium | 4 controls · flat podium, list with hairlines |
| Profile | 17 controls · 6 stats · 3,292 px · settings mixed in | Progress / Settings switch · 3 stats · 2,336 px (Progress) · settings only here |
| Sign-up | 3 fields, no consent | 3 fields + unticked Terms/Privacy consent, inline validation, honeypot |
| Onboarding | 3 steps, name and goal required | ≤ 3 questions, all skippable, “Your school” placeholder |
| Pricing | 2 emphasised elements (gold flag + rotating border) | 1 primary (Pro), flat columns |
| Tabs | Home · Practice · Ranking · Profile | Home · **Deals** · **Rank** · Profile (4, ≥ 44 px) |

## Quality

| | Landing (mobile) | Landing (desktop) | App Home (mobile) | App Home (desktop) |
|---|---|---|---|---|
| Performance | 92 | 99–100 | 100 | 100 |
| Accessibility | 100 | 100 | 100 | 100 |
| Best practices | 96* | 96–100* | 100 | 100 |
| SEO | 100 | 100 | 100 | 100 |

\*Production build measured against a placeholder Supabase URL, so its failed requests
log console errors; 100 on the preview build.
Landing mobile: observed LCP ~0.2 s (simulated slow 4G 3.3 s), CLS 0, TBT 20–60 ms.
INP: worst interaction 88 ms at 4× CPU slowdown. No console errors at 360/390/768/1440.
No horizontal scroll at 360 px. Link crawl: 13 internal pages, 0 broken.

## Bundle

JS total +6.8 KB gzip (518 → 525 KB across all chunks), CSS −9.3 KB gzip (29.6 → 20.3).
Added: Lenis 4.7 KB (website only, not on touch), 3D mascot 4.5 KB (lazy, desktop),
app shell +8.3 KB (consent, cookie banner, analytics, error boundary, mascot SVG,
React Bits). Removed: fox SVG, old 3D scenes and 2D fallbacks (−11.8 KB),
JetBrains Mono. Added font: Instrument Serif (21 KB woff2, preloaded).
three.js chunk unchanged (242 KB gzip, desktop only).

## Not done / limits

- **Higgsfield:** 0 credits → nothing generated; procedural mascot ships; full brief in
  `docs/higgsfield-prompts.md`.
- **Shaders.com:** not reachable from the build environment (and free-only): in-house
  liquid-metal shader in the mascot canvas instead. **Uiverse:** not needed.
- **Turnstile:** needs a site key and server verification (backend) → honeypot only.
- **View Transitions API:** not used; it conflicts with the kept route transitions.
  A FLIP shared element (deal title) does the job everywhere.
- **Real devices / real slow 4G:** emulation and Lighthouse throttling only.
- **Analytics:** adapter ready, no provider chosen; set `VITE_ANALYTICS_ENDPOINT` and
  add its origin to `connect-src` in `vercel.json`.
- **₹ glyph** loads Inter's latin-ext subset (132 KB) on pages with prices; a custom
  subset would save it.
- Razorpay `CHECKOUT_THEME` colour changed from gold to carbon (visual parameter only).

## Legal placeholders (drafts — lawyer review required before launch)

[LEGAL ENTITY NAME], [REGISTERED ADDRESS], [CONTACT EMAIL], [GRIEVANCE OFFICER],
[GOVERNING LAW], [EFFECTIVE DATE], plus business decisions: [SUPABASE REGION],
[CONFIRM GEMINI DATA-USE TERMS AND REGION FOR YOUR API PLAN], [ANALYTICS PROVIDER OR
“NONE”], [DELETION PERIOD], [TUTOR RETENTION PERIOD], [LOG RETENTION PERIOD],
[REFUND WINDOW], [RENEWAL REFUND RULE], [5–7 BUSINESS DAYS], [RESPONSE TIME],
[INCLUDE / EXCLUDE] (GST), [UPGRADE/DOWNGRADE RULE], [NOTICE PERIOD],
[ACKNOWLEDGEMENT TIME], [RESOLUTION TIME]. Pages show a “draft” notice until all are filled.
