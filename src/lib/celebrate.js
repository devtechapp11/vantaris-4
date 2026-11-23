// Celebrations, drawn by the MetalBurst canvas (src/fx/MetalBurst.tsx): no
// confetti library, nothing outside the palette. Respects the in-app
// « Particles » and « Reduce motion » settings and the system preference.
import { metalBurst } from '../fx/MetalBurst';

const px = (origin) => ({ x: (origin?.x ?? 0.5) * window.innerWidth, y: (origin?.y ?? 0.4) * window.innerHeight });

/** Small burst for a correct answer. `origin` is 0–1 of the viewport. */
export function burst(origin) {
  const { x, y } = px(origin);
  metalBurst.at(x, y, 12);
}

/** A multiplier step: more shards at x3, and a shock ring at x5. */
export function feverBurst(x = 2, origin) {
  const p = px(origin);
  metalBurst.at(p.x, p.y, x >= 5 ? 100 : x >= 3 ? 55 : 30, x >= 5);
}

/** Two-sided shower for a promotion or a new plan. */
export function shower() {
  const h = window.innerHeight;
  [0, 260, 520].forEach((t) => setTimeout(() => {
    metalBurst.at(0, h * 0.75, 24, false, 0.6);
    metalBurst.at(window.innerWidth, h * 0.75, 24, false, 0.6);
  }, t));
}

/** Origin (0–1 viewport) of an element, for bursts that come out of a card. */
export function originOf(el) {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
}
