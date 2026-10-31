# Vale: Higgsfield asset brief

**Status (checked 31 Oct 2026):** the connected Higgsfield account has **0 credits
on the free plan**, so nothing was generated and nothing was spent. The app ships a
procedural mascot instead (`src/components/MascotSVG.jsx` in 2D,
`src/components/three/MascotScene.jsx` in 3D), which matches this brief. Everything
below is ready to run once credits are added. Run the batches in order, and approve
the total once before starting (see the budget table).

## The character (use this block in every prompt)

> Vale, an original mascot: a smooth pebble shaped like a soft, rounded letter V —
> wide rounded shoulders tapering down to a gentle point. Flawless mirror chrome,
> like polished stainless steel, reflecting a dark studio with long softbox
> highlights. A wide black glass visor wraps the upper third like a band. Behind
> the visor, two small round platinum eye lights with a faint glow. No mouth, no
> arms, no legs, no ears, no text, no logos. Monochrome only: black #090A0B,
> carbon #171A1D, aluminium #858D92, silver #B9BEC0, platinum #E7E8E5. Background
> flat black #090A0B. Studio product render, soft contact shadow on a dark floor.

Negative prompt (where the model takes one): *colour, gold, blue, cyan, purple,
neon, rainbow, cartoon face, mouth, limbs, text, watermark, logo, busy background*.

## Budget (approve once)

Prices are what Higgsfield quoted on this account earlier in the project; confirm
with `models_explore` before running, since they change.

| Batch | What | Model (suggested) | Count | Approx. credits |
|---|---|---|---|---|
| 1 | Turnaround sheet, 4 variants to pick from | GPT Image 2.5, 16:9 | 4 | 1 |
| 2 | State cutouts from the chosen variant | GPT Image 2.5 with the variant as reference, 1:1 | 8 | 2 |
| 2b | Background removal on the 8 cutouts | remove_background | 8 | check quote |
| 3 | 3D model from the chosen front view | generate_3d (image → GLB) | 1 | check quote |
| 4 | Website hero loop, 8 s | Seedance 2.5 (start = end frame) | 1 | ~56 (8 s) or Wan 2.7 at ~12 |
| 5 | Open Graph image 1200×630 (optional, a code-made one already ships) | GPT Image 2.5, 1.91:1 | 1 | 0.25 |

**Estimated total: about 60 credits with Seedance, about 16 with Wan 2.7, plus the
background-removal and 3D quotes.** Never exceed the approved amount; stop and ask.
Log each run (date, model, job id, credits) in the table at the bottom.

## Batch 1: turnaround (pick one of four)

Model GPT Image 2.5, aspect 16:9, 4 generations, different seeds.

> Character turnaround sheet of [character block]. Four views in a row, evenly
> spaced, same scale and lighting: front, three-quarter left, side profile, back.
> Orthographic feel, centred, plenty of empty black space between views.

Save as `public/mascot/source/vale-turnaround-v1.png` … `-v4.png`. Pick one; it is
the reference for every later batch.

## Batch 2: state cutouts (8)

Model GPT Image 2.5, 1:1, reference image = chosen turnaround (front view crop),
same seed. One prompt per state, each starting with the character block:

| File | Prompt addition |
|---|---|
| `vale-idle.png` | Facing camera, calm, eye lights steady. |
| `vale-curious.png` | Body tilted 8° to the left, eye lights slightly larger. |
| `vale-typing.png` | Slight forward nod, eye lights looking down. |
| `vale-privacy.png` | Turned away 25°, eye lights dimmed to a faint glow. |
| `vale-success.png` | Nodding forward, eye lights narrowed into happy arcs. |
| `vale-error.png` | Turned 10° to the side as if shaking its head, eye lights normal. |
| `vale-thinking.png` | Eye lights glancing up and to the side, visor reflecting a soft highlight. |
| `vale-celebrate.png` | Hovering slightly above its shadow, eye lights as happy arcs. |

Then run `remove_background` on each and save the transparent PNGs to
`public/mascot/states/`. Export at 512×512, compress to WebP (`cwebp -q 82`); target
under 40 KB each. These are optional upgrades for the share card and marketing; the
app's animated SVG already covers all eight states.

## Batch 3: GLB

`generate_3d` from the chosen front view (transparent cutout). Then in Blender:

1. Decimate to **≤ 50k triangles**; keep the silhouette smooth.
2. Split into named meshes / material slots: `Body` (chrome), `Visor` (black glass),
   `EyeL`, `EyeR` (emissive). The app animates the eyes and visor separately.
3. Origin at the base of the body, +Z facing camera, scale so the height is 2 units.
4. Export `public/mascot/vale.glb`. Compress with `gltfpack -i vale.glb -o vale.glb -cc`
   (meshopt) or Draco.

Budget: the whole mascot payload must stay **≤ ~1.5 MB on mobile** (phones use the
SVG today, so the GLB only loads on desktop). Note for the security pass: decoding
meshopt or Draco uses WebAssembly, which needs `'wasm-unsafe-eval'` in the CSP
`script-src`; an uncompressed GLB under ~1.5 MB avoids that change. To use the GLB,
replace `makeBody()` in `MascotScene.jsx` with a `GLTFLoader` load and keep the same
material setup (the visor/eye shader patch can then be dropped in favour of the slots).

## Batch 4: website hero loop (6–10 s)

Model Seedance 2.5 (or Wan 2.7 for a cheaper draft), 16:9 and 1:1, start frame = end
frame = the chosen idle still, so it loops seamlessly.

> [character block] Camera locked off. Vale floats gently up and down by a few
> centimetres, turns slowly 20° to the left and back, the studio reflections glide
> across the chrome, the eye lights blink once. Ends exactly in the starting pose.
> Background stays flat black #090A0B. No text.

Put the export in `mascot-src/hero-loop.mp4` and run `npm run mascot`. It writes
`public/mascot/hero-loop.webm` (VP9), `hero-loop.mp4` (H.264) and `hero-loop.webp`
(poster), scaled to 1280 px wide, no audio, and fails if either video is over
**2.5 MB**. The landing page shows the poster only on Save-Data or reduced motion and
never autoplays there.

## Batch 5: Open Graph image (optional)

GPT Image 2.5, 1.91:1 (1200×630): the character block, Vale on the right third, a
large empty black area on the left for the wordmark (added in code, never by the
model). Save as `public/og-image.png`. A code-rendered version already ships, built
by `npm run og` from the real SVG mascot.

## Rights

Before using any Higgsfield output commercially, confirm the plan's licence covers
commercial use (free-plan outputs can be restricted) and keep the job ids. Record the
confirmation in `THIRD_PARTY.md`. **Owner to confirm.**

## Run log

| Date | Batch | Model | Job id | Credits |
|---|---|---|---|---|
| 2026-10-31 | balance check | — | — | 0 available, 0 spent |
