import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { usePrefs } from '../../app/prefs';
import Vale from './Vale';
import { valeSplash } from './valeBus';

const KEY = 'vantaris.vale.splash';

/**
 * Once per session, on the app's home: Vale holds the screen for 1.5 s
 * (400 ms with reduced motion), then flies to its seat on Today's desk.
 * Any tap or key skips it.
 */
export default function ValeSplashHook({ enabled }: { enabled: boolean }) {
  const { pathname } = useLocation();
  const prefs = usePrefs() as { showVale?: boolean; reduceMotion?: boolean };
  const reduce = useReducedMotion() || prefs.reduceMotion;
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!enabled || pathname !== '/' || prefs.showVale === false) return undefined;
    try {
      if (sessionStorage.getItem(KEY)) return undefined;
      sessionStorage.setItem(KEY, '1');
    } catch {
      return undefined;
    }
    setOn(true);
    valeSplash.set(true);
    const t = window.setTimeout(() => setOn(false), reduce ? 400 : 1500);
    return () => window.clearTimeout(t);
  }, [enabled, pathname, prefs.showVale, reduce]);

  // The desk's seat mounts in the same commit the splash starts leaving, so
  // the shared layoutId flies the avatar from here to there.
  useEffect(() => {
    if (!on) valeSplash.set(false);
  }, [on]);

  useEffect(() => {
    if (!on) return undefined;
    const skip = () => setOn(false);
    addEventListener('keydown', skip);
    return () => removeEventListener('keydown', skip);
  }, [on]);

  return (
    <AnimatePresence>
      {on && (
        <motion.button
          type="button"
          className="vale-splash"
          aria-label="Skip"
          onClick={() => setOn(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.3 }}
        >
          <Vale size={150} avatar force follow={false} mood="delight" live={false} />
          <p className="vale-splash__line">Your desk is ready.</p>
          <span className="vale-splash__skip">Tap to skip</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
