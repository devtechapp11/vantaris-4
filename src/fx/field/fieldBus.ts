export type FieldScene = 'landing' | 'app' | 'exercise' | 'ceremony';

/** Resting glyph matrix and vector trame per scene. Exercises switch the
 *  glyphs off: the background never competes with a DCF. */
const SCENES: Record<FieldScene, [glyphs: number, trame: number]> = {
  landing: [0.6, 1],
  app: [0.35, 0.8],
  exercise: [0, 0.35],
  ceremony: [0.8, 1],
};

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
  glyphAmount: 0.35,
  trame: 1,
  /** Set when the frame-time guard switched the trame off for this session. */
  trameOff: false,
  flashAt: -1,
  flashDur: 1600,
  scene: 'app' as FieldScene,
  /** Sends a shockwave from the centre of `el` (or the screen centre / last origin). */
  pulse(el?: Element | null) {
    if (el) {
      const r = el.getBoundingClientRect();
      this.pulseX = (r.left + r.width / 2) / innerWidth;
      this.pulseY = 1 - (r.top + r.height / 2) / innerHeight;
    } else if (el === null) {
      this.pulseX = 0.5;
      this.pulseY = 0.5;
    }
    this.pulseAt = performance.now();
  },
  /** Maps the combo multiplier (1, 2, 3, 5) to the field's intensity. */
  setMultiplier(mult: number) {
    this.intensity = mult >= 5 ? 1 : mult >= 3 ? 0.6 : mult >= 2 ? 0.35 : 0;
  },
  /** The glyph rain (promotion). */
  flash(ms = 1600) {
    this.flashAt = performance.now();
    this.flashDur = ms;
  },
  setScene(scene: FieldScene) {
    this.scene = scene;
    [this.glyphAmount, this.trame] = SCENES[scene];
    if (this.trameOff) this.trame = 0;
  },
};
