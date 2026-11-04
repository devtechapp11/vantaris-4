import { useEffect, useId, useRef } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

/*
  Vale, drawn in 2D: a chrome pebble that echoes the V (wide shoulders, tapering
  to a soft point), a black glass visor and two platinum eye lights. No mouth,
  no limbs. This is the in-app mascot (small and light) and the fallback for
  the 3D one (low power, Save-Data, no WebGL, reduced motion).

  Every animation is transform or opacity, so it stays on the compositor.
*/

// Pebble outline, 200 × 220 box, shared by the body and its rim.
const BODY = 'M100 10 C152 10 188 36 188 84 C188 126 156 170 122 203 C110 215 90 215 78 203 C44 170 12 126 12 84 C12 36 48 10 100 10 Z';
const VISOR = 'M28 84 C28 62 58 54 100 54 C142 54 172 62 172 84 C172 106 144 116 100 116 C56 116 28 106 28 84 Z';
const EYE = { y: 85, dx: 25, r: 6.5 };

/** Where the eyes look for each state (x, y in eye-travel units, -1..1). */
const LOOK = { privacy: [0.9, -0.5], thinking: [0, -0.3] };

/**
 * @param state   idle | curious | typing | privacy | success | error | thinking | celebrate
 * @param lookAt  { x, y } in -1..1 (relative to the mascot), 'pointer', or null
 * @param pulse   change this number to trigger a small nod (one keystroke)
 */
