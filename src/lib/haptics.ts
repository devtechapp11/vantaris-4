import { getPrefs } from '../app/prefs';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Vibration, if the device has it, the player kept haptics on and the system asks for no reduced motion. */
export const haptics = {
  get enabled() {
    return getPrefs().haptics && !getPrefs().reduceMotion;
  },
  fire(pattern: number | number[]) {
    if (!this.enabled || reduced()) return;
    // Browsers refuse (and log) vibration before the first tap on the page.
    if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive === false) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* unsupported */
    }
  },
};

export const HAPTIC = { tick: 6, press: 8, correct: 14, wrong: [24, 40, 24], combo: [10, 30, 18], star: 22, promotion: [30, 60, 30, 60, 80] };
