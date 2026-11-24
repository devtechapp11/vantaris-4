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

/** Lets any screen make Vale react, and optionally look at an element. */
export const valeBus = {
  react(mood: ValeMood, opts: { gaze?: Element | null } = {}) {
    const e = { mood: ALIAS[mood] ?? mood, gaze: opts.gaze };
    listeners.forEach((l) => l(e));
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
