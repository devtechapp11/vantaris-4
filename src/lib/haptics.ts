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

/**
 * Named cues (the feedback matrix). navigator.vibrate does not exist in any
 * iOS browser (WebKit): a silent no-op there until a native wrapper ships.
 * Under reduced motion only the light `tap` remains.
 */
export type HapticCue = 'tap' | 'correct' | 'wrong' | 'combo' | 'midas' | 'promotion';

const PATTERNS: Record<HapticCue, number | number[]> = {
  tap: 8,
  correct: [12, 40, 18],
  wrong: [30, 60, 30],
  combo: [10, 30, 10, 30, 22],
  midas: [14, 24, 14, 24, 14, 24, 40],
  promotion: [40, 60, 12, 40, 12],
};

export function haptic(cue: HapticCue) {
  if (!getPrefs().haptics || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (cue !== 'tap' && (reduced() || getPrefs().reduceMotion)) return;
  if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive === false) return;
  try {
    navigator.vibrate(PATTERNS[cue]);
  } catch {
    /* unsupported */
  }
}
