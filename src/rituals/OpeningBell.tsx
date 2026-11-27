import { useEffect, useState } from 'react';
import { sfx } from '../lib/sfx/engine';
import { haptic } from '../lib/haptics';
import { valeBus } from '../components/vale/valeBus';
import './rituals.css';

const KEY = 'vt.bell';
const today = () => new Date().toLocaleDateString('en-CA'); // local date, YYYY-MM-DD

/** First lesson of the local day? (Read once, before the lesson starts.) */
export function bellDue() {
  try {
    return localStorage.getItem(KEY) !== today();
  } catch {
    return false;
  }
}

/**
 * Opening Bell: the first lesson of the local day starts with Vale ringing a
 * small bell — « Market's open. » 1.2 s, a tap skips it.
 */
export default function OpeningBell({ reduced, onDone }: { reduced: boolean; onDone: () => void }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, today());
    } catch {
      /* private mode: it rings again next time */
    }
    sfx.openingBell();
    haptic('tap');
    valeBus.react('delight');
    const a = window.setTimeout(() => setOut(true), reduced ? 700 : 1000);
    const b = window.setTimeout(onDone, reduced ? 800 : 1200);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [onDone, reduced]);
  return (
    <button type="button" className={`bell ${out ? 'is-out' : ''} ${reduced ? 'is-still' : ''}`} onClick={onDone} aria-label="Market's open. Tap to start.">
      <svg className="bell-icon" viewBox="0 0 48 48" width="64" height="64" aria-hidden="true">
        <path d="M24 6a3 3 0 0 1 3 3v1.2c6.3 1.4 10 6.6 10 13.3V31l3.5 4.5H7.5L11 31v-7.5c0-6.7 3.7-11.9 10-13.3V9a3 3 0 0 1 3-3z" />
        <circle cx="24" cy="40" r="3.2" />
      </svg>
      <span className="bell-line">Market's open.</span>
    </button>
  );
}
