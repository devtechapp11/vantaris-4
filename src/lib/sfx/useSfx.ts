import { useEffect } from 'react';
import { setPref, usePrefs } from '../../app/prefs';
import { sfx } from './engine';

/** The engine plus its mute state (persisted as the « Sound » preference). */
export function useSfx() {
  const { sound } = usePrefs();
  return { sfx, muted: !sound, setMuted: (m: boolean) => setPref('sound', !m) };
}

/** Unlocks audio on the first pointerdown or keydown anywhere (autoplay policy). */
export function useSfxUnlock() {
  useEffect(() => {
    const go = () => sfx.unlock();
    addEventListener('pointerdown', go, { passive: true });
    addEventListener('keydown', go);
    return () => {
      removeEventListener('pointerdown', go);
      removeEventListener('keydown', go);
    };
  }, []);
}
