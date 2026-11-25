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
- [x] Phase 1 — soustraction
  - Landing : `MonolithScene`/`MonolithStage`/`Medallions`/`TelemetryBadges`/`heroStore`/`ledger`, `Shutter`, `HudOverlay` (croix + labels verticaux), `Ladder`, le film à chapitres et ses 5 visuels data-viz **supprimés**. Reste : nav, hook (Vale 2D en attendant la 3D), promesse, deal, membership, appel final, pied de page.
  - `ObsidianField` : scène `landing` → canvas éteint (`fieldBus.visible = false`, plus aucun dessin GPU). Nouvel uniform `uGrid`. Scènes `app` / `exercise` = glyphes 0, trame 0, grille 0 : il ne reste que le mercure lent. La cérémonie de promotion garde ses glyphes.
  - Démo : calibrage = score + note + action (stats XP/temps/desk retirées), un seul ticket (le dernier deal). Logique et `localStorage` intacts.
  - Prérendu (`index.html`, `HeroShell`) : plus de titre Instrument Serif, seulement le repère du hook.
  - App : `AppHud` supprimé (labels verticaux + croix). Rail : 5 → 3 cartes (bureau + XP vers le suivant + phrase de série · objectif du jour + Blitz · ligue/ghost run). « XP TODAY », la série en dot-matrix et le graphique 7 j disparaissent du rail (Rank a déjà le graphique 30 j, qui contient les 7 derniers jours). Deal Brief du jour → Vault. Vale n'apparaît plus qu'une fois, à côté du nœud actif, avec une bulle (sa phrase ne répète plus l'XP ni la série). Règle numérotée `01 02 03` retirée.
  - Les polices sont remplacées en Phase 2.
- [x] Phase 2 — identité Prism Chrome
  - `tokens.css` : palette void / steel / chrome / prism / gain-loss du plan, `--prism-edge`, `--chrome-text`, `--chrome-button`. Les dégradés métal sont recalculés sur les nouveaux tokens. Alias en fin de `:root` : `--obsidian`, `--obsidian-2`, `--platinum`, `--chrome-hi`, `--white`, `--glacier` (→ `--prism-ice`), `--slate`. `--glacier` n'est utilisé que dans deux liserés métal à 12 % (bords, conforme à la règle prism).
  - `check-palette.mjs` : nouvelle allowlist ; les 4 hex prism (et leurs `rgb()`) échouent hors de `src/styles/tokens.css`. 9 fichiers migrés des anciens hex (`#B9BFC8`, `#8E96A1`, `#D5D9DF`, `#A9B0BA`, `#4A515B`, `#8FA3B8`, `#3B4A5C`, `rgba(143,163,184)`) vers les tokens les plus proches.
  - Polices : Archivo et Martian Mono, fichiers `wdth.css` (axes 62–125 % et 75–112,5 % vérifiés dans le paquet). Inter, Space Grotesk, JetBrains Mono et Instrument Serif désinstallés ; aucune référence restante (`.editorial` supprimé ; splash Vale, cérémonie, plaque image, atlas de glyphes et script OG migrés). Préchargement : `archivo-latin-wdth` (90 KB) + `martian-mono-latin-wdth` (38 KB), soit +11 KB par rapport aux trois polices précédentes.
  - « La largeur = le rang » : `data-rank` (Analyst 62 %, Associate 85 %, VP 105 %, MD/Elite 125 %) via la prop `rank` de `MetalPlate` (plaques de bureau du Path, badge de la barre de stats, carte bureau du rail) et sur le titre de la cérémonie de promotion.
  - Titres de la landing : Archivo 125 %, 800, capitales ; « DO IT. » souligné de `--prism-edge` (2 px).
  - Page de test : `/dev/type` (noindex, hors session ; ouvre aussi dans le build preview).
  - Mouvement : `springs.ts` inchangé ; les courbes GSAP arrivent avec GSAP en Phase 4.
- [x] Phase 3 — Vale 3D (`/dev/vale`) → **arrêt pour validation**
  - **Silhouette** : le galet en V du Vale de l'app (pas la goutte du brief), géométrie désormais partagée (`src/vale/valeShape.ts`, aussi utilisée par `MascotScene`). Visière et yeux ronds peints par le matériau en espace objet : bords nets, ils suivent la surface même quand elle ondule.
  - **Matériau** : `MeshPhysicalMaterial` chrome miroir (`#E6E9EE`, metalness 1, roughness 0,06, clearcoat), iridescence 0,35 / IOR 1,3 / 180–420 nm (le « prism »), ondulation mercure dans le vertex shader (`uDistort` : 0 en mouvement réduit, 0,06 au repos, plus fort en réaction). Pas de `MeshDistortMaterial` : il remplace le shader et aurait perdu la visière et les yeux peints. Vale ignore le brouillard.
  - **Studio** (`ValeStage.tsx`) : `Environment` rendu une fois, sans HDR téléchargé : dôme acier de remplissage, bandes de plafond, panneaux latéraux, deux softboxes verticales derrière la caméra, rebond du sol. Aucune bande horizontale ne traverse le visage (elle se lisait comme une bouche). Bassin `MeshReflectorMaterial` (1024 / 256 en lowPower) qui se fond dans le vide par un brouillard calé sur la caméra.
  - **Vie** (`ValeModel.tsx`) : les yeux suivent le pointeur (ou le doigt) sur toute la page, le corps suit avec inertie, clignement toutes les 2,8–6,4 s (mouvement réduit : un seul), respiration. `valeBus` étendu (`state`, `correct(tier)`, `wrong(el)`) : delight = saut + yeux plissés, wow = tour complet, concern = regarde la bonne réponse. Clic / tap sur Vale → `valeBus.correct(2)`, onde dans le bassin, `sfx.plink()` si le son est activé. `valeRig` exposé pour l'intro de la Phase 4.
  - **Ondes** (`Ripples.tsx` + `rippleBus`) : 6 anneaux additifs, rayon 0 → 3, opacité ≤ 0,4 → 0 en 1,4 s.
  - **Son** : `plink()`, `whoosh()` et `noise(seconds)` (bruit blanc en cache) ajoutés à `SfxEngine`. Pilule `SOUND · OFF/ON` : coupée à chaque visite (`siteSound`), le premier clic débloque l'AudioContext.
  - **Performance** : un seul canvas, `dpr` [1, 1,75] (1,25 en lowPower), lowPower = Save-Data ou ≤ 4 cœurs ou < 768 px, pause hors écran / onglet caché, `gl.compile()` au montage, recadrage automatique en portrait. Posters AVIF capturés depuis le canvas : `public/vale-poster.avif` (8 Ko, 1200²) et `vale-poster-tall.avif` (7 Ko, portrait), affichés sous le canvas jusqu'à la première image et seuls sans WebGL.
  - **Chunk `three`** : il était de nouveau préchargé dans `index.html` (l'assistant de champs de classe transpilé avait atterri dans ce chunk). Les assistants vont maintenant dans un chunk `runtime` : `three` (299 Ko gzip) ne charge plus qu'à la demande.
  - **`public/vale.glb`** : optionnel. `VITE_VALE_GLB=/vale.glb` au build → `useGLTF`, mesh `Body` avec le même matériau et les mêmes réactions ; `Visor`, `EyeL`, `EyeR` affichés s'ils existent.
  - **Mesures** : fps non représentatifs en headless (SwiftShader CPU, ~6 fps) ; à mesurer sur un vrai GPU et un Android milieu de gamme. Aucune erreur console (1440, 375 tactile, 768 en mouvement réduit, build de production).
