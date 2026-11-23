import { useRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { springs } from '../../motion/springs';
import { sound } from '../../lib/sound';
import { haptic } from '../../app/prefs';
import './fx.css';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> & {
  children?: ReactNode;
  /** Maximum pull toward the cursor, in px. */
  pull?: number;
};

const MAX = 6;

/**
 * A button that leans toward a fine pointer (never more than 6px) and springs
 * back when it leaves. Pressing it: scale 0.97, a felt click and a short buzz.
 */
export default function MagneticButton({ children, className = '', pull = MAX, onPointerDown, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const fine = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const x = useSpring(tx, springs.snappy);
  const y = useSpring(ty, springs.snappy);

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (!fine || reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    tx.set(Math.max(-1, Math.min(1, dx)) * Math.min(pull, MAX));
    ty.set(Math.max(-1, Math.min(1, dy)) * Math.min(pull, MAX));
  };
  const leave = () => {
    tx.set(0);
    ty.set(0);
  };

  return (
    <motion.button
      ref={ref}
      data-silent=""
      className={`fx-magnetic ${className}`}
      style={{ x, y }}
      whileTap={{ scale: 0.97 }}
      transition={springs.snappy}
      onPointerMove={move}
      onPointerLeave={leave}
      onPointerDown={(e) => {
        sound.tap();
        haptic(8);
        onPointerDown?.(e);
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
