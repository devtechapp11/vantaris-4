# Security notes

How Vantaris keeps secrets, scores and personal data safe, and what to check
before each release.

## Trust boundaries

| Lives in the browser (public) | Lives on the server only |
| --- | --- |
| Supabase URL and **anon** key | Supabase service role / secret keys |
| Razorpay **key id** | Razorpay key secret, webhook secret |
| Lesson templates, finance engine (deterministic, open by design) | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| Local preferences, saved Deal Briefs, session marks | Points, ledger, stars, streaks, subscriptions, exercise answers in the pool |

The browser is never trusted with anything that changes value: points, stars,
streaks, plan and payments are written by `security definer` SQL functions or
Edge Functions that re-check the caller.

## Server-side rules

- **RLS everywhere.** Every table in `public` has row level security; players
  can only `select` their own rows. `revoke all … from anon, authenticated`
  runs before the narrow grants (schema and each migration).
- **XP is computed by the server.** `submit_answer`, `credit_lesson_xp`,
  `credit_demo_xp`, `claim_vault_cache` and `record_exercise_attempt` recompute
  the amount from server state and cap it (400 XP of lessons per local day,
  150 XP of deal cases per day, demo XP ≤ 60 once per account within a day of
  sign-up, one claim per cache). Replays return 0.
- **Deal cases.** `generate-exercise` draws numbers with the deterministic
  engine, stores the answer index in `exercise_pool` (no player grant on that
  table) and returns everything but the answer. `submit-answer` rebuilds the
  exercise from template + seed, refuses a row whose stored answer disagrees,
  and records one attempt per player per exercise.
- **Gemini.** Called only from Edge Functions with the key in Supabase
  secrets. Model output is validated with zod (Deal Brief: rule ≤ 140,
  trap ≤ 140, real world ≤ 180, formula ≤ 80) and a generated scenario is kept
  only if it quotes every engine figure verbatim and adds no other number;
  otherwise the engine's own wording is used. The tutor never sees answers
  before the player submits. No personal data (name, email, payment) is sent.
- **Payments.** Razorpay webhooks are verified with HMAC before any write;
  subscription state comes only from the webhook and the billing function.

## Client hardening

- Production build: no source maps, `target es2020`, esbuild minification,
  `console` and `debugger` calls dropped from every chunk, no license banners.
- `scripts/check-dist.mjs` runs after `npm run build` and fails on a `.map`
  file, a `sourceMappingURL`, a `debugger` statement, the preview backend, or
  anything shaped like a secret (Supabase secret, Google key, private key,
  GitHub/AWS tokens, webhook secrets, any JWT whose role is not `anon`).
- The preview backend and its answer key are swapped in only by
  `vite build --mode demo`; `data-key` / `data-type` attributes exist only in
  that build.
- Headers (`vercel.json`): strict CSP (self + Supabase + Razorpay; no inline
  scripts, `object-src 'none'`, `frame-ancestors 'none'`), HSTS two years with
  `includeSubDomains; preload`, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  denying camera, microphone, geolocation and USB.
- If `VITE_ANALYTICS_ENDPOINT` is set, add that origin to `connect-src`.

## Young users

The audience is 15–22. No loot boxes or paid randomness, no fake players
outside the preview, rewards are fixed and shown before they are claimed,
sound / haptics / particles / motion can be turned off in one tap, and
reduced motion is honoured everywhere.

## Release checklist

1. `npm run typecheck && npm run lint && npm test && npm run build`
   (the build runs `check-palette` before and `check-dist` after).
2. `npm run test:sql` and `npm run test:functions` against a local stack.
3. Apply new files in `supabase/migrations/` (review first, then
   `npx supabase db push`), deploy changed functions, check the Supabase
   security advisor.
4. Secrets set in Supabase: `GEMINI_API_KEY` (optional), `ALLOWED_ORIGINS`,
   Razorpay keys. Nothing secret in Vercel `VITE_*` variables.
5. Rotate any credential that was ever pasted into a chat, an issue or a
   commit.
