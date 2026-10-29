// Device capability checks. 3D scenes only load on devices that can run them
// smoothly; phones, low-power machines and reduced-motion users get the 2D
// animated equivalents instead.
import { useSyncExternalStore } from 'react';
import { usePrefs } from './prefs';

function mediaStore(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const subscribe = (cb) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const mq = window.matchMedia(query);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  };
  return { get, subscribe };
}

const stores = new Map();
export function useMedia(query) {
  if (!stores.has(query)) stores.set(query, mediaStore(query));
  const s = stores.get(query);
  return useSyncExternalStore(s.subscribe, s.get, () => false);
}

let webgl = null;
function hasWebGL() {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webgl = false;
  }
  return webgl;
}

function lowPower() {
  const n = typeof navigator !== 'undefined' ? navigator : {};
  if (n.connection?.saveData) return true;
  if (n.hardwareConcurrency && n.hardwareConcurrency < 4) return true;
  if (n.deviceMemory && n.deviceMemory < 4) return true;
  return false;
}

export const BREAKPOINT = { tablet: '(min-width: 768px)', desktop: '(min-width: 1100px)' };

/** True when this device should render WebGL scenes. */
export function useCan3D() {
  const prefs = usePrefs();
  const fine = useMedia('(pointer: fine) and (min-width: 768px)');
  const reduce = useMedia('(prefers-reduced-motion: reduce)');
  if (!prefs.effects3d || prefs.reduceMotion || reduce || !fine) return false;
  return hasWebGL() && !lowPower();
}

export function useIsDesktop() {
  return useMedia(BREAKPOINT.desktop);
}
