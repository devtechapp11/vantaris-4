// Cookie and analytics consent, kept on this device only.
// Nothing non-essential runs until `analytics` is explicitly true.
import { useSyncExternalStore } from 'react';

const KEY = 'vantaris-consent-v1';
const listeners = new Set();

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v.analytics === 'boolean') return v;
  } catch {
    /* storage blocked: treat as undecided */
  }
  return null;
}

let state = typeof window === 'undefined' ? null : read();

export function getConsent() {
  return state;
}

/** Record a choice. `analytics` is the only optional category today. */
export function setConsent({ analytics }) {
  state = { analytics: Boolean(analytics), decidedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: the choice lasts for this visit */
  }
  listeners.forEach((l) => l());
}

/** Re-open the banner (from the footer or Settings). */
export function resetConsent() {
  state = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useConsent() {
  return useSyncExternalStore(subscribe, getConsent, () => null);
}
