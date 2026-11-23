/**
 * Shared state between the landing page and the Ledger Monolith scene. The
 * page writes, the scene reads every frame (no React state, no re-renders).
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export const ledger = {
  /** The three monoliths are slotted together (the demo deal was solved). */
  locked: false,
  /** 0 assembled · 1 fully exploded (« The method » is on screen). */
  explode: 0,
  /** 0 → 1 over the whole page: drives the camera orbit. */
  orbit: 0,
  /** 1 while « Membership » is on screen: forces the reassembled block. */
  reassemble: 0,
  /** performance.now() of the last lock, for the impact. */
  lockedAt: -1,
  lock() {
    if (this.locked) return;
    this.locked = true;
    this.lockedAt = performance.now();
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/** Recomputes explode / orbit / reassemble from the page's sections. */
export function measureLedger() {
  const vh = innerHeight;
  const max = Math.max(1, document.documentElement.scrollHeight - vh);
  ledger.orbit = clamp01(scrollY / max);
  const method = document.querySelector('[data-ledger="method"]');
  const pricing = document.getElementById('pricing');
  const rise = method ? clamp01((vh * 0.95 - method.getBoundingClientRect().top) / (vh * 0.7)) : 0;
  const fall = pricing ? clamp01((vh * 0.95 - pricing.getBoundingClientRect().top) / (vh * 0.6)) : 0;
  ledger.explode = smooth(rise) * (1 - smooth(fall));
  ledger.reassemble = smooth(fall);
}
