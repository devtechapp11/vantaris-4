# Vantaris · V4 « Midas » progress

Memory file for the V4 execution (phases 4 → 12) on `redesign/vale-pitch`.
Re-read this after a context reset. Each phase: lint, typecheck, build (with
check-palette before and check-dist after), tests, a commit
`feat(vale-pitch): phase N — …`, a push. Never `main`, never `--force`, no
production deploy.

## Express audit (what really exists)

- **Routes** (`src/App.jsx`)
  - Signed out: `/`, `/welcome` (landing), `/signin`, `/signup`, `/forgot`, the legal pages, and `/dev/type` and `/dev/vale`.
  - Signed in: `/` is the Path (the spec's `/app`; `/app` is an alias from Phase 6), plus `/learn/:node`, `/blitz`, `/practice`, `/practice/:id`, `/ranking`, `/profile` and `/plans`.
  - Not yet onboarded: `/onboarding`.
  - The `/dev/*` pages exist only when `__DEV_PAGES__` is set, which is false in a Vercel production build (`VERCEL_ENV=production`).
- **npm scripts**
  - `lint` (oxlint), `typecheck` (`tsc --noEmit`), `build` (with check-palette before and check-dist after), `build:preview` (demo backend), `test`, `test:sql`, `test:functions`.
  - New in this run: `build:qa` and `shots`.
- **Prices**
  - Source of truth: the `public.plans` table, read with `api.getPlans()` and `usePlans()`. The demo backend mirrors it.
  - Core ₹499 / ₹4,990 a year, Pro ₹999 / ₹9,990, Elite ₹1,999 / ₹19,990 (amounts in paise). These match the brief, so nothing to report.
- **Supabase**
  - Exercises: `problems`, `problem_attempts` (one attempt per problem, server-side `submit_answer` RPC with `combo_run` and `combo_multiplier`), `exercise_pool` and `exercise_attempts` (generated deal cases, the `submit-answer` Edge Function).
  - Lessons: `path_progress` and `lesson_credits` (XP credited by the server per session).
  - Also: `review_items`, `skill_mastery` (Elo), `blitz_scores`, `points_ledger`, `profiles` (XP, streak, `streak_freezes`, timezone), `vault_caches`, `demo_credits`.
- **`ValeModel.tsx`**
  - Skin: one `MeshPhysicalMaterial` (`valeShape.makeValeMaterial`). Its existing `onBeforeCompile` paints the visor, the eyes and the mercury ripple, with cache key `vale-v1`.
  - Midas composes on top of it and never replaces it.
- **`SfxEngine`** (`src/lib/sfx/engine.ts`)
  - Existing: `unlock`, `plink`, `whoosh`, `tick`, `press`, `correct(combo)`, `wrong`, `comboUp`, `starImpact`, `promotion`, `printFeed`, `tear`, `stamp`, `holdStart`, `holdSet`, `holdStop`.
  - New: `combo(mult)`, `midasShimmer()` (returns its stop function) and `panned(pan, fn)`.
  - Muting is the app's `sound` preference. The site uses `siteSound`, which is off on every visit.
- **`valeBus`**: `react(mood, {gaze})`, `correct(tier)`, `wrong(el)`, and `state`, which is read every frame by the 3D Vale.
- **`haptics.ts`**: `haptics.fire(pattern)` and `HAPTIC`, which stay as they are. `haptic(cue)` is added with the brief's names.
- **Existing exercise engine** (`src/screens/Learn.jsx`)
  - Formats: choice, slider, compare, build (formula) and the Rapid Pair Match warm-up.
  - Lessons are graded on the client against content templates; the server credits XP once per session (`save_lesson`, `creditLesson`).
  - Combos already exist server-side, but with different thresholds: ×5 from 10 in a row.

## Phase 4 — Midas engine, combo sound, haptics, dress code ✅

- **Midas engine**
  - `src/vale/midas.ts`: the brief's code, two additions:
    - an optional `mask` (GLSL), so Vale's visor and eyes never turn;
    - `midasRun` and `GOLD_LINEAR` for the sparkles.
  - The gold `vec3` exists only in this file; `check-palette` fails if `0.766, 0.336` appears anywhere else.
  - `src/vale/valeMidas.ts`: the one switchboard for Touch, State and Gold (sound, haptics, `valeBus`, the outfit swap at the peak).
  - `Sparkles.tsx`: 200 surface samples (`MeshSurfaceSampler`), up to 40 flakes, gold mode only, none under reduced motion.
- **Combo sound and haptics**
  - `src/lib/sfx/combo.ts` (FM chords and the shimmer pad), plugged into `SfxEngine`.
  - `haptic(cue)` merged into `haptics.ts`; iOS has no `navigator.vibrate`, so it is a silent no-op there.
- **DOM Midas**: `src/lib/midas/midasTouch.ts` and `src/styles/midas.css`, imported once in `main.jsx`. New token `--prism-ring` (a closed prism ring with no transparent ends) is used for the edge.
- **Outfits** (`src/vale/outfits/`)
  - Built procedurally on Vale's real shape:
    - `garment()` builds a shell from the pebble function, lifted 3–7 %, with a front opening that varies down the body (V-neck, half-open zip);
    - extruded lapels and collar points, tubes for the tie, lanyard and zip, chrome trim.
  - Fabric: `MeshPhysicalMaterial` with sheen, roughness 0.85 and a procedural twill normal map (512², drawn once). All fabric is Midas-ready, so it turns gold at a promotion.
  - Registry: `outfitRegistry.ts` (`DESKS`, `DESK_WIDTH`, `deskOf(level)`, the `valeOutfit` store, `useOutfit()`). Each outfit is its own lazy chunk.
  - Silhouette test (8 px blur): the four desks stay apart.
    - Analyst: dark, high collar, a cup at the side.
    - Associate: light shirt.
    - VP: near-black blazer with a long light V.
    - MD: lighter charcoal suit, a darker waistcoat, a pocket square.
- **`/dev/vale`**: desk selector (Bare plus the four desks, with the label animating `font-stretch` to the desk width); Touch, State on/off, Gold and Promotion buttons (2.4 s, the outfit changes at the peak); a reduced-motion toggle; an FPS counter.
- **`scripts/shots.mjs`**
  - Runs against `npm run build:qa`, a preview-backend build served at `/` so deep links work: `npx vite preview --outDir dist-qa --port 4180`.
  - Signed-in routes are seeded with a local preview account.
  - It fails on any page or console error and on horizontal overflow.
  - `design/qa/` is git-ignored.

## Phase 5 — Exercise engine (4 formats) and server validation ✅

- **Shared contract**
  - `src/lib/exercises/schema.ts` (the brief's A6), copied by `scripts/sync-shared.mjs` to `supabase/functions/_shared/exercise-schema.ts`. The repo's convention is a generated copy with the zod import rewritten, not a `deno.json` mapping.
  - `src/lib/exercises/lesson.ts`, synced too: `buildLesson(skill, seed)` gives five items from the deterministic finance engine:
    - three multiple-choice questions, one formula build, one valuation slider, so at least one item is never multiple choice;
    - keys can be recomputed on the server from (template, seed);
    - the slider's target is the engine's exact answer, and its track is off-centre so the middle is never the answer;
    - a formula uses only its own blocks plus two decoys; a bracketed group is one block, and subscripts are plain digits because the fonts have no subscript glyphs.
  - Also `grade()`, `xpFor()`, `comboAfter()` and `isMilestone()`.
- **Migration `supabase/migrations/20261127120000_v4_lessons_server.sql`** (not applied)
  - Tables: `lesson_sessions`, `lesson_items` (keys, no player policy), `lesson_answers` (`attempt_id` primary key, unique on session + exercise).
  - RPCs (service role only): `begin_lesson` (anonymous players get 3 lessons a day), `record_lesson_answer` (idempotent, combo over the session, the brief's multipliers ×2 / ×3 / ×5 at 3 / 5 / 8 in a row, XP shares the 400-a-day lesson cap), `finish_lesson` (streak on the local date, earned freezes).
  - `_is_anonymous()` reads the JWT claim.
- **Edge Functions** (not deployed)
  - `generate-exercise` gains `mode: 'lesson'`: it stores the keys and returns only public payloads. Gemini may re-tell multiple-choice wording (two tries); the result must pass the shared contract, otherwise the engine's wording is kept.
  - `submit-answer` gains `{ sessionId, exerciseId, answer, attemptId }`, which returns a `SubmitResponse` (revealId, stars, dealBrief, midasState), and `{ finish: sessionId }`. The onboarding first deal's key is seeded on the server (`onb-first-deal`).
  - `authed()` now also returns `anonymous`.
- **Client** (`src/lib/exercises/client.ts`)
  - `VITE_LESSON_SERVER=1` switches to server grading once the functions are deployed.
  - Without it, which is the default today, the same lesson is built and graded on the device, and the XP is credited once at the end by the existing `credit_lesson_xp`. The screen shows only what is really credited: 10 per right answer, and the ticket prints the server's credited amount.
- **Components** (`src/exercise/engine/`): `McqCard` (keys 1–4), `FormulaBuilder` (tap or drag, snap click), `PairMatch` (per-pair feedback), `ValuationSlider` (live value, tick and tap haptic), and `LessonShell`:
  - segmented progress; a combo badge from 2× (chrome from 3×);
  - CHECK with a 150 ms lock-in, a shimmer after 600 ms, and Retry after 8 s with the same `attemptId`;
  - a feedback sheet (Deal Brief in one line, then Continue), announced through `aria-live`;
  - the last exercise uses « Hold to close the deal » (700 ms);
  - results: stars docking one by one, then a thermal ticket stamped CLOSED;
  - keys: 1–4, Enter, Escape.
- **Feedback matrix**: Midas Touch from the tap point, `plink` or `combo(m)`, haptic cues, MetalBurst from ×3, `valeBus` delight or wow, Midas State at ×5. A miss shakes the card 6 px twice, rings the right option and sends Vale's gaze to it.
- **Route `/lesson/:node`** (focus screen). The existing `/learn/:node` keeps its content and gains the Midas edge on its options.
- **Tests**: 22 unit tests (multipliers, stars, every lesson valid with a non-MCQ, deterministic rebuild, grading, an off-centre slider) and 18 Deno tests (a lesson keeps the engine wording when the writer fails twice). `submit-answer`'s idempotency is enforced in SQL (`attempt_id` primary key); the repo has no harness that runs plpgsql here, so it is listed for Dev's `npm run test:sql`.

## Phase 6 — Path « action directe » ✅

- **One dominant action**
  - The active node grows to 96 px.
  - `ActiveCta` shows START, CONTINUE or REVIEW. It is in the first render and is centred on arrival only when off screen, with no motion under reduced motion. It takes focus, so Enter starts it.
  - It opens `/lesson/:node`, the V4 lesson, directly on question 1: one click, checked in Playwright (Enter → `.xq-prompt` visible, 0 errors).
  - A locked Pro node still opens membership (`openPaywall('level')`).
- **Desktop (≥ 1024 px)**: sidebar, path (≤ 560 px), a 320 px rail of 3 cards with nothing repeated:
  - Next unlock (XP to the next desk);
  - today's goal and one action;
  - the league.

  The stats bar keeps desk, league place, streak, stars and sound.
- **Phones and tablets**
  - The header has 3 items: streak, today's goal ring, desk. The rail's cards are gone.
  - The tab bar is unchanged (4 tabs).
  - A « Continue · <chapter> » pill appears only while the active node is off screen, using an IntersectionObserver on the node itself.
- **ValeMini** (`src/vale/ValeMini.tsx`)
  - One 140 px canvas beside the active node (100 px when the gap is narrow; 56 px inline next to the CTA on phones, where his line is dropped so the CTA stays the only thing that stands out).
  - `frameloop="demand"`. It is invalidated on a `valeBus` reaction (2.2 s), pointer movement (0.6 s) and a blink every 4–7 s; `requestBlink()` was added to `ValeModel`.
  - DPR ≤ 1.5, the low-detail body, the outfit for the player's desk.
  - `ValeSeat` paints `public/vale/poster-<desk>.webp` first (four posters, about 11 KB each, rendered from `/dev/vale`). The 3D loads when the browser is idle, only with WebGL and not on weak devices (≤ 4 cores and ≤ 4 GB).
- **`/app`** is an alias of the Path (Path tab active).
- QA shots: `design/qa/p6` (375, 768, 1440 × motion and reduced motion). Playwright's full-page capture resizes the viewport, so it can show the Continue pill where a real viewport doesn't; that was checked separately.

## Phase 7 — Onboarding `/start` ✅

- **State machine**: `src/onboarding/machine.ts` (the brief's A8, persisted in sessionStorage) and `firstDeal.ts` (A9). The old `/onboarding` screen is removed; it now redirects to `/start`.
- **Steps** (`src/screens/Start.tsx`)
  1. Awaken: bare Vale rises out of the dark (2.6 s, 0.9 s under reduced motion, a tap skips).
  2. First deal: `FIRST_DEAL`. On CHECK: `signInAnonymously()` if there is no session, then `submit-answer` (key seeded on the server).
     - Right answer: Midas Touch from the tap point, `correct`, a haptic, Vale delighted, then the ticket « DEAL #0001 · VALUATION · $80M · CLOSED » with the credited XP, and the Deal Brief.
     - Fallback while the function isn't deployed: the deal is graded against the ticket's public value (it is shown afterwards anyway), and the XP goes through the existing capped `credit_demo_xp`. If guest desks are off, the deal still plays, without XP.
  3. Ambition: « Who's playing? » (one tap, then it moves on), then « Which desk are you aiming for? », with each desk written at its own width (62 → 125 %).
  4. Commitment: 5, 10 or 15 min, then « Commit to my goal ». Vale stamps a metal seal (`stamp`, a haptic).
  5. Lesson 1: the V4 lesson on « The three statements », inline. « High school » and « Just curious » calibrate the local lesson to difficulty 1, University 2, Finance 3; the server path keeps its own skill rating.
  6. Save (guests only): « Save your desk » with the real XP total, then Continue with Google (`linkIdentity`), Use email (`updateUser`, with a confirmation email), or Later.
     - Conflict (the identity already has an account): « Sign in to my existing account »; the guest progress is not merged, and the screen says so.
  - Then the Path, with one closable plans card (« See plans » / « Not now »), once.
- **Routing**: `/start` stays mounted while the guest session and the profile load, so it never redirects mid-flow. Signed-out visitors and accounts that haven't onboarded reach it too.
- **Removed**: Vale's once-per-session splash on the app's home. It held the screen for 1.5 s, which breaks the 0.5 s rule (CTA in the first render).
- **Guests**
  - Upgrading requires saving the desk first: Plans shows the save panel instead of the checkout.
  - The migration `20261127130000_v4_anonymous_guards.sql` (not applied) wraps `get_leaderboard` so guests get `LINK_REQUIRED`. The live body is renamed and kept, not rewritten.
  - Guests are limited to 3 lessons a day in `begin_lesson` (Phase 5 migration).
- **Daily goal**: kept on the device (`vt.goal.minutes`), for the in-app reminders of Phase 11. `profiles.goal` only accepts career goals (`ib`, `pe`…), so it isn't overloaded.
- QA: the full flow was played in Playwright at 375 and 1440 (landing CTA excluded: the landing is Phase 8), with 0 errors. The first deal is on screen at about 3.7 s. Shots: `design/qa/p7`.

## Phase 8 — Landing « pitch » in 8 acts ✅

- **Stage**: one fixed canvas behind the acts (`src/landing/LandingStage.tsx`, lazy).
  - `stage.ts` (the brief's A10): Lenis on the GSAP ticker, a ScrollTrigger per act, SplitText reveals word by word. Landing only.
  - `CameraRig.tsx` (A11). Keyframes tuned on the captures:
    - acts 1, 3, 4 and 5 adjusted;
    - the camera holds still for the first 80 % of act 4;
    - on portrait screens it steps back along the same line.
  - `VelocityAberration` runs on capable screens only. Phones (`isLowPower`): DPR 1.25, a 256 px reflector, no post-processing.
  - `@react-three/postprocessing` and `postprocessing` are left out of the shared `three` chunk, so they ship only in `LandingStage` (checked in `dist`).
- **The act on screen** is decided by the DOM (an IntersectionObserver at the viewport's centre, `actBus`), because act 4 is four screens tall.
  - On each act change: one ring on the pool.
  - `whoosh` at act 2.
  - In act 4, a tap on Vale plays the Gold Standard demo; everywhere else it plays a Midas Touch.
- **Intro** (`Director.tsx`, act 0): a chrome drop (0–600 ms), the splash and three rings (600–1100), Vale rises from under the pool (1100–1900), his eyes light up and he blinks (1900–2300). Under reduced motion Vale is already standing. No text; the SOUND · OFF pill; « Scroll » after 2.5 s.
- **Acts**: the §2.6 copy, all as real `h1`/`h2`/`p`.
  - Act 1: CTAs « Play your first deal » → `/start` and « I have an account » → `/signin`; Vale glances at the title, then at the visitor.
  - Act 3: the playable `FIRST_DEAL`, which is now a shared component (`src/onboarding/FirstDealCard.tsx`) with its own styles. It is graded on the page with no account. « Keep going » hands the answer to `/start`, which signs the guest in and closes it on the server, so the XP is real and there is no second awakening.
  - Act 4: a sticky pin with a scrub. Each 25 % brings a 90 ms flash, the next outfit, the desk name animating `font-stretch`, and a short `promotion`. The outfits preload during act 3. « Touch Vale » appears only with 3D.
  - Act 5: a phone showing a real capture of the Path (`public/landing/app-path.webp`, from the Phase 7 QA).
  - Act 6: the 3 plans from the configuration, the BillingSwitch, and savings computed from the prices.
  - Act 7: the opening shot again.
- **Spatial sound**: `plink` (a tap, the drop), `whoosh` and `promotion` go through `sfx.panned(valeRig.pan)`, from Vale's screen x clamped to ±0.6. Everything stays behind the site's SOUND pill.
- **Without WebGL**: Vale's poster and the same texts (checked with `--disable-webgl`).
- **Removed**:
  - the old demo deals (`src/landing/demo/DemoDeals`, `deals.ts`, `demo.css`);
  - the old `PITCH` / `LADDER` copy;
  - the hook cue in the pre-rendered shell, since act 0 has no text.

  `demoScore.ts` stays because the app's `DemoCredit` still reads it.
- QA: all 8 acts and the hand-off were walked through in Playwright at 1440 and 375, with motion, reduced motion and no WebGL: 0 errors.

## Phase 9 — Liquid Glass (exactly 3 surfaces) ✅

- `src/components/glass/LiquidGlass.tsx` (the brief's A12), mounted once at the root. It sets `has-liquid` on Chromium only; Safari and Firefox keep the plain blur.
- `.glass--liquid` (the brief's CSS, in `components.css`) is on three surfaces only:
  - the landing's nav pill, once you scroll;
  - the plan cards (landing and `/plans`, through `PlanCard`);
  - the app's mobile tab bar.

  The older frosted `.glass` stays on the app's other floating layers (sheets, toasts…); it has no refraction. Under reduced transparency, both are solid.
- Shots: `design/qa/p9` (`/`, `/start`, `/app`, `/dev/vale`, `/plans`). The refraction was checked on the landing's plan cards, with Vale bent behind them.
- Lighthouse mobile (targets: landing ≥ 75, app ≥ 85): not run here. Launching Lighthouse through `npx` was refused by the session's safety mode. It is listed for Dev.

## Phase 10 — Rituals (one commit each) ✅

1. **Opening Bell** (`rituals/OpeningBell.tsx`): the first lesson of the local day starts with three strikes of a small bell (1.2 s, a tap skips it): « Market's open. »
2. **Closing Signature** (`rituals/Signature.tsx`): « Hold to close the deal » (700 ms) on the last exercise, then a signature line traces itself and the CLOSED stamp lands.
3. **Redline** (`rituals/Redline.tsx`):
   - the lesson's misses come back as a marked-up document, with a margin note in the loss red taken from the Deal Brief;
   - correcting a line strikes it through: « Cleared »;
   - it can be skipped; no XP, nothing is graded twice.
4. **The Seal** (`rituals/Seal.tsx`): a lesson at 3★ stamps the chapter's chrome seal (DCF, LBO, M&A…).
5. **The Vault's shelves** (`rituals/VaultShelves.tsx`, `rituals/vault.ts`):
   - Deal Tickets: the XP the server really credited, kept on the device because there is no per-lesson history endpoint yet;
   - Deal Toys: mastered chapters, with their accuracy;
   - Seals: from the server's stars.

   Real data only.
6. **Promotion elevator** (`exercise/PromotionCeremony.tsx`):
   - the floor number on split-flap, « ding », then the doors open on Vale in the new outfit;
   - Gold Standard, then a PROMOTED thermal receipt;
   - it waits outside `/lesson` and `/start`.
7. **Split-flap** (`rituals/SplitFlap.tsx`): the rank on Ranking and the XP credited at the end of a lesson (400 ms, a mechanical click).
8. **Pitch-deck card** (`rituals/pitchDeck.ts`, `PitchDeckShare.tsx`):
   - a 1080 × 1350 canvas drawn on the device: PROJECT VALE — CONFIDENTIAL, Vale in his outfit, the desk, streak, accuracy and XP;
   - the first name only when the player ticks it.
9. **Vale yawns** (`rituals/BreakNudge.tsx`):
   - after 45 minutes of continuous play (more than 10 minutes away starts the count over), a small card shows: « 45 minutes in. A short break helps it stick. »;
   - it never blocks, and shows once per session.

New sounds: `sfx.openingBell`, `sfx.ding`, `sfx.flap`. Shots: `design/qa/p10`.

## Phase 11 — Membership and retention ✅

- « Recommended » on Pro (our recommendation, said as such) replaces « Most popular ».
- The yearly badge is computed from the plans (`yearlySaving`); the old written « 2 months free » is gone.
- Triggers:
  - the closable plans card after a finished lesson (free tier, at most once a week);
  - the existing sheet on a locked Pro node.

  Never inside a lesson. `REVERSE_TRIAL_ENABLED = false` in `src/lib/config.js`.
- PAID receipt: still printed only after `confirmPayment` (signature verified by the server). Prices, plan ids, checkout and webhook were not touched.
- Streak and freezes stay server-side (`finish_lesson`, in the migration not yet applied):
  - local date (IANA), one lesson = one day;
  - +1 freeze per 7 days, 2 in reserve at most, spent by itself.
- Milestones narrowed to 7, 30, 100, then every 100. The day's first lesson runs in Midas State, and the results stamp a streak seal (« 30D »).
- In-app reminder (`path/StreakNote.tsx`), in a neutral tone: « Your streak is at 6. One lesson keeps it. » Freezes in reserve are stated plainly.

## Phase 12 — Final QA ✅

- Gate: lint 0 errors (old warnings remain), typecheck, build with check-palette and check-dist (129 files clean), tests 22/22.
- `node scripts/shots.mjs final` on 15 routes × 3 widths × 2 motion modes: 90 captures in `design/qa/final` (git-ignored), 0 page or console errors. `/start` was re-checked with a longer wait (`design/qa/start-check`), since the first shot caught a step transition.
- Passes with Chromium `--disable-webgl` and reduced motion:
  - keyboard only: the landing tab order is logical (skip link → nav → sound → CTA → deal → billing → plans), and `/start` answers the deal with the `1`–`4` keys;
  - sound is off by default, with no audio context before an action;
  - 0 errors.
- `grep -rn "499\|999\|1999\|1,999" src`: no amounts outside `src/lib/api/demo.js` (the demo backend). The other hits are radii (`999px`) and shader constants. Real prices come from `public.plans`.
- The « Join 2,341 future dealmakers » on the auth screens is the demo backend's figure. In production it is the server's count, shown only above `SOCIAL_PROOF_MIN`.

## Production release (28 Nov 2026, with Dev's written go-ahead)

- **Supabase migrations** applied to production, version numbers aligned with the repo files:
  - `phase6_server_xp`, `v4_lessons_server`, `v4_anonymous_guards`;
  - `v4_service_role_grants`: since the zero-trust lockdown, `service_role` gets no default privileges, so the Edge Functions need explicit grants;
  - `elite_perk_wording`.
- **Edge Functions** deployed with the CLI: `generate-exercise`, `submit-answer`, and `billing` (v17, guests blocked from checkout with `LINK_REQUIRED`).
- **Auth**: `config push` turned on only `enable_anonymous_sign_ins` and `enable_manual_linking`. The 19 undeclared remote settings (site_url, SMTP, MFA…) were left as they were.
- **End-to-end test in production** with a temporary guest, deleted afterwards:
  - the server lesson (5 items) never exposes the key;
  - a replay of the same answer earns 0 XP;
  - the streak moves when a lesson finishes;
  - the league answers 403 to guests, and so does checkout.
- **`VITE_LESSON_SERVER=1`** is in `.env.production`. It is public and read by every Vercel build. The Vercel CLI is not logged in on this Mac, so `vercel env add` was not possible.
- **Perks**: Elite said « Unlimited coaching » while the server caps it at 300 a day. The wording is now « 300 messages a day », in the DB, the Plans table and the demo.
- **Legal**: every factual placeholder is filled:
  - email, region, analytics (none: the CSP allows no collector);
  - retention (tutor messages are not stored);
  - GST included, plus the timelines Dev approved.

  Still to supply: legal entity name, registered address, Grievance Officer, governing law and courts.

## Decisions to confirm (defaults applied)

- [DÉCISION DEV] Guest progress is not merged into an existing account when Google or the email already has one; the screen says so clearly.
- [DÉCISION DEV] DPDP (minors, India): nothing beyond the existing; Dev decides with a lawyer before the public launch (obligations from 14 May 2027). No birth date, phone or school is collected.
- [DÉCISION DEV] Streak freezes: earned only (+1 per 7 days, 2 max), not for sale.
- [DÉCISION DEV] Reminders: in-app only. An opt-in email reminder needs a `profiles.email_reminders` column (default false), a toggle in Settings and a daily sender (cron and email provider). None of it was built, so nothing promises an email.
- [DÉCISION DEV] Streak milestones: 7, 30, 100, then every 100. Freezes still come every 7 days.
- [DÉCISION DEV] The plans card after a lesson: at most once a week, free tier only.
- [DÉCISION DEV] Deal Tickets live on the device (localStorage, 120 at most) until a server history exists.
- [DÉCISION DEV] Outfits are procedural. Plan B, if they read as toys: Blender, then GLB with Draco, under 300 KB per outfit, loaded lazily.

## Manual actions for Dev

- Apply `supabase/migrations/20261127120000_v4_lessons_server.sql`, deploy `generate-exercise` and `submit-answer`, then build with `VITE_LESSON_SERVER=1`. Until then, lessons are graded on the device and credited by `credit_lesson_xp`.
- Supabase Auth:
  - enable anonymous sign-ins;
  - enable manual linking (needed for `linkIdentity`);
  - enable CAPTCHA (Cloudflare Turnstile) for anonymous sign-ins;
  - check Google OAuth's redirect URL for the domain.
- Apply `20261127130000_v4_anonymous_guards.sql` (guests can't list the league).
- Billing (not touched, per the rule on payments): in `supabase/functions/billing`, `create-subscription` should refuse guests:
  ```ts
  const { anonymous } = await authed(req);
  if (anonymous) throw new HttpError(403, 'LINK_REQUIRED', 'Save your desk first.');
  ```
  The client already blocks it.
- Lessons credited by `credit_lesson_xp` (the local mode, before `VITE_LESSON_SERVER=1`) have no guest cap: add `if public._is_anonymous() and (lessons today) >= 3 then return 0`.
- Run Lighthouse mobile on the branch preview (targets: landing ≥ 75 performance, app ≥ 85): `npx lighthouse <preview-url> --form-factor=mobile`.
- Plan perks text: check each tier's wording in `public.tiers` (tagline and features) before launch.
- DPDP: the note above; nothing was collected beyond what already existed.
- Leftovers from this session:
  - a stale preview server still listens on port 4173 (stopping it was refused by the session's safety mode);
  - the QA server is on 4180.
- The existing problem combo (`combo_multiplier`: ×5 from 10 in a row) differs from V4 lessons (×5 from 8). It was left unchanged.
