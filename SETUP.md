# Vantaris setup guide

Follow the steps in order. Each one ends with a check so you know it worked.
Total time: about 45 minutes the first time.

**Golden rule:** secret keys go only into Supabase → Edge Functions → Secrets.
Never into `.env`, never into the code, never into a chat. The only keys the
website itself holds are the Supabase URL and anon key, which are public by design.

---

## 0. What's in the project

```
src/                     the app (React)
  screens/               Welcome, sign in/up, onboarding, Home, Practice, Problem, Tutor, Ranking, Profile, Plans
  lib/api/real.js        talks to Supabase (live app)
  lib/api/demo.js        in-browser stand-in used only for the shareable preview
  content/landing.js     landing page copy, sample deal and testimonials
  styles/tokens.css      design tokens: every colour, size, shadow and duration
supabase/
  schema.sql             the whole database: copy-paste into Supabase
  functions/billing/     Razorpay: start checkout, verify payment, cancel, delete account
  functions/razorpay-webhook/   Razorpay events (renewals, failures, cancellations)
  functions/tutor/       AI tutor (Gemini)
  tests/                 database security tests
docs/higgsfield-prompts.md  mascot asset brief: prompts, budget, filenames (files go in public/mascot/)
vercel.json              security headers for the website
```

---

## 1. Database (5 min)

1. Supabase → **SQL Editor** → **New query**.
2. Paste the whole of `supabase/schema.sql`, click **Run**.
3. **Check:** Table Editor shows `profiles`, `plans`, `subscriptions`, `payments`,
   `problems` (20 rows), `modules` (8 rows) and others. Each table shows a
   shield icon (RLS on).

Running it again later is safe: it updates rules and content and keeps user data.

---

## 2. Login security (10 min)

Supabase → **Authentication**:

1. **Sign In / Providers → Email**: turn on **Confirm email** and **Secure email change**.
2. **Passwords** (same page or *Policies*): minimum length **8**, requirement
   **letters and digits**. If you're on the Pro plan, turn on **leaked password protection**.
3. **URL Configuration**:
   - Site URL: `https://vantaris.finance`
   - Redirect URLs: `https://vantaris.finance/**` and `http://localhost:5173/**`
