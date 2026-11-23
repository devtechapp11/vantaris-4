/**
 * The one channel between the screens and the background shader. Screens
 * write; ObsidianField reads every frame. No React state, no re-renders.
 */
export const fieldBus = {
  /** 0 calm · 0.35 at x2 · 0.6 at x3 · 1 at x5 */
  intensity: 0,
  pulseX: 0.5,
  pulseY: 0.5,
  pulseAt: -1,
  /** Sends a shockwave from the centre of `el` (or the last origin). */
  pulse(el?: Element | null) {
    if (el) {
      const r = el.getBoundingClientRect();
      this.pulseX = (r.left + r.width / 2) / innerWidth;
      this.pulseY = 1 - (r.top + r.height / 2) / innerHeight;
    }
    this.pulseAt = performance.now();
  },
  /** Maps the combo multiplier (1, 2, 3, 5) to the field's intensity. */
  setMultiplier(mult: number) {
    this.intensity = mult >= 5 ? 1 : mult >= 3 ? 0.6 : mult >= 2 ? 0.35 : 0;
  },
};