export default function MascotSVG({ state = 'idle', lookAt = null, pulse = 0, interactive = false, style }) {
  const id = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const root = useRef(null);

  // Body: rotation (deg) and offset (px in the 200-unit box), sprung.
  const rot = useMotionValue(0);
  const y = useMotionValue(0);
  const x = useMotionValue(0);
  const sx = useMotionValue(1);
  const sy = useMotionValue(1);
  // Eyes: travel inside the visor, openness (blink) and brightness.
  const ex = useSpring(0, { stiffness: 260, damping: 26 });
  const ey = useSpring(0, { stiffness: 260, damping: 26 });
  const lid = useMotionValue(1);
  const glow = useMotionValue(1);
  const lean = useSpring(0, { stiffness: 200, damping: 22 });
  const eyeX = useScaled(ex, 16);
  const eyeY = useScaled(ey, 7);

  // Follow the pointer or a target, up to 8 degrees, rAF-throttled.
  useEffect(() => {
    if (reduce) return undefined;
    const fixed = LOOK[state];
    if (fixed) {
      ex.set(fixed[0]);
      ey.set(fixed[1]);
      lean.set(fixed[0] * 4);
      return undefined;
    }
    if (lookAt && lookAt !== 'pointer') {
      ex.set(Math.max(-1, Math.min(1, lookAt.x)));
      ey.set(Math.max(-1, Math.min(1, lookAt.y)));
      lean.set(Math.max(-1, Math.min(1, lookAt.x)) * 8);
      return undefined;
    }
    if (lookAt !== 'pointer') {
      ex.set(0);
      ey.set(0);
      lean.set(0);
      return undefined;
    }
    let frame = 0;
    let last = null;
    const onMove = (e) => {
      last = e;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = root.current?.getBoundingClientRect();
        if (!r || !last) return;
        const nx = (last.clientX - (r.left + r.width / 2)) / Math.max(240, window.innerWidth / 2);
        const ny = (last.clientY - (r.top + r.height * 0.4)) / Math.max(240, window.innerHeight / 2);
        const cx = Math.max(-1, Math.min(1, nx));
        const cy = Math.max(-1, Math.min(1, ny));
        ex.set(cx);
        ey.set(cy);
        lean.set(cx * 8);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [lookAt, state, reduce, ex, ey, lean]);

  // State changes: one-shot gestures and looping moods.
  useEffect(() => {
    if (reduce) {
      glow.set(state === 'privacy' ? 0.15 : 1);
      lid.set(1);
      return undefined;
    }
    const runs = [];
    const run = (mv, keyframes, opts) => runs.push(animate(mv, keyframes, opts));
    rot.set(0);
    y.set(0);
    x.set(0);
    glow.set(state === 'privacy' ? 0.15 : 1);
    switch (state) {
      case 'success': // two nods
        run(y, [0, 6, 0, 5, 0], { duration: 0.7, ease: 'easeInOut' });
        run(lid, [1, 0.55, 1], { duration: 0.5, delay: 0.1 });
        break;
      case 'error': // head shake
        run(x, [0, -7, 7, -6, 5, -3, 0], { duration: 0.6, ease: 'easeInOut' });
        run(rot, [0, -3, 3, -2, 0], { duration: 0.6 });
        break;
      case 'curious': // head tilt
        run(rot, 7, { type: 'spring', stiffness: 220, damping: 18 });
        break;
      case 'thinking':
        run(rot, [0, -4, 0, 4, 0], { duration: 4, repeat: Infinity, ease: 'easeInOut' });
        run(ex, [-0.7, 0.7, -0.7], { duration: 2.4, repeat: Infinity, ease: 'easeInOut' });
        run(glow, [1, 0.6, 1], { duration: 1.2, repeat: Infinity, ease: 'easeInOut' });
        break;
      case 'celebrate': // hop, squash, happy eyes
        run(y, [0, -26, 0, -14, 0], { duration: 1, ease: 'easeOut' });
        run(sy, [1, 1.04, 0.94, 1.02, 0.97, 1], { duration: 1 });
        run(sx, [1, 0.97, 1.05, 0.99, 1.02, 1], { duration: 1 });
        run(lid, [1, 0.4, 0.4, 1], { duration: 1.4 });
        break;
      default: // idle, typing, privacy: the slow float is a CSS animation (compositor only)
        break;
    }
    // Blink every few seconds (not while the visor is dimmed).
    let blink = null;
    if (state !== 'privacy' && state !== 'celebrate') {
      const loop = () => {
        blink = setTimeout(() => {
          runs.push(animate(lid, [1, 0.1, 1], { duration: 0.16 }));
          loop();
        }, 2800 + Math.random() * 2600);
      };
      loop();
    }
    return () => {
      runs.forEach((r) => r.stop());
      clearTimeout(blink);
    };
  }, [state, reduce, rot, y, x, sx, sy, lid, glow, ex]);

  // A keystroke: one small nod.
  const firstPulse = useRef(pulse);
  useEffect(() => {
    if (reduce || pulse === firstPulse.current) return undefined;
    const a = animate(y, [0, 3, 0], { duration: 0.18, ease: 'easeOut' });
    return () => a.stop();
  }, [pulse, reduce, y]);

  const tap = interactive && !reduce ? { whileTap: { scaleY: 0.96, scaleX: 1.02 }, transition: { type: 'spring', stiffness: 500, damping: 20 } } : {};

  return (
    <motion.svg ref={root} viewBox="0 0 200 236" style={{ overflow: 'visible', ...style }} aria-hidden="true" {...tap}>
      <defs>
        {/* Mirror chrome: horizon bands from a studio, all from the palette */}
        <linearGradient id={`${id}-chrome`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="var(--platinum)" />
          <stop offset="0.16" stopColor="var(--silver)" />
          <stop offset="0.3" stopColor="var(--aluminium-dark)" />
          <stop offset="0.38" stopColor="var(--aluminium)" />
          <stop offset="0.52" stopColor="var(--platinum)" />
          <stop offset="0.7" stopColor="var(--aluminium)" />
          <stop offset="0.86" stopColor="var(--aluminium-dark)" />
          <stop offset="1" stopColor="var(--silver)" />
        </linearGradient>
        <radialGradient id={`${id}-spec`} cx="0.32" cy="0.18" r="0.42">
          <stop offset="0" stopColor="var(--platinum)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--platinum)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-visor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--carbon)" />
          <stop offset="0.6" stopColor="var(--black)" />
          <stop offset="1" stopColor="var(--black)" />
        </linearGradient>
        <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--platinum)" stopOpacity="0" />
          <stop offset="0.45" stopColor="var(--platinum)" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="var(--platinum)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-floor`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--black)" stopOpacity="1" />
          <stop offset="0.45" stopColor="var(--black)" stopOpacity="0.8" />
          <stop offset="0.7" stopColor="var(--aluminium-dark)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--aluminium-dark)" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-eye`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={`${id}-visor-clip`}><path d={VISOR} /></clipPath>
      </defs>

      {/* Contact shadow on a softly lit floor */}
      <ellipse cx="100" cy="224" rx="62" ry="8" fill={`url(#${id}-floor)`} />

      <motion.g style={{ x, y, rotate: rot, scaleX: sx, scaleY: sy, originX: '50%', originY: '90%' }}>
        <motion.g style={{ rotate: lean, originX: '50%', originY: '90%' }}>
          <path d={BODY} fill={`url(#${id}-chrome)`} />
          <path d={BODY} fill={`url(#${id}-spec)`} />
          {/* 1px top-edge highlight */}
          <path d="M44 30 C70 12 130 12 156 30" fill="none" stroke="var(--platinum)" strokeOpacity="0.85" strokeWidth="1.2" strokeLinecap="round" />
          <path d={BODY} fill="none" stroke="var(--black)" strokeOpacity="0.35" strokeWidth="1" />

          {/* Black glass visor */}
          <path d={VISOR} fill={`url(#${id}-visor)`} />
          <g clipPath={`url(#${id}-visor-clip)`}>
            <rect x="20" y="40" width="160" height="90" fill={`url(#${id}-glint)`} />
          </g>
          <path d="M40 70 C60 60 140 60 160 70" fill="none" stroke="var(--platinum)" strokeOpacity="0.22" strokeWidth="1" strokeLinecap="round" />

          {/* Eye lights */}
          <motion.g style={{ opacity: glow }}>
            <motion.g style={{ x: eyeX, y: eyeY }}>
              <motion.g style={{ scaleY: lid, originX: '50%', originY: `${EYE.y}px` }} filter={`url(#${id}-eye)`}>
                <circle cx={100 - EYE.dx} cy={EYE.y} r={EYE.r} fill="var(--platinum)" />
                <circle cx={100 + EYE.dx} cy={EYE.y} r={EYE.r} fill="var(--platinum)" />
              </motion.g>
            </motion.g>
          </motion.g>
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}

/** A motion value scaled by `k` (eye travel in SVG units). */
function useScaled(mv, k) {
  const out = useMotionValue(mv.get() * k);
  useEffect(() => mv.on('change', (v) => out.set(v * k)), [mv, out, k]);
  return out;
}
