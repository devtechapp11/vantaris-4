# Vantaris

Deal practice for future bankers: real DCF, LBO and M&A deal problems, solved
in minutes, with step-by-step solutions, Vale the AI tutor, streaks and a
leaderboard. Climb from Analyst to MD.

- **App:** React + Vite, installable on phones (PWA)
- **Backend:** Supabase (Postgres with row-level security, Auth, Edge Functions)
- **Payments:** Razorpay subscriptions (Core, Pro, Elite × monthly, yearly)
- **AI tutor:** Gemini, called only from the server
- **Design:** monochrome tokens (`src/styles/tokens.css`, `src/design/tokens.js`), Inter +
  Instrument Serif, Motion throughout, Liquid Glass on floating layers only, an original
  chrome mascot (SVG in the app, lazy WebGL on the website) — see `THIRD_PARTY.md`

Start with **[SETUP.md](./SETUP.md)**.

```bash
npm install
npm run dev             # live app on http://localhost:5173 (needs .env)
npm run build           # production build → dist/
npm run build:preview   # self-contained preview with a local backend → dist-preview/
npm run sql             # rebuild supabase/schema.sql from the content file
npm run mascot          # convert the Higgsfield hero loop (see docs/higgsfield-prompts.md)
```
