import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { usePrefs } from '../../app/prefs';
import './hud.css';

const KEY = 'vantaris.intro.v1';
const COUNT_MS = 400; // 000 → 100
const OPEN_MS = 150; // the plates part

function seen() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
}

/**
 * The opening: two obsidian plates and a 000 → 100 counter, 0.55 s in all,
 * once per browser session. Any click, key, wheel or touch skips it.
 */
export default function Shutter() {
  const prefs = usePrefs();
  const reduce = useReducedMotion() || prefs.reduceMotion;
  const [phase, setPhase] = useState<'count' | 'open' | 'gone'>(() => (reduce || seen() ? 'gone' : 'count'));
  const num = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (phase === 'gone') return undefined;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* storage unavailable */
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / COUNT_MS);
      if (num.current) num.current.textContent = String(Math.round(k * k * (3 - 2 * k) * 100)).padStart(3, '0');
      if (k < 1) raf = requestAnimationFrame(tick);
      else setPhase('open');
    };
    if (phase === 'count') raf = requestAnimationFrame(tick);
    const timer = phase === 'open' ? window.setTimeout(() => setPhase('gone'), OPEN_MS + 20) : 0;
    const skip = () => setPhase('gone');
    const opts = { once: true, passive: true } as const;
    addEventListener('pointerdown', skip, opts);
    addEventListener('keydown', skip, { once: true });
    addEventListener('wheel', skip, opts);
    addEventListener('touchstart', skip, opts);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      removeEventListener('pointerdown', skip);
      removeEventListener('keydown', skip);
      removeEventListener('wheel', skip);
      removeEventListener('touchstart', skip);
    };
  }, [phase]);

  if (phase === 'gone') return null;
  return (
    <div className={`shutter ${phase === 'open' ? 'is-open' : ''}`} aria-hidden="true">
      <i className="shutter-plate shutter-plate--top" />
      <i className="shutter-plate shutter-plate--bottom" />
      <span className="shutter-count fig-mono">
        <span ref={num}>000</span>
        <small>VANTARIS // LEDGER_01</small>
      </span>
    </div>
  );
}
