import { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { Lock } from 'lucide-react';
import { BRAND } from '../lib/config';
import { VMark } from './Logo';
import './MemberCard.css';

const YEAR = new Date().getFullYear();

/** Elite member card: black with a chrome wordmark, tilts gently toward the pointer. */
export default function MemberCard({ name, level, score, locked, onLockedClick }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 180, damping: 18 });
  const sy = useSpring(py, { stiffness: 180, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-3, 3]);
  const rotateX = useTransform(sy, [0, 1], [3, -3]);
  const sheenX = useTransform(sx, [0, 1], ['-30%', '130%']);

  const move = (e) => {
    if (reduce || locked || e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const card = (
    <motion.div
      ref={ref}
      className={`mcard ${locked ? 'mcard--locked' : ''}`}
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerUp={reset}
      style={{ rotateX: reduce ? 0 : rotateX, rotateY: reduce ? 0 : rotateY }}
    >
      <svg viewBox="0 0 400 252" className="mcard-rings" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => <circle key={i} cx="352" cy="44" r={26 + i * 18} />)}
      </svg>
      <motion.div aria-hidden="true" className="mcard-sheen" style={{ left: sheenX }} />
      <div className="mcard-body">
        <div className="between">
          <span className="mcard-brand"><VMark size={22} /> <span className="text-chrome">{BRAND.name.toUpperCase()}</span></span>
          <span className="mcard-tier">ELITE</span>
        </div>
        <div className="mcard-chip" />
        <div className="mcard-foot">
          <div className="fig mcard-meta">MEMBER · {(level || 'Analyst').toUpperCase()}</div>
          <div className="mcard-name">{name || 'Your name'}</div>
          <div className="between fig mcard-meta"><span>SCORE {score ?? 0}</span><span>{YEAR}</span></div>
        </div>
      </div>
    </motion.div>
  );

  if (!locked) {
    return <div className="mcard-wrap" role="img" aria-label={`Elite member card for ${name}, ${level}, score ${score}`}>{card}</div>;
  }
  return (
    <button type="button" onClick={onLockedClick} className="mcard-wrap mcard-button" aria-label="Elite member card, locked. See the Elite plan.">
      {card}
      <span className="mcard-lock"><span className="chip chip--strong"><Lock size={13} aria-hidden="true" /> Unlock with Elite</span></span>
    </button>
  );
}
