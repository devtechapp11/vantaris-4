// Per-device preferences (Profile → Settings). Stored in localStorage and
// readable outside React (haptics, confetti) through getPrefs().
import { useSyncExternalStore } from 'react';

const KEY = 'vantaris-prefs-v1';
const DEFAULTS = { haptics: true, celebrations: true, effects3d: true, reduceMotion: false };

let prefs = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  if (saved && typeof saved === 'object') prefs = { ...DEFAULTS, ...saved };
} catch {
  /* storage unavailable: defaults */
}

const listeners = new Set();
function apply() {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.motion = prefs.reduceMotion ? 'reduce' : 'auto';
  }
}
apply();

export function getPrefs() {
  return prefs;
}

export function setPref(key, value) {
  prefs = { ...prefs, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
  apply();
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePrefs() {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs);
}

/** Vibrate if the device supports it and the player hasn't turned haptics off. */
export function haptic(pattern) {
  if (!prefs.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
