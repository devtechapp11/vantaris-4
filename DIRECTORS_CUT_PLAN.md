# Director's Cut — audit et plan

Branche : `redesign/obsidian-platinum`. `main` intacte, aucun déploiement production.

## Phase 0 — Audit de l'existant

### 1. API réelle

| Module | Fichier | API relevée |
| --- | --- | --- |
| ObsidianField | `src/fx/field/ObsidianField.tsx` + `obsidianField.frag` | WebGL2 plein écran, rendu sous la résolution native (×0,5 téléphone, ×0,75·dpr desktop), 30 fps max sur téléphone, pause onglet caché, image fixe en mouvement réduit, repli CSS sans WebGL2. Uniforms : `uRes`, `uTime`, `uPointer` (0..1, origine bas-gauche), `uIntensity` (0..1), `uPulse` (xy origine, z âge en s, < 0 = aucune). Boucle `loop → draw(now)`, `resize()`. Le `fwidth` de la grille est calculé **hors branche** (correctif existant à conserver). |
| fieldBus | `src/fx/field/fieldBus.ts` | `intensity`, `pulseX`, `pulseY`, `pulseAt`, `pulse(el?)`, `setMultiplier(mult)`. |
| MonolithScene | `src/landing/hero/MonolithScene.tsx` | `MonolithScene({ low, active, onReady })` → `<Canvas>` avec `ThirtyFps`, `Studio`, **`Slabs`** (le groupe qui suit l'inertie du pointeur ; il n'y a pas de `Rig`/`Slab` séparés), `FirstFrame`. État partagé `ledger` (`locked`, `lockedAt`, `explode`, `orbit`, `reassemble`, `lock()`, `subscribe()`). Monté par `MonolithStage` (`fixed` desktop / `inline` mobile, chargé en lazy). |
| SfxEngine | `src/lib/sfx/engine.ts` | Privés : `ready()`, `impulse()`, `env()`, `tone(freq, {type,a,d,peak,when,send,glideTo})`, `bell(freq, when, peak, d, send)`, `click(when, freq, peak, d)`, `ctx`, `master`, `verbSend`. Publics : `unlock`, `tick`, `press`, `correct(combo)`, `wrong`, `comboUp`, `starImpact`, `promotion`, `muted`. `comboOf(run)`. |
| haptics | `src/lib/haptics.ts` | `haptics.fire(pattern)` ; `HAPTIC = { tick, press, correct, wrong, combo, star, promotion }`. |
| springs | `src/motion/springs.ts` | `snappy` 520/32, `soft` 220/26, `heavy` 140/16/1,3. |
| AnimatedNumber | `src/components/fx/AnimatedNumber.tsx` | `{ value, format?, prefix?, suffix?, className? }` (pas de `decimals` : on passe un `format`). |
| Vale | `src/components/vale/Vale.tsx` + `valeBus.ts`, dessin `src/components/MascotSVG.jsx` | `Vale({ mood, size, live, follow, className, label })`. **Suit déjà le curseur** (`lookAt: 'pointer'`), cligne, accepte une cible `{x, y}` en -1..1. `valeBus.react('idle'│'celebrate'│'combo'│'encourage')`. `MascotSVG` nettoie déjà `useId()`. |

Décision : Vale suivant déjà le curseur, **on garde son système** (règle 5.2) et on branche `valeBus` dessus (humeurs étendues + regard vers un élément). `ValeEyes.tsx` n'est pas créé. Le nettoyage `useId().replace(/:/g, '')` est appliqué à `SkillRadar` et à tous les nouveaux SVG à dégradés.

### 2. Points d'accroche dans l'exercice (`src/screens/Learn.jsx`)
- Combo : `comboOf(tally.run)` dans `onGraded` ; `fieldBus.setMultiplier` dans un effet.
- Bonne réponse : `sfx.correct(tier)`, `haptics.fire(HAPTIC.correct)`, `fieldBus.pulse(el)`, `metalBurst.burst(el, 'correct')`, `valeBus.react('celebrate')` ; palier : `sfx.comboUp`, `valeBus.react('combo')`, `metalBurst.burst(badge, tier)`.
- Erreur : `sfx.wrong()`, `haptics.fire(HAPTIC.wrong)`, `valeBus.react('encourage')`. La bonne option porte `data-state="answer"` après correction.

