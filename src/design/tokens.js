// Motion and runtime tokens for Framer Motion, canvas and WebGL.
// Durations mirror the --dur-* variables in src/styles/tokens.css (seconds here,
// milliseconds there). Colours are never duplicated: read them with cssVar().

export const duration = {
  instant: 0.1,
  fast: 0.16,
  base: 0.24,
  slow: 0.42,
  slower: 0.7,
  count: 1.1,
  reveal: 0.6,
  loop: 3,
};

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  spring: [0.34, 1.56, 0.64, 1],
};

export const spring = {
  snappy: { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 },
  gentle: { type: 'spring', stiffness: 220, damping: 28 },
  bouncy: { type: 'spring', stiffness: 380, damping: 18 },
  step: { type: 'spring', stiffness: 300, damping: 30 },
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

/** Tier metadata shared by badges, module cards and the 3D medal. */
export const TIERS = {
  Analyst: { key: 'analyst', color: '--tier-analyst', bg: '--tier-analyst-bg', rank: 0 },
  Associate: { key: 'associate', color: '--tier-associate', bg: '--tier-associate-bg', rank: 1 },
  VP: { key: 'vp', color: '--tier-vp', bg: '--tier-vp-bg', rank: 2 },
  MD: { key: 'md', color: '--tier-md', bg: '--tier-md-bg', rank: 3 },
};
export const LEVELS = ['Analyst', 'Associate', 'VP', 'MD'];
