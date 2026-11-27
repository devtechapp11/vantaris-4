import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { sfx } from '../lib/sfx/engine';
import './rituals.css';

const DIGITS = '0123456789';

/**
 * Split-flap figures: each character clacks through a few flaps (400 ms, a
 * short mechanical click per flap) before it settles. Used for the rank and
 * the XP credited at the end of a lesson. Reduced motion: the figure, at once.
 */
export default function SplitFlap({ value, className = '', label, sound = true }: { value: string; className?: string; label?: string; sound?: boolean }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (reduce || prev.current === value) {
      setShown(value);
      prev.current = value;
      return undefined;
    }
    prev.current = value;
    const steps = 8; // 8 × 50 ms = 400 ms
    let k = 0;
    const id = window.setInterval(() => {
      k += 1;
      if (k >= steps) {
        window.clearInterval(id);
        setShown(value);
        if (sound) sfx.flap();
        return;
      }
      setShown(value.replace(/\d/g, (d, at: number) => (k < steps - (at % 3) ? DIGITS[(Number(d) + k * 3 + at) % 10] : d)));
      if (sound && k % 2 === 0) sfx.flap();
    }, 50);
    return () => window.clearInterval(id);
  }, [value, reduce, sound]);
  return (
    <span className={`flap ${className}`} role="text" aria-label={label ?? value}>
      {[...shown].map((c, i) => (
        <span key={i} className={`flap-cell ${/\d/.test(c) ? '' : 'flap-cell--sym'}`} aria-hidden="true">{c}</span>
      ))}
    </span>
  );
}
