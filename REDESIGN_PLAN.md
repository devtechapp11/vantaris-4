# Vantaris — Redesign « Obsidian Platinum » : plan d'exécution

Branche : `redesign/obsidian-platinum` (créée depuis `425cf6b`, l'état actuellement en production).
Rien n'est poussé ni déployé sans accord explicite.

---

## 0. Audit du dépôt

### 0.1 Le stack réel (différent du brief)

| Le brief suppose | Le dépôt contient | Conséquence |
|---|---|---|
| React + **TypeScript** | React 19 en **JavaScript** (`.jsx`), aucun `tsconfig` | Pas de « typecheck » possible aujourd'hui : voir la décision D1 |
| **Tailwind** | **Aucun Tailwind.** Les tokens sont des variables CSS (`src/styles/tokens.css`) et chaque écran a sa feuille `.css` | Les classes Tailwind du brief (`bg-obsidian-2/70`, `-z-10`…) sont traduites en CSS ; voir D1 |
| `framer-motion` | `motion` 12 (`motion/react`) | Même API ; on garde `motion` |
| `three` + `@react-three/fiber` | Déjà présents (mascotte 3D Vale, chargée en lazy) | On ajoute seulement `@react-three/drei`, `maath`, `zod` |
| Vite | Vite 8 (rolldown/oxc), `vite.config.js` | `minify: 'esbuild'` et `esbuild` 0.27 déjà en place |
| Vitest | Absent. Les tests existants sont les tests SQL (`supabase/tests`) et les tests Deno des Edge Functions | Vitest n'est pas dans la liste autorisée : voir D2 |
| Gemini côté client ? | Non : Gemini n'est appelé **que** par l'Edge Function `supabase/functions/tutor` (clé dans les secrets Supabase) | Conforme |

### 0.2 Cartographie

- **Routeur** : `src/App.jsx` (BrowserRouter, ou MemoryRouter pour la démo) et `src/app/routes.js` (loaders lazy, préchargement).
- **Layout de l'app** : `src/components/Shell.jsx` (TabBar mobile + Sidebar desktop, 4 piliers Path / Blitz / Vault / Rank), `src/styles/shell.css`, `src/components/chrome.jsx` (Page, LargeTitle, Segmented, NavBar).
- **Path** : `src/screens/Path.jsx` + `Path.css`. Chemin sinusoïdal SVG, nœuds, plaques de bureau, artefacts CSS 3D. Contenu dans `src/content/path.js`.
- **Bascule Guidé / Libre** : `src/components/PathSwitch.jsx`. La partie libre est `src/screens/Practice.jsx` (bibliothèque de deals + Infinite drill).
- **Écran d'exercice (Path)** : `src/screens/Learn.jsx` (`/learn/:node`, `review`, `drill`). Quatre formats existent déjà : choice, slider, compare, build. Les générateurs paramétriques sont dans `src/content/lessons.js` (48 templates).
- **Écran de résultats** : la fonction `Finish` dans `Learn.jsx`.
- **Deals chronométrés** : `src/screens/Problem.jsx`. L'XP est validée côté serveur par `submit_answer`.
- **Blitz** : `src/screens/Blitz.jsx` + `src/content/blitz.js`.
- **Vault** : `src/screens/Profile.jsx` + `src/components/Vault.jsx` + `src/components/RankCard.jsx`.
- **Rank** : `src/screens/Ranking.jsx`.
- **Landing** : `src/screens/Landing.jsx` + `src/content/landing.js`. Cristal WebGL dans `src/components/gl/IceCrystal.jsx`.
- **Fond de l'app** : `src/components/gl/MetalWaves.jsx` + `src/lib/gl.js`.
- **Son** : `src/lib/sound.js` (Web Audio synthétisé, aucun fichier audio).
- **Haptique** : `haptic()` dans `src/app/prefs.js`. Les préférences (son, effets, mouvement réduit…) sont dans `prefs.js`.
- **Particules** : `src/lib/celebrate.js` (canvas-confetti).
- **Feedback tactile global** : `src/app/feel.js` (clic, survol, spéculaire `--spec`, `--mx`/`--my`).
- **API** : `src/lib/api/real.js` (RPC Supabase) et `src/lib/api/demo.js` (build de démo, backend local). L'alias `@api-impl` les sépare.
- **Base** : `supabase/schema.sql` (source unique, générée par `scripts/build-sql.mjs`). Edge Functions : `billing`, `razorpay-webhook`, `tutor`.
- **Variables d'environnement côté client** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_ANALYTICS_ENDPOINT` (optionnelle). Toutes sont publiques par nature.

### 0.3 Sécurité (prioritaire)

| Point | Statut |
|---|---|
| Clé Gemini côté client | ✅ Absente. Elle n'existe que dans les secrets de l'Edge Function `tutor`. Aucune clé `AIza…` dans l'historique git ni dans les bundles en production (scan des JS live). |
| Clés Razorpay secrètes | ✅ Absentes du client et de l'historique. Seul le **key_id** `rzp_test_…` figure dans `supabase/functions/.env.example` : c'est un identifiant public, pas un secret. |
| `service_role` | ✅ N'apparaît que dans du SQL (`grant`/rôles), jamais comme clé. |
| Clé `anon` Supabase | Publique par conception, protégée par RLS (tests dans `supabase/tests/10_security_and_rules.sql`). |
| **Token GitHub exposé dans une conversation précédente** | ⚠️ **À révoquer** (GitHub → Settings → Developer settings → Tokens), puis à remplacer dans le trousseau macOS. |
| **Texte provisoire visible des utilisateurs** | ⚠️ `src/content/legal.js:84`, dans la politique de confidentialité publiée : « [CONFIRM GEMINI DATA-USE TERMS AND REGION FOR YOUR API PLAN] ». C'est un contenu juridique : il te revient de le compléter. Je ne l'invente pas. |
| En-têtes HTTP | ✅ Déjà présents dans `vercel.json` : CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy. |
| Source maps | ✅ `sourcemap: false`, aucun `.map` dans `dist/`. |
| Intégrité XP | ✅ L'XP des deals est calculée par le serveur (`submit_answer`). Les **étoiles du Path** sont déclarées par le client (`save_lesson`), mais elles ne donnent aucun XP : elles ne servent qu'au déblocage et au Vault. Le score Blitz est déclaré par le client, plafonné à 5000, et ne sert qu'au record personnel (il n'entre pas au classement). |
| Faux joueurs au classement | ✅ Aucun en production. Les 14 joueurs fictifs n'existent que dans le build de démo, explicitement marqué « Preview ». |

