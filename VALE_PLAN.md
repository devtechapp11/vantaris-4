# Vale · Prism Chrome — audit et suivi

Branche : `redesign/vale-pitch`, créée depuis `redesign/obsidian-platinum` (233a0a9). `main` intacte, aucun déploiement production.
Ce document suit le Plan v3. Il remplace `DIRECTORS_CUT_PLAN.md` pour la landing et la direction artistique ; la logique métier (Supabase, Edge Functions, RLS, Razorpay, XP, `sourcemap: false`, `check-dist.mjs`) ne change pas.

## Phase 0 — Audit

### 1. La landing actuelle, fichier par fichier

| Fichier | Ce qu'il rend | Sort (Phase 1) |
| --- | --- | --- |
| `index.html` (`.prerender`) + `src/components/HeroShell.jsx` | Hero prérendu (LCP) : sur-titre, titre `Don’t study finance. Command the floor.` (Instrument Serif italique), phrase, faux bouton | Réécrit : wordmark + Vale poster, aucun titre (acte 1) |
| `src/screens/Landing.jsx` | Orchestration : `Shutter`, `HudOverlay`, `MonolithStage`, nav glass, film (desktop `Film` + `Stage` collant, mobile `MobileFilm`, réduit `StillFilm`), 5 chapitres avec visuels (`DealSheet`, `AnswerSheet`, `ReturnsChart`, `RankLadder`, `TutorBubble`), `Ladder`, `Pricing` (3 PlanCard + BillingSwitch + carte finale), `Footer`. Lenis maison. | Vidé : nav + acte « hook » + deal + membership + appel final |
| `src/screens/Landing.css` | Mise en page du film, des chapitres, des panneaux | Remplacé |
| `src/content/landing.js` | `CHAPTERS` (5), `LADDER`, `SAMPLE_DEAL` | Réduit au texte du pitch |
| `src/landing/hero/MonolithStage.tsx`, `MonolithScene.tsx`, `ledger.ts`, `heroStore.ts`, `monolith.css` | Les 3 monolithes R3F (fixe desktop / inline mobile), état `ledger` (lock/explode) | **Supprimés** |
| `src/landing/hero/Medallions.tsx`, `TelemetryBadges.tsx` | 3 médaillons et 3 badges HUD autour des monolithes | **Supprimés** |
| `src/landing/hud/Shutter.tsx`, `HudOverlay.tsx`, `SoundBars.tsx`, `hud.css` | Volet d'ouverture « VANTARIS // LEDGER_01 », croix `+` dans les coins, labels verticaux, barres de son | Shutter + HudOverlay **supprimés** ; `SoundBars` gardé (pilule son) |
| `src/landing/demo/DemoDeals.tsx`, `deals.ts`, `demoScore.ts`, `demo.css` | Les 3 deals jouables, carte de calibrage (XP, temps moyen, desk), pile de 3 tickets | **Logique gardée** ; calibrage réduit au résultat + action, un seul ticket |
| `src/landing/ladder/Ladder.tsx`, `ladder.css` | Échelle 4 cartes + chips | **Supprimée** (remplacée en Phase 4) |
| `src/fx/field/ObsidianField.tsx` (monté dans `App.jsx`) | Fond WebGL2 mercure + grille + trame + glyphes | Retiré du rendu **sur la landing** |

Le chunk `Landing` importe aussi `SpecularCard`, `PlanCard`, `BillingSwitch`, `TierBadge`, `Magnetic`.

### 2. Vale aujourd'hui
- **2D (app)** : `src/components/MascotSVG.jsx` — galet chrome en forme de V (épaules larges, pointe douce), visière de verre noir, deux yeux platine. Animations motion (regard, clignement, humeurs `idle|curious|typing|privacy|success|error|thinking|celebrate`). `useId()` déjà nettoyé.
- **Enveloppe** : `src/components/vale/Vale.tsx` → `Vale({ mood, size, live, follow, avatar, force, label })`, suit le curseur, regarde un élément (`gaze`).
- **Bus** : `src/components/vale/valeBus.ts` → `valeBus.react(mood, { gaze })`, humeurs `idle|focus|delight|wow|concern` (+ alias `celebrate|combo|encourage`), `valeSplash`.
- **3D (existant, peu utilisé)** : `src/components/three/MascotScene.jsx` — sphère déformée en galet (`pebble()`), `MeshPhysicalMaterial` chrome, visière et yeux **peints par patch de shader** (`onBeforeCompile`), regard, clignement, spin à l'inertie. Chargé via `Scene3D.jsx` / `Mascot.jsx`.
- `ValeEyes` n'existe pas (décision Director's Cut : on garde le système de `Vale.tsx`).