### 3. Données disponibles
| Besoin | Source réelle |
| --- | --- |
| XP par jour (7 j) | `me.week[7]` (`{date, points}`) |
| XP par jour (30 j) | `points_ledger` (lecture RLS de ses propres lignes) — nouvel appel `api.getHistory(30)` ; démo : `state.ledger` |
| Maîtrise / Elo par compétence | `skill_mastery` via `get_desk().mastery` (migration phase 6, **non appliquée**). En attendant : maîtrise = étoiles du chapitre / 3 (donnée réelle), Elo affiché « — ». **À signaler.** |
| Classement | `get_leaderboard(scope)` (lignes `name`, `rank`, `points`, `is_me`) |
| Nombre de deals | `get_public_stats().problems` (anon) |
| Série | `me.profile.streak` |

### 4. Flux Razorpay
Checkout dans `src/screens/Plans.jsx` → `src/lib/razorpay.js` (`rzp.open()`) → `api.confirmPayment(response)` → Edge Function `billing` action `verify-payment` : HMAC vérifié côté serveur, abonnement et paiement relus chez Razorpay. **Renvoie aujourd'hui `{ ok, status }` seulement** (pas de montant, devise, plan, date). Phase 7 : la réponse est étendue (champ `receipt` lu sur l'objet paiement Razorpay côté serveur). Tant que la fonction n'est pas redéployée, l'écran affiche une confirmation sans reçu (jamais de valeurs client).

### 5. Prix
`public.plans` (seed dans `supabase/sql/schema.core.sql`) : `core/pro/elite × monthly/yearly`, en paise INR. **Un prix annuel existe** → `BillingSwitch` affiché ; économie = `12 × mensuel − annuel` (ex. Core : ₹998). Lecture via `api.getPlans()`.

### 6. `check-palette.mjs`
Contrôle les hex, `rgb()/rgba()` (triplets des couleurs autorisées acceptés) et refuse `hsl()`. Aucun changement nécessaire.

### 7. Fichiers par phase
- **P1** : `src/styles/typography.css`, `src/components/fx/GlassStat.tsx`, `glass.css`, `src/components/pricing/BillingSwitch.tsx`, `billing-switch.css`, `main.jsx`, `vite.config.js` (preload italique).
- **P2** : `src/fx/field/glyphAtlas.ts`, `obsidianField.frag`, `ObsidianField.tsx`, `fieldBus.ts`, `PromotionCeremony.tsx`, scènes posées dans `App.jsx` / `Learn.jsx`.
- **P3** : `src/landing/hero/Medallions.tsx`, `TelemetryBadges.tsx`, `heroStore.ts`, `MonolithScene.tsx`, `MonolithStage.tsx`, `content/landing.js`, `Landing.jsx`, `monolith.css`.
- **P4** : `engine.ts` (printFeed, tear, stamp, hold*), `src/components/receipt/ThermalReceipt.tsx` + css, `DemoDeals.tsx`, `demoScore.ts`, Path (« n tickets on your desk »).
- **P5** : `valeBus.ts`, `Vale.tsx`, `ValeSplashHook.tsx`, `ValeDock`, `HoldToConfirmButton.tsx` + css, `prefs.js` (Show Vale, Hold to confirm), `FeelMenu.tsx`, `Learn.jsx`, `Blitz.jsx`.
- **P6** : `src/components/viz/DotMatrixChart.tsx`, `DotMatrixNumber.tsx`, `SkillRadar.tsx` + css, `TodaysDesk.tsx`, `Vault.jsx`, `Ranking.jsx`, `api` (`getHistory`).
- **P7** : `Landing.jsx` (échelle + Membership), `Plans.jsx`, `billing/index.ts` (reçu serveur), `PlanCard`.
- **P8** : QA, cases ci-dessous.

## Mesures
(complétées au fil des phases)

## Phase 8 — QA finale
(cochée en fin d'exécution)