---

## 1. Décisions nécessaires avant de coder

- **D1 — TypeScript et Tailwind.** *Recommandation :* pas de Tailwind (sa migration toucherait 4 000 lignes d'écrans pour un gain nul). Les tokens du brief deviennent les variables CSS, avec quelques classes utilitaires. Les **nouveaux** fichiers sont écrits en `.ts`/`.tsx`, avec `tsconfig` (`allowJs`, `strict` sur le TS) et un script `npm run typecheck`. Cela exige d'ajouter `typescript` en devDependency, **hors de la liste autorisée**.
- **D2 — Tests du moteur financier.** Vitest n'est pas autorisé. *Recommandation :* `node --test`, intégré à Node, donc sans dépendance. Sinon il faut ton accord pour Vitest.
- **D3 — Paliers de combo.** Le serveur applique aujourd'hui ×2 à 3, ×3 à **5** et ×5 à 10 bonnes réponses d'affilée (`combo_multiplier`, utilisé par `submit_answer`). Le brief demande ×3 à **6**. Changer le palier touche le calcul de l'XP. *Recommandation :* garder 3/5/10 partout, pour qu'un seul barème existe.
- **D4 — XP dans les leçons du Path.** Le brief prévoit « +10 XP » par réponse, le multiplicateur sur l'XP, +50 XP dans les Capsules Vault, et le score des 3 deals de démo crédité à l'inscription. Aujourd'hui les leçons ne donnent **aucun XP**, volontairement : leur contenu est généré dans le navigateur, donc falsifiable. *Recommandation :* phases 1 à 5 purement visuelles (étoiles, sons, combos visuels sans XP), puis XP des leçons, Capsules et crédit de démo seulement en phase 6, via l'Edge Function `submit-answer` qui recalcule tout côté serveur.
- **D5 — Streak freeze.** Il n'existe pas dans le schéma. Il faudra une colonne et la logique de série dans la migration de la phase 6, soumise à ton accord.
- **D6 — Répétition espacée.** L'existant utilise J+1, 3, 7, 14, 30 (`review_items`, `save_lesson`). Le brief demande J+1, 3, 7, 21. *Recommandation :* garder l'existant et réutiliser `review_items` plutôt que créer une table `mistakes` en double.
- **D7 — Aperçus Vercel.** Pousser la branche sur GitHub crée automatiquement une **URL de prévisualisation Vercel**, sans toucher à `vantaris.finance`. Est-ce autorisé pour te montrer chaque phase, ou tout reste-t-il en local ?
- **D8 — Palette.** Le Bleu Glacier livré hier (`425cf6b`) reste en production jusqu'au merge de cette branche. Le brief réautorise un vert et un rouge **désaturés** (`--gain #7FB89A`, `--loss #C98A8A`), à usage fonctionnel uniquement et toujours doublés d'une icône. Je l'applique tel quel.

---

## 2. Fichiers par phase

### Phase 1 — Tokens, garde-fou, primitives
- **Modifier**
  - `src/styles/tokens.css` : la palette du brief remplace les tokens actuels. Les anciens noms (`--carbon`, `--platinum`…) restent des alias, pour ne pas casser les 30 feuilles CSS.
  - `base.css`, `components.css`, `shell.css` et les CSS d'écrans : suppression de `--ice*` et des halos bleus.
  - `index.html`, `manifest.webmanifest` : couleurs de thème.
- **Créer**
  - `scripts/check-palette.mjs`, branché en `prebuild` (scan des `.js`, `.jsx`, `.ts`, `.tsx`, `.css`).
  - `src/motion/springs.ts`.
  - `src/components/fx/` : `SpecularBorder`, `SpecularCard`, `MagneticButton`, `AnimatedNumber`, `MetalPlate`.
  - `src/components/VantarisWordmark.tsx`, qui remplace `Logo.jsx` partout.
- **Typographie** : Space Grotesk reste pour les titres (c'est la police display actuelle) ; JetBrains Mono avec `ss01`/`cv01`/`zero` sur tous les chiffres ; labels en capitales à `.18em`.

### Phase 2 — ObsidianField
- **Créer** `src/fx/field/obsidianField.frag`, `fieldBus.ts`, `ObsidianField.tsx` : canvas unique monté dans `App.jsx`, partagé par la landing et l'app.
- **Supprimer** `MetalWaves.jsx`.
- **Adapter** les fonds pleins : `body`, `.screen` et les surfaces deviennent semi-transparents avec flou.

### Phase 3 — Landing
- **Dépendances** : `@react-three/drei`, `maath`.
- **Créer**
  - `src/landing/hero/MonolithScene.tsx` (lazy ; uniquement l'`Environment` à `Lightformer` locaux, aucun preset HDR distant, que la CSP bloquerait).
  - Un poster AVIF/WebP pré-rendu dans `public/`.
  - `HudOverlay`, `Shutter` (une fois par session) et `DemoDeals` (3 deals avec calibrage).
- **Supprimer** `IceCrystal.jsx` et `gl.css`.
- **Modifier** `Landing.jsx`/`.css`, `content/landing.js` (2 deals ajoutés : DCF et LBO) et `Logo`.
- **Hors phase 3** : le stockage du score de démo est prévu, mais son attribution au compte attend D4.

### Phase 4 — App
- **Modifier**
  - `Path.jsx`/`.css` : la grille 3 colonnes au-delà de 1280 px (avec le rail « Today's Desk ») et les cartes compactes en tablette.
  - La barre de stats : sticky, sans débordement en haut.
  - `Shell.jsx` (indicateur glissant, son au changement d'onglet).
- **Créer** `PathNode`, `DeskPlaque`, `VaultCache` et `ChapterRelic`. Les reliques utilisent un Canvas partagé avec `<View>` de drei, et des posters AVIF sur mobile.
- **Plus de 3D** : les reliques 3D augmentent le poids de la page ; elles restent lazy et ne sont jamais dans le bundle initial.

### Phase 5 — Dopamine
- **Créer**
  - `src/lib/sfx/engine.ts` et `useSfx`, qui remplacent `sound.js` en gardant ses appels via un adaptateur.
  - `src/lib/haptics.ts`.
  - `src/fx/MetalBurst.tsx`, qui remplace canvas-confetti ; la dépendance est supprimée.
  - `Promotion.tsx` (la cérémonie), qui réutilise `shareCard.js`.
- **Modifier**
  - `Learn.jsx` : ajout du format **Rapid Pair Match**, du flash « 5 in a row », des réactions sensorielles et des étoiles encastrées dans une plaque.
  - `Blitz.jsx` : branchement sur le nouveau moteur de son.

### Phase 6 — Pédagogie et Supabase (migrations soumises, **non appliquées**)
- **Créer**
  - `src/lib/finance/` (moteur pur, avec ses tests).
  - Le schéma zod `DealBrief`.
  - Les migrations : `exercise_pool`, `deal_briefs` pour le Vault, maîtrise Elo par compétence, streak freeze, et XP des leçons validée côté serveur.
  - Les Edge Functions `generate-exercise` (Gemini côté serveur, sortie validée par zod, chiffres recalculés) et `submit-answer`.
- **Modifier**
  - `lessons.js` : chaque template expose un `brief` (rule / trap / real world).
  - `Learn.jsx` : la carte Deal Brief et la section « Briefs » du Vault.

### Phase 7 — Verrouillage
- **Modifier**
  - `vite.config.js` : ajout de `target: 'es2020'`, et suppression de `console`/`debugger` en production.
  - Le chunk `three` regroupe aussi drei.
- **Créer** `scripts/check-dist.mjs` en `postbuild`.
- **Mettre à jour**
  - La CSP de `vercel.json` : elle autorise déjà Supabase et Razorpay ; ajouter `connect-src` seulement si une nouvelle origine apparaît.
- **Documentation** : `SECURITY_NOTES.md`.

---

## 3. Ce que je ne toucherai pas (sauf accord)

- **Base et serveur** : `supabase/schema.sql` et la base de production, les fonctions `submit_answer`, `save_lesson`, `save_blitz`, `combo_multiplier`, `get_leaderboard`, les politiques RLS.
- **Auth et paiement** : l'authentification (`Auth.jsx`, sessions Supabase), Razorpay (`billing`, `razorpay-webhook`, `razorpay.js`, `Plans.jsx`, `PlanCard`).
- **Règles métier** : le déblocage des chapitres (1★ sur le précédent, plafond de niveau du plan), le calcul des étoiles (`starsFor`).
- **Contenu** : les pages légales, sauf pour signaler le texte provisoire.
- **Production** : la branche `main` et tout déploiement en production.

## 4. Risques

- **Performance** : la landing va de 1 canvas WebGL léger à drei + MeshTransmission. L'objectif Lighthouse ≥ 85 exige le poster, `lowPower` sur mobile et le chargement du canvas après le premier rendu.
- **Deux contextes WebGL** : la landing aurait l'ObsidianField et les Monolithes en même temps. Acceptable sur desktop ; sur mobile, les monolithes passent en poster (`lowPower`).
- **Surfaces semi-transparentes sur un fond animé** : lisibilité et coût du `backdrop-filter` sur mobile. Je mesurerai et garderai des surfaces plus opaques si nécessaire.
- **`navigator.vibrate`** : aucun effet sur iOS Safari (c'est attendu, on ne le contourne pas).
- **Lighthouse** : il n'est pas installé ; je le lancerai via `npx lighthouse` (outil ponctuel, pas une dépendance du projet).

---

## 5. QA finale

- [ ] Aucune couleur hors palette (`check-palette` vert), plus aucun bleu saturé ni cristal.
- [ ] Landing : ouverture HUD, scrollytelling des monolithes (verrouillage au deal, vue éclatée), 3 deals avant inscription.
- [ ] Shader : 60 fps desktop, ≥ 30 fps sur un Android milieu de gamme, pause quand l'onglet est caché, fallback sans WebGL2.
- [ ] Path : 5 états de nœud, Capsules Vault Cache, rail droit desktop, tab bar mobile avec safe-area, barre de stats non coupée.
- [ ] Exercice : 4 formats + sons + haptique + particules + combos + flash mi-leçon ; tout désactivable ; `prefers-reduced-motion` respecté.
- [ ] Résultats : 3 étoiles encastrées avec impact, Deal Brief, un seul CTA principal.
- [ ] Promotion de bureau : cérémonie passable, image de partage.
- [ ] Rattrapage : variante dans la leçon + répétition espacée.
- [ ] Aucune clé secrète côté client, XP validée côté serveur, aucun `.map` en production.
- [ ] Build, lint, typecheck et tests verts. Captures à 375 / 768 / 1440.
- [ ] Rien de déployé sans accord.
