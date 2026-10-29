# Vale: mascot clips (Higgsfield → app)

Vale (Vantaris Analytical Learning Entity) is a sleek geometric fox in a fitted
navy suit with a gold V tie pin. The app already ships an animated SVG Vale for
all seven expressions, so nothing is blocked on video. When you add Higgsfield
clips, they replace the SVG at sizes of 64px and up; small avatars, the tutor
button and reduced-motion users keep the SVG or the poster frame.

## 1. Make the reference still (once)

Generate one still and reuse it as the start frame for every clip, so Vale looks
identical across expressions. Model: **GPT Image 2.5** (`gpt_image_2_5`), 1:1.
About 0.25 credits.

> Premium 3D character render, Pixar-quality but sleek and grown-up: Vale, a
> minimalist anthropomorphic fox with crisp geometric, faceted facial planes and
> triangular ears. Deep steel-navy fur, white cheek and muzzle markings that form
> a V, piercing amber eyes with a gold glint and a knowing look. Wears a fitted
> midnight-navy suit, crisp white shirt, deep plum tie with a small gold tie pin
> shaped like the letter V, gold cufflinks and a gold pocket square. Half-body
> portrait, centred, facing the camera, confident slight smile, one eyebrow
> subtly raised. Soft gold rim light and cool cyan fill light. Solid flat
> background colour #0A0F1E. Square 1:1 with at least 12% empty space around
> the character. No text, no logos except the V tie pin.

Keep the best result and note its job id; you'll pass it as the start image.

## 2. Make the seven loops

Model: **Wan 2.7** (`wan2_7`), 3 seconds, 720p, 1:1. Pass the reference still
as both `start_image` and `end_image`: the clip leaves the neutral pose and
returns to it, which makes a seamless loop. About **4.5 credits per clip,
roughly 32 credits for all seven**. For higher fidelity use Seedance 2.5 at 4 s
(about 28 credits per clip, about 196 for the set).

Add this to every prompt: *"Camera locked off, background stays flat #0A0F1E,
no text, no extra characters, smooth seamless loop that ends in the starting
pose."*

| File | Prompt |
|---|---|
| `welcome.mp4` | Vale gives a slight confident smile, raises one eyebrow and gives a small, self-assured nod, as if saying "let's close this deal". Breathes gently and blinks once. |
| `think.mp4` | Vale lifts a paw to the chin and glances up and to the right, thinking; a small gold monocle appears over the right eye, then the paw lowers again. |
| `correct.mp4` | Vale gives a sharp approving nod, a gold sparkle glints in both eyes, and a quick, restrained fist pump at shoulder height. |
| `wrong.mp4` | Vale tilts the head with a compassionate, encouraging expression and a soft reassuring smile, like a mentor saying "even senior analysts miss this one". |
| `streak.mp4` | Vale spins a golden pen between the fingers of one paw with a confident grin while small warm flames flicker in the background behind the shoulders. |
| `levelup.mp4` | Vale adjusts the tie with both paws, stands a little taller with the chin up, proud, while tiny gold particles drift upward around the character. |
| `idle.mp4` | Vale reads a document held in both paws, then glances up at the viewer with a knowing look and back down to the page. |

Tips: generate 2 variants of a mood if the face drifts, and keep the one that
matches the still best. If a clip has a visible jump at the loop point, trim
the first and last few frames before converting.

## 3. Convert and hook them up

```bash
mkdir -p mascot-src            # put welcome.mp4, think.mp4, … here
npm run mascot                 # needs ffmpeg
```

`npm run mascot` square-crops each clip to 720×720 at 30 fps, strips audio,
writes `public/mascot/<mood>.webm` (VP9), `.mp4` (H.264, for Safari) and a
`.webp` poster, then rewrites `src/mascot/manifest.js`. Any mood without a clip
keeps the SVG. Aim for under 1.5 MB per clip; the script warns when one is
bigger. `mascot-src/` is git-ignored; commit `public/mascot/`.

## Where each mood appears

| Mood | Where |
|---|---|
| `welcome` | Landing hero, sign-in, onboarding step 1, empty states |
| `think` | Hint button ("Vale is thinking"), tutor while it types, paywall, locked deals |
| `correct` | Correct answer result |
| `wrong` | Wrong answer result |
| `streak` | Home header when the streak is 3 days or more |
| `levelup` | Promotion overlay, payment confirmed, plans page |
| `idle` | Home header, onboarding step 2 |
