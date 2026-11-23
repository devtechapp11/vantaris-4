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

// Chrome shards catching glacier light: platinum, silver, pure white and refracted blue.
const palette = () => [cssVar('--platinum', '#E4E8EE'), cssVar('--silver', '#B6BEC8'), cssVar('--ice-pale', '#BAE6FD'), cssVar('--ice', '#38BDF8')];
const metals = () => [cssVar('--white-metal', '#F8FAFC'), ...palette()];

// Metal shards and slivers instead of paper confetti.
let shards = null;
function shardShapes(confetti) {
  if (shards) return shards;
  try {
    shards = [
      confetti.shapeFromPath({ path: 'M0 0 L4 1 L1 9 z' }),
      confetti.shapeFromPath({ path: 'M0 0 L10 2 L9 4 L0 3 z' }),
      confetti.shapeFromPath({ path: 'M2 0 L6 3 L3 8 L0 4 z' }),
    ];
  } catch {
    shards = ['square'];
  }
  return shards;
}

/** Subtle burst for a correct answer. `origin` is 0–1 of the viewport. */
export async function burst(origin = { x: 0.5, y: 0.35 }) {
  if (!allowed()) return;
  const confetti = await load();
  const colors = palette();
  confetti({ particleCount: 60, spread: 70, startVelocity: 38, gravity: 1.1, ticks: 170, scalar: 0.85, origin, colors, disableForReducedMotion: true, zIndex: 95 });
  confetti({ particleCount: 24, spread: 110, startVelocity: 24, ticks: 140, scalar: 0.6, shapes: ['circle'], origin, colors, disableForReducedMotion: true, zIndex: 95 });
}

/**
 * Bull run: a burst of polished metal shards out of `origin`, bigger at each
 * multiplier (x2, x3, x5).
 */
export async function feverBurst(x = 2, origin = { x: 0.5, y: 0.4 }) {
  if (!allowed()) return;
  const confetti = await load();
  const colors = metals();
  const shapes = shardShapes(confetti);
  const n = x >= 5 ? 160 : x >= 3 ? 110 : 70;
  confetti({ particleCount: n, spread: 90 + x * 10, startVelocity: 40 + x * 3, gravity: 0.9, decay: 0.92, ticks: 220, scalar: 1.1, shapes, origin, colors, disableForReducedMotion: true, zIndex: 95 });
  confetti({ particleCount: Math.round(n / 3), spread: 360, startVelocity: 18, gravity: 0.4, ticks: 160, scalar: 0.5, shapes: ['circle'], flat: true, origin, colors: [cssVar('--white-metal', '#F8FAFC'), cssVar('--ice-pale', '#BAE6FD')], disableForReducedMotion: true, zIndex: 95 });
  if (x >= 5) {
    setTimeout(() => {
      confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.75 }, shapes, colors, zIndex: 95, disableForReducedMotion: true });
      confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.75 }, shapes, colors, zIndex: 95, disableForReducedMotion: true });
    }, 260);
  }
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
