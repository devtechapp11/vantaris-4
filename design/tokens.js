// Motion and runtime tokens for Motion, canvas and WebGL.
// Three durations (120 / 200 / 320 ms) and one spring. They mirror the --dur-*
// variables in src/styles/tokens.css (seconds here, milliseconds there).
// Colours are never duplicated: read them with cssVar().

export const duration = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
  // Aliases kept so older call sites resolve to the three steps above.
  instant: 0.12,
  slower: 0.32,
  reveal: 0.32,
  count: 0.9,
  loop: 3,
};

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
};

/** The one spring. The other names point at it so every spring feels the same. */
const theSpring = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 };
export const spring = {
  snappy: theSpring,
  gentle: theSpring,
  bouncy: theSpring,
  step: theSpring,
};

export const stagger = {
  children: 0.05,
  words: 0.08,
  list: 0.07,
};

export const distance = {
  enter: 20,
  exitScale: 0.98,
  shake: [-4, 4, -4, 0],
  float: 3,
  lift: -4,
};

export const parallax = {
  hero: 0.25,
  subtle: 0.1,
  deep: 0.3,
};

/** Read a CSS custom property from :root (for canvas, WebGL and share images). */
export function cssVar(name, fallback = '') {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Tier order (used by badges and the rank ladder). */
export const TIERS = {
  Analyst: { key: 'analyst', rank: 0 },
  Associate: { key: 'associate', rank: 1 },
  VP: { key: 'vp', rank: 2 },
  MD: { key: 'md', rank: 3 },
};
export const LEVELS = ['Analyst', 'Associate', 'VP', 'MD'];
