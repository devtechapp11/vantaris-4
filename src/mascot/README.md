# Mascot clips (Higgsfield → app)

The app already has a slot for the mascot on every screen where it reacts.
Until clips exist, a placeholder coin face shows instead.

## Moods to generate

| Mood        | Where it shows                                  | Length  | Loop |
|-------------|-------------------------------------------------|---------|------|
| `idle`      | Home header, empty states                       | 3–4 s   | yes, seamless |
| `wave`      | Welcome screen                                  | 2–3 s   | no (plays once) |
| `think`     | Tutor, paywall, locked problems                 | 3–4 s   | yes, seamless |
| `cheer`     | Correct answer                                  | 2 s     | no |
| `sad`       | Wrong answer (keep it light, not miserable)     | 2 s     | no |
| `celebrate` | Payment confirmed, level up                     | 2–3 s   | no |

One-shot moods return to `idle` when they end.

## Export settings

- Square 1:1, 720×720 (1080×1080 is fine too, it gets scaled down)
- 24 or 30 fps, no audio
- Character centred, with at least 12% empty space around it: the app feathers
  the edges into a circle
- Background: one flat colour. Use `#E6EBE8` (it matches the app's light theme
  stage). For the cleanest result in both themes, export with a transparent
  background instead (WebM VP9 with alpha + an HEVC-with-alpha .mov for Safari)
- First and last frame identical for the looping moods (`idle`, `think`)

## Convert and compress (ffmpeg)

Run these for each mood (example: `idle`), from the folder with the Higgsfield export:

```bash
# MP4 (Safari, iPhone): H.264, ~1 MB
ffmpeg -i idle-source.mp4 -an -vf "scale=720:720:flags=lanczos,fps=30" -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 24 -movflags +faststart idle.mp4

# WebM (Chrome, Android): VP9, smaller
ffmpeg -i idle-source.mp4 -an -vf "scale=720:720:flags=lanczos,fps=30" -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 idle.webm

# Poster (first frame) for instant display and reduced motion
ffmpeg -i idle.mp4 -frames:v 1 -vf "scale=360:360" -q:v 80 idle.webp
```

Aim for under 1.5 MB per clip.

## Hook them up

1. Put `idle.mp4`, `idle.webm`, `idle.webp` (and the same for each mood) in this folder.
2. Open `src/mascot/manifest.js` and replace `null` for each mood, for example:

```js
idle: { webm: '/mascot/idle.webm', mp4: '/mascot/idle.mp4', poster: '/mascot/idle.webp', loop: true },
cheer: { webm: '/mascot/cheer.webm', mp4: '/mascot/cheer.mp4', poster: '/mascot/cheer.webp', loop: false },
```

3. Deploy. Clips pause when off screen, and people who turn on "Reduce motion"
   see the poster frame instead.
