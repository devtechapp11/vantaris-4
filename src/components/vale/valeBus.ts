/**
 * Vale's moods. `focus` while a question is open, `delight` on a right answer,
 * `wow` on a combo tier or a 3-star finish, `concern` on a miss (Vale then
 * looks at the right answer). The old names stay as aliases.
 */
export type ValeMood = 'idle' | 'focus' | 'delight' | 'wow' | 'concern' | 'celebrate' | 'combo' | 'encourage';
export type ValeEvent = { mood: ValeMood; gaze?: Element | null };

type Listener = (e: ValeEvent) => void;
const listeners = new Set<Listener>();

const ALIAS: Partial<Record<ValeMood, ValeMood>> = { celebrate: 'delight', combo: 'wow', encourage: 'concern' };

/** Lets any screen make Vale react, and optionally look at an element. The 3D
 *  Vale reads `state` every frame (no React re-render). */
export const valeBus = {
  state: { mood: 'idle' as ValeMood, at: 0, gaze: null as Element | null },
  react(mood: ValeMood, opts: { gaze?: Element | null } = {}) {
    const e = { mood: ALIAS[mood] ?? mood, gaze: opts.gaze };
    this.state = { mood: e.mood, at: typeof performance === 'undefined' ? 0 : performance.now(), gaze: opts.gaze ?? null };
    listeners.forEach((l) => l(e));
  },
  /** A right answer (or a tap on Vale): delight, wow from a x3 combo. */
  correct(tier = 1) {
    this.react(tier >= 3 ? 'wow' : 'delight');
  },
  /** A miss: concern, looking at the right answer when given. */
  wrong(answer?: Element | null) {
    this.react('concern', { gaze: answer });
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/** The app-start splash hands Vale to the desk: while it runs, the desk keeps an empty seat. */
let splashOn = false;
const splashListeners = new Set<() => void>();
export const valeSplash = {
  get: () => splashOn,
  set(v: boolean) {
    splashOn = v;
    splashListeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    splashListeners.add(l);
    return () => {
      splashListeners.delete(l);
    };
  },
};
