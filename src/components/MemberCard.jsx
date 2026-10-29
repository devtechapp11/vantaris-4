import { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { Lock } from 'lucide-react';
import { BRAND } from '../lib/config';

/** Elite member card: a brass-on-malachite card that tilts under your finger. */
export default function MemberCard({ name, level, score, locked, onLockedClick }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 180, damping: 18 });
  const sy = useSpring(py, { stiffness: 180, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-14, 14]);
  const rotateX = useTransform(sy, [0, 1], [10, -10]);
  const sheenX = useTransform(sx, [0, 1], ['-30%', '130%']);

  const move = (e) => {
    if (reduce || locked) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const Card = (
    <motion.div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerUp={reset}
      style={{
        rotateX: reduce ? 0 : rotateX,
        rotateY: reduce ? 0 : rotateY,
        aspectRatio: '1.586',
        width: '100%',
        maxWidth: 420,
        margin: '0 auto',
        borderRadius: 18,
        position: 'relative',
        overflow: 'hidden',
        color: '#EDE6D2',
        background: 'radial-gradient(140% 90% at 90% 0%, rgba(212,176,98,.28), transparent 50%), linear-gradient(150deg, #1A2520 0%, #0B100E 55%, #241D0E 100%)',
        boxShadow: '0 22px 50px rgba(0,0,0,.35), inset 0 0 0 1px rgba(212,176,98,.35)',
        filter: locked ? 'grayscale(1) brightness(.75)' : 'none',
        touchAction: locked ? 'auto' : 'none',
        transformStyle: 'preserve-3d',
      }}
    >
      <svg viewBox="0 0 400 252" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={i} cx="352" cy="44" r={26 + i * 18} fill="none" stroke="rgba(212,176,98,.16)" strokeWidth="1" />
        ))}
      </svg>
      <motion.div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, bottom: 0, width: '45%', left: sheenX, translateX: '-50%',
          background: 'linear-gradient(105deg, transparent, rgba(255,255,255,.14), transparent)',
          mixBlendMode: 'screen', pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, padding: '7% 7.5%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ font: '600 clamp(16px, 5.4vw, 22px)/1 var(--font-display)', letterSpacing: '0.14em', color: '#D4B062' }}>
          {BRAND.name.toUpperCase()}
        </div>
        <div style={{ marginTop: '9%', width: '15%', aspectRatio: '1.35', borderRadius: 6, background: 'linear-gradient(140deg, #E6C77A, #9E7B2E)', boxShadow: 'inset 0 0 0 1px rgba(60,44,10,.5)' }} />
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="fig" style={{ fontSize: 'clamp(10px, 2.8vw, 12px)', color: '#9E957B', letterSpacing: '0.08em' }}>
            MEMBER · {(level || 'Analyst').toUpperCase()}
          </div>
          <div style={{ font: '600 clamp(18px, 5.6vw, 24px)/1.1 var(--font-ui)', letterSpacing: '-0.01em' }}>{name || 'Your name'}</div>
          <div className="between fig" style={{ fontSize: 'clamp(10px, 2.8vw, 12px)', color: '#9E957B', letterSpacing: '0.06em' }}>
            <span>SCORE {score ?? 0}</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (!locked) {
    return <div style={{ perspective: 1000 }} aria-label={`Elite member card for ${name}, ${level}, score ${score}`} role="img">{Card}</div>;
  }
  return (
    <button type="button" onClick={onLockedClick} style={{ perspective: 1000, background: 'none', border: 0, padding: 0, width: '100%', position: 'relative' }}
      aria-label="Elite member card, locked. See Elite plan.">
      {Card}
      <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <span className="chip" style={{ background: 'rgba(0,0,0,.55)', color: '#fff', height: 34, padding: '0 14px', fontSize: 14 }}>
          <Lock size={14} aria-hidden="true" /> Unlock with Elite
        </span>
      </span>
    </button>
  );
}
