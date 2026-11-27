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

## Decisions to confirm (defaults applied)

- [DÉCISION DEV] Guest progress is not merged into an existing account when Google or the email already has one; the screen says so clearly.
- [DÉCISION DEV] DPDP (minors, India): nothing beyond the existing; Dev decides with a lawyer before the public launch (obligations from 14 May 2027). No birth date, phone or school is collected.
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
- The existing problem combo (`combo_multiplier`: ×5 from 10 in a row) differs from V4 lessons (×5 from 8). It was left unchanged.
