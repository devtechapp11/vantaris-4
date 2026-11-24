import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePrefs } from '../../app/prefs';
import { sfx } from '../../lib/sfx/engine';
import { haptics, HAPTIC } from '../../lib/haptics';
import './hold.css';

type Props = {
  children: ReactNode;
  onConfirm: () => void;
  /** Hold duration in ms. */
  duration?: number;
  disabled?: boolean;
  className?: string;
};

/**
 * Press and hold to commit (a Blitz start, closing an LBO or M&A deal). A
 * chrome fill runs along the button with a rising tone; letting go early
 * cancels. Keyboard: hold Space or Enter. With « Hold to confirm » off, or
 * reduced motion's sibling setting, it is a normal button.
 */
export default function HoldToConfirmButton({ children, onConfirm, duration = 900, disabled = false, className = '' }: Props) {
  const prefs = usePrefs() as { holdConfirm?: boolean };
  const hold = prefs.holdConfirm !== false;
  const [p, setP] = useState(0);
  const raf = useRef(0);
  const t0 = useRef(0);
  const live = useRef(false);

  const stop = (done = false) => {
    cancelAnimationFrame(raf.current);
    if (!live.current) return;
    live.current = false;
    if (done) sfx.holdSet();
    else sfx.holdStop();
    setP(done ? 1 : 0);
    if (done) window.setTimeout(() => setP(0), 400);
  };

  const start = () => {
    if (disabled || live.current) return;
    live.current = true;
    t0.current = performance.now();
    sfx.holdStart(duration);
    haptics.fire(HAPTIC.tick);
    const step = (now: number) => {
      const k = Math.min(1, (now - t0.current) / duration);
      setP(k);
      if (k >= 1) {
        stop(true);
        haptics.fire(HAPTIC.press);
        onConfirm();
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    if (live.current) sfx.holdStop();
  }, []);

  if (!hold) {
    return (
      <button type="button" className={`btn btn--primary ${className}`} disabled={disabled} onClick={() => { sfx.press(); onConfirm(); }}>
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`btn btn--primary hold ${p > 0 ? 'is-holding' : ''} ${className}`}
      disabled={disabled}
      aria-describedby={undefined}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start(); }}
      onPointerUp={() => stop(false)}
      onPointerCancel={() => stop(false)}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') stop(false); }}
      onBlur={() => stop(false)}
      style={{ ['--hold' as string]: p }}
    >
      <span className="hold__fill" aria-hidden="true" />
      <span className="hold__label">{children}</span>
      <span className="hold__hint">{p > 0 ? `${Math.round(p * 100)}%` : 'Hold'}</span>
    </button>
  );
}
