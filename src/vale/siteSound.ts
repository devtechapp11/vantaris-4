import { setPref } from '../app/prefs';
import { sfx } from '../lib/sfx/engine';

/**
 * Sound on the public site: off by default on every visit, whatever the app
 * preference says. The first tap on the SOUND pill unlocks the AudioContext.
 */
let on = false;
const listeners = new Set<() => void>();

export const siteSound = {
  get: () => on,
  set(v: boolean) {
    on = v;
    if (v) {
      sfx.unlock();
      setPref('sound', true);
    }
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  /** Plays only while the pill says ON. */
  play(fn: (s: typeof sfx) => void) {
    if (on) fn(sfx);
  },
};
