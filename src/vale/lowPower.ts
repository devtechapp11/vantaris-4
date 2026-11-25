/** Low-power devices: smaller reflections, no post-processing, a lower pixel ratio. */
export function isLowPower() {
  if (typeof navigator === 'undefined') return true;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return Boolean(nav.connection?.saveData) || (nav.hardwareConcurrency ?? 8) <= 4 || window.innerWidth < 768;
}

let gl2: boolean | null = null;
/** WebGL available at all? (The poster stays otherwise.) */
export function hasWebGL() {
  if (gl2 != null) return gl2;
  try {
    const c = document.createElement('canvas');
    gl2 = Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    gl2 = false;
  }
  return gl2;
}

export function prefersReducedMotion() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
