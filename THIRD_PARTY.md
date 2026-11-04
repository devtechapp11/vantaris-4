# Third-party code, fonts and assets

Everything the shipped site and app contain that we did not write. Versions are
the ones installed when this file was last updated (`package.json` pins ranges).

## Copied into the repository

| What | Where | Source | Licence | Notes |
|---|---|---|---|---|
| **Magnet** (React Bits) | `src/components/vendor/react-bits/Magnet.jsx` | reactbits.dev, github.com/DavidHDev/react-bits | MIT + Commons Clause (`src/components/vendor/react-bits/LICENSE.md`) | Magnetic pull on the primary call-to-action, capped at 4px; off on touch and with reduced motion. |
| **SpotlightCard** (React Bits) | `src/components/vendor/react-bits/SpotlightCard.jsx`, `.css` | same | MIT + Commons Clause | Platinum spotlight at 6% on pricing columns and landing panels; colours swapped for our tokens, light theme removed. |

The Commons Clause allows commercial use **inside** a product; it forbids selling or
redistributing the components themselves. Keep the licence file next to them.

Not used, and why:

- **Shaders.com**: not reachable from the build environment and the brief allows free
  shaders only. The landing hero uses an in-house liquid-metal shader
  (`LiquidMetal` in `src/components/three/MascotScene.jsx`), drawn in the same canvas
  as the mascot so there is only ever one WebGL context. If a Shaders.com Pro shader
  is bought later, it must be recoloured to the palette and rendered in that canvas.
- **Uiverse**: not needed (last resort per the brief).

## npm dependencies (bundled)

| Package | Version | Licence | Used for |
|---|---|---|---|
| react, react-dom | 19.3.1 | MIT | UI |
| react-router-dom | 7.18.4 | MIT | Routing |
| motion | 12.43.0 | MIT | Animation, scroll-linked chapters on the landing page |
| lenis | see package.json | MIT | Smooth scrolling on the public website only (lazy-loaded) |
| three | 0.186.1 | MIT | 3D mascot (lazy chunk, desktop only) |
| @react-three/fiber | 9.8.2 | MIT | React renderer for three |
| three/examples RoomEnvironment | 0.186.1 | MIT | Procedural studio reflections (no HDR download) |
| lucide-react | 1.61.0 | ISC | The one icon set (stroke 1.5) |
| canvas-confetti | 1.9.4 | ISC | Monochrome celebration bursts (lazy, respects settings) |
| @supabase/supabase-js | 2.118.0 | MIT | Backend client (unchanged in this pass) |

Build-only: vite, @vitejs/plugin-react, oxlint (all MIT), playwright (Apache-2.0, icon
and OG image scripts, not bundled).

## Fonts (self-hosted, no third-party requests)

| Font | Package | Licence |
|---|---|---|
| Inter (variable, optical size) | @fontsource-variable/inter 5.3.0 | SIL Open Font License 1.1 |
| Instrument Serif (400) | @fontsource/instrument-serif 5.2.8 | SIL Open Font License 1.1 |

## Mascot and imagery

- **Vale** (the chrome mascot), the V mark, the app icons and the Open Graph image are
  original work made in code for this project (`MascotSVG.jsx`, `MascotScene.jsx`,
  `public/icon.svg`, `scripts/make-og.mjs`).
- **Higgsfield**: nothing generated yet (0 credits). If assets are generated later
  per `docs/higgsfield-prompts.md`, record here: the plan, the job ids, and the owner's
  confirmation that the plan's terms allow commercial use. **Owner to confirm before
  publishing any Higgsfield output.**