### 3. Modèle 3D / assets
- **Aucun `.glb` / `.gltf`**, aucune vidéo (`.mp4`, `.webm`) dans `public/` ni `src/`. `public/mascot/` est vide.
- **Higgsfield** : seulement `docs/higgsfield-prompts.md` (brief prêt, rien généré : compte à 0 crédit au 31 oct.). Aucun asset à intégrer.
- **Décision** : Vale 3D procédural (Phase 3) **à partir de la silhouette du `MascotScene` existant** (galet en V, pas la goutte du brief), pour qu'il soit identique au Vale de l'app. Chargeur `public/vale.glb` (meshes `Body`, `Visor`, `EyeL`, `EyeR`) prévu en repli si le fichier apparaît.
- `design/storyboard/` : **absent**. On applique la mise en scène et les keyframes du plan.

### 4. Le deal de démo (gardé tel quel)
- 3 deals dans `deals.ts` (multiple → DCF perpétuité → LBO), réponses A/B/C/D ou 1–4, Entrée pour avancer.
- XP par vitesse (`xpFor(secs)`), note finale `gradeFor(right)`.
- `localStorage` : `vantaris.demo.v1` (`{ xp, right, played, total, at }`) et `vantaris.demo.tickets.v1`. Crédit à l'inscription **côté serveur** (`credit_demo_xp`, plafonné, une fois par compte). Rien n'est accordé côté client.

### 5. Prix réellement configurés (`public.plans`, seed `supabase/sql/schema.core.sql`, lus par `api.getPlans()`)

| Plan | Mensuel | Annuel |
| --- | --- | --- |
| Free | ₹0 (3 deals / semaine) | — |
| Core | ₹499 | ₹4 990 |
| Pro | ₹999 | ₹9 990 |
| Elite | ₹1 999 | ₹19 990 |

- Monnaie **INR**, pas USD : les `$9.99` / `$5.99 étudiant` du brief **ne sont pas** la config. La landing affichera ce que renvoie `getPlans()`.
- **Aucune ligne étudiant** n'existe → elle n'apparaît pas.
- **Un prix annuel existe** → la bascule annuelle reste possible (règle [DÉCISION DEV] satisfaite).

### 6. Bundle et Lighthouse (build de référence, 233a0a9)
- JS initial de la landing (scripts + modulepreload d'`index.html`, hors `three`) : **≈ 257 KB gzip** (react 83, motion 57, supabase 57, index 44, Landing 10,7, divers 5).
- CSS : 20 KB gzip. Polices préchargées : Inter 73 KB, Space Grotesk 22 KB, Instrument Serif 22 KB.
- **`three` (283 KB gzip) est en `modulepreload` dans `index.html`** alors qu'il n'est chargé qu'en dynamique : il concurrence le LCP. À corriger en Phase 3 (le chunk reste lancé dès l'arrivée, mais après le rendu du texte).
- Lighthouse mobile (mesure Phase 8 Director's Cut, même build) : **85–87**, LCP 3,5–3,7 s (simulé), CLS 0, TBT 80–130 ms. `lighthouse` n'est pas installé sur cette machine ; la mesure de Phase 4 se fera avec Playwright (LCP / long tasks) faute de mieux.

## Suivi des phases
- [x] Phase 0 — audit
- [ ] Phase 1 — soustraction
- [ ] Phase 2 — identité Prism Chrome
- [ ] Phase 3 — Vale 3D (`/dev/vale`) → **arrêt pour validation**