4. **Emails → SMTP Settings (required before real users):** Supabase's built-in
   email only reaches your own team's addresses, 2 per hour. Connect a sender:
   - Easiest: a free [Resend](https://resend.com) or [Brevo](https://brevo.com) account,
     verify `vantaris.finance`, then paste their SMTP host, port, user and password here.
   - Sender: `Vantaris <no-reply@vantaris.finance>`
   - Then **Rate Limits**: raise "emails per hour" to what your sender allows.
5. Leave **CAPTCHA** off for now (it needs a small code addition first).

**Check:** sign up on the app with a non-team email address and receive the confirmation email.

---

## 3. Server functions (10 min)

### Option A: Dashboard (no install)

For each of the three functions, `billing`, `razorpay-webhook` and `tutor`:

1. Supabase → **Edge Functions** → **Deploy a new function** → **Via editor**.
2. Name it exactly `billing` (then `razorpay-webhook`, then `tutor`).
3. Replace the sample code with the content of `supabase/functions/<name>/index.ts`. Deploy.
4. Open the function → **Details/Settings** → turn **off** "Enforce JWT verification"
   (each function checks the caller itself; the webhook can't work with it on).

### Option B: Command line

```bash
npx supabase login
npx supabase link --project-ref uoxxbefprjbczhdrjuiv
npx supabase functions deploy billing razorpay-webhook tutor
```
(`supabase/config.toml` already turns JWT verification off for all three.)

### Secrets

Supabase → **Edge Functions → Secrets**, add:

| Name | Value |
|---|---|
| `RAZORPAY_KEY_ID` | `rzp_test_TsVE250GMrScF8` |
| `RAZORPAY_KEY_SECRET` | Razorpay → Account & Settings → API Keys (test mode). Shown once when you generate the key; regenerate if you lost it. |
| `RAZORPAY_WEBHOOK_SECRET` | A long random string you invent (40+ characters). You'll paste the same one in Razorpay in step 4. |
| `GEMINI_API_KEY` | A **new** key from Google AI Studio (delete the old one, see step 7) |
| `ALLOWED_ORIGINS` | `https://vantaris.finance,https://www.vantaris.finance,http://localhost:5173` |
| `GEMINI_MODEL` *(optional)* | Leave empty. If the tutor fails with a model error, set `gemini-2.5-flash`. |

**Check:** Edge Functions → `billing` → Logs shows no "Missing secret" errors after you try a checkout.

---

## 4. Razorpay (10 min, test mode)

1. Dashboard top bar: make sure **Test Mode** is on.
2. **Subscriptions**: open it once; if it asks you to activate the product, do it.
3. **Account & Settings → Webhooks → Add new webhook**:
   - URL: `https://uoxxbefprjbczhdrjuiv.supabase.co/functions/v1/razorpay-webhook`
   - Secret: the same value as `RAZORPAY_WEBHOOK_SECRET`
   - Events: tick every `subscription.*` event, plus `payment.failed` and `payment.captured`
4. **Plans: nothing to do.** The billing function creates the six Razorpay plans
   (Core, Pro, Elite × monthly, yearly) the first time someone picks them, using
   the prices in `schema.sql` (section 8). Change a price there and re-run the
   file; the next checkout creates a new Razorpay plan automatically.

---

## 5. Run it on your computer

```bash
npm install
cp .env.example .env      # then paste your Supabase URL and anon key
npm run dev               # opens http://localhost:5173
```

### Test a payment

1. Sign up, confirm the email, finish onboarding.
2. Open 3 problems; the 4th asks you to upgrade (free plan limit).
3. Profile → See plans → Continue with Pro.
4. In Razorpay's window use a test card: `5312 6865 5677 9641` (Mastercard)
   or `4384 7968 2770 3274` (Visa), any future expiry, any CVV. Click **Success** on the bank page.
5. **Check:** "Welcome to Pro" appears; VP modules unlock; the tutor answers.
6. In Supabase Table Editor: `subscriptions` has a row with status `active`,
   `payments` has the payment, `webhook_events` fills up as Razorpay sends events.
7. Profile → Cancel subscription. **Check:** "Access until …" appears.
8. Razorpay test dashboard → the subscription → "Charge this now" → Failure.
   **Check:** status becomes `pending`, then `halted` after 4 failures (access ends).

---

## 6. Put it online at vantaris.finance

1. Push the project to a **private** GitHub repository (it contains the answer key in `scripts/content.json`; the `.env` file is ignored on purpose).
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
   Framework: Vite (auto-detected).
3. **Environment Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Deploy.
4. Project → **Settings → Domains** → add `vantaris.finance` and `www.vantaris.finance`.
   Vercel shows the DNS records to create; add them in **Porkbun → Domain → DNS**
   (delete Porkbun's default parking records first).
5. **Check:** `https://vantaris.finance` loads, you can sign in, and
   [securityheaders.com](https://securityheaders.com) gives the site an A.

People can install it like an app: Safari → Share → **Add to Home Screen**
(Android Chrome offers "Install app").

---

## 7. Security checklist

Already done in the code:

- [x] Database: every table has Row Level Security; players can read only their own rows.
- [x] Players can't write anything directly. Scores, streaks, quotas and plan limits run inside the database (`open_problem`, `submit_answer`); answers and solutions never reach the browser before submitting.
- [x] Answer options are shuffled per player (the original content had the answer on "B" 13 times out of 20).
- [x] Subscriptions and payments can only be written by the server, after Razorpay's signature is verified with a constant-time comparison, and after re-reading the payment from Razorpay's API.
- [x] Webhooks: signature checked on the raw body, duplicate deliveries ignored, out-of-order events ignored, bad data logged without blocking Razorpay's retries.
- [x] Card and UPI details never touch Vantaris; Razorpay's window handles them.
- [x] AI tutor: plan and daily limits checked before calling Gemini; the model never receives the answer before the player submits; failed calls give the message back.
- [x] Logins: email confirmation, password rules, PKCE sign-in flow, error messages that don't reveal whether an email has an account.
- [x] Website headers: strict Content Security Policy, HSTS, no framing, no camera/mic/location access.
- [x] Fonts self-hosted: no third-party requests except Supabase and Razorpay.
- [x] Account deletion cancels the subscription first; payment records are kept for accounting without the player's identity.

Your to-dos:

- [ ] **Replace the Gemini key.** The old one was pasted in chat and sat inside the first preview's code. Google AI Studio → API keys → delete it, create a new one, put it only in Supabase secrets.
- [ ] Never paste `RAZORPAY_KEY_SECRET`, the webhook secret, the Supabase `service_role`/secret key or the database password anywhere except Supabase secrets.
- [ ] Turn on 2-step verification on Supabase, Razorpay, Vercel, GitHub, Google and Porkbun.
- [ ] Supabase is retiring the old `anon`/`service_role` keys by the end of 2026. When it asks you to migrate: create a **publishable key**, put it in `VITE_SUPABASE_ANON_KEY` (Vercel + `.env`), redeploy. The functions already handle the new secret keys.

---

## 8. Going live with real money

1. **Razorpay activation (KYC).** Razorpay needs the account holder's PAN, bank
   account and business details, and the account holder must be an adult. Make
   sure the account holder matches the legal owner of the business and domain.
2. Razorpay reviews the website. Add these pages before applying: **Terms and
   Conditions**, **Privacy Policy**, **Cancellation and Refund Policy**, **Contact Us**
   (with `devs@vantaris.finance`) and visible pricing.
3. When approved, switch the dashboard to **Live Mode**:
   - Generate live API keys → replace `RAZORPAY_KEY_ID` (`rzp_live_…`) and `RAZORPAY_KEY_SECRET` in Supabase secrets.
   - Add a **new** webhook in live mode (same URL, new secret, same events) → replace `RAZORPAY_WEBHOOK_SECRET`.
4. That's it. The code reads the mode from the key: live plans are created
   automatically on the first live checkout, and test data stays marked as test.

---

## 9. Running the tests (optional)

```bash
npm run test:functions   # 14 tests: signatures, webhook replays, tutor rules (needs internet for Deno)
npm run test:sql         # 96 checks + race tests against a local Postgres (Linux, needs postgresql)
```

---

## 10. The redesign: what to check before you deploy it

1. **Re-run `supabase/schema.sql`** (SQL Editor → paste → Run). It adds one
   read-only function, `get_public_stats()`, which gives the landing page and
   sign-up screen their live counters (deals solved, players, problems). It
   returns four totals and nothing personal. Re-running keeps all user data.
2. **Social proof only shows when it's true.** The "deals solved" and "future
   analysts" counters, and "Join N future dealmakers", appear only once each
   number reaches 100 (`SOCIAL_PROOF_MIN` in `src/app/usePublic.js`). Below that
   the page shows the problem count and the four tiers instead.
3. **Testimonials.** `src/content/landing.js` ships sample quotes so the preview
   looks complete. The live build hides the Reviews section while any quote is
   still marked `sample: true`. Replace them with real quotes you have
   permission to use, remove the flag, and the section appears.
4. **Vale's Higgsfield assets** are optional: the app ships an original chrome
   mascot in SVG and WebGL. To add a hero video or a GLB, follow
   `docs/higgsfield-prompts.md`, then run `npm run mascot` for the video.

## Design pass notes (branch design/chrome-overhaul)

- Report: `docs/CHROME_OVERHAUL.md`. Third-party code and licences: `THIRD_PARTY.md`.
- Legal pages live in `src/content/legal.js` (drafts with placeholders; lawyer review needed).
- Optional analytics: set `VITE_ANALYTICS_ENDPOINT` (a cookieless, first-party collector) and
  add its origin to `connect-src` in `vercel.json`. Nothing is sent without consent.
- `public/boot.js` shows the pre-rendered hero to signed-out visitors (same-origin, CSP-safe).
- `npm run og` re-renders `public/og-image.png`; `npm run icons` re-renders the app icons.
