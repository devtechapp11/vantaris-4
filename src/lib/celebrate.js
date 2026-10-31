// Confetti, loaded on first use. Respects the in-app "Celebrations" and
// "Reduce motion" settings and the system reduced-motion preference.
import { getPrefs } from '../app/prefs';
import { cssVar } from '../design/tokens';

let loader = null;
const load = () => (loader ??= import('canvas-confetti').then((m) => m.default));

function allowed() {
  const p = getPrefs();
  if (!p.celebrations || p.reduceMotion) return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const palette = () => [cssVar('--platinum', '#E7E8E5'), cssVar('--silver', '#B9BEC0'), cssVar('--aluminium', '#858D92')];

/** Subtle burst for a correct answer. `origin` is 0–1 of the viewport. */
export async function burst(origin = { x: 0.5, y: 0.35 }) {
  if (!allowed()) return;
  const confetti = await load();
  const colors = palette();
  confetti({ particleCount: 60, spread: 70, startVelocity: 38, gravity: 1.1, ticks: 170, scalar: 0.85, origin, colors, disableForReducedMotion: true, zIndex: 95 });
  confetti({ particleCount: 24, spread: 110, startVelocity: 24, ticks: 140, scalar: 0.6, shapes: ['circle'], origin, colors, disableForReducedMotion: true, zIndex: 95 });
}

/** Bigger two-sided shower for a promotion or a new plan. */
export async function shower() {
  if (!allowed()) return;
  const confetti = await load();
  const colors = palette();
  const end = Date.now() + 1100;
  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, scalar: 0.9, zIndex: 95, disableForReducedMotion: true });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, scalar: 0.9, zIndex: 95, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** Origin (0–1 viewport) of an element, for bursts that come out of a card. */
export function originOf(el) {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
}
