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

## Decisions to confirm (defaults applied)

- [DÉCISION DEV] Outfits are procedural. Plan B, if they read as toys: Blender, then GLB with Draco, under 300 KB per outfit, loaded lazily.

## Manual actions for Dev

- (filled in as phases land)
