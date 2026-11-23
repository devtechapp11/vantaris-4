import { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { BRAND } from '../lib/config';
import { CAREER, careerName } from '../lib/career';
import { VMark } from './Logo';
import { NumberTicker } from './Momentum';
import { sound } from '../lib/sound';
import './RankCard.css';

const STRENGTH = 14;

/**
 * Every player's rank card: a platinum card that tilts under the finger or the
 * mouse, a holographic sheen following the light. (The black card is Elite's.)
 */
export default function RankCard({ name, level, points, rank, since }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 160, damping: 16, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 160, damping: 16, mass: 0.6 });
  const rotateY = useTransform(sx, [0, 1], [-STRENGTH, STRENGTH]);
  const rotateX = useTransform(sy, [0, 1], [STRENGTH * 0.8, -STRENGTH * 0.8]);
  const gx = useTransform(sx, [0, 1], ['0%', '100%']);
  const gy = useTransform(sy, [0, 1], ['0%', '100%']);
  const holo = useTransform(sx, [0, 1], [0, 360]);
  const light = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.55), rgba(255,255,255,0) 46%)`;
  const iris = useMotionTemplate`linear-gradient(${holo}deg, rgba(255,255,255,0) 20%, rgba(230,233,238,0.38) 38%, rgba(154,163,174,0.12) 50%, rgba(255,255,255,0.42) 62%, rgba(255,255,255,0) 80%)`;

  const idx = Math.max(0, CAREER.findIndex((c) => c.level === level));
  const nextFloor = CAREER[idx + 1]?.floor;
  const floor = CAREER[idx].floor;
  const pct = nextFloor ? Math.min(1, (points - floor) / (nextFloor - floor)) : 1;

  const move = (e) => {
    if (reduce) return;
    const r = ref.current.getBoundingClientRect();
    px.set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    py.set(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div className="rcard-stage" role="img" aria-label={`Rank card: ${name}, ${careerName(level)}, ${points} points${rank ? `, rank ${rank}` : ''}`}>
      <motion.div
        ref={ref}
        className="rcard"
        onPointerMove={move}
        onPointerDown={(e) => { move(e); sound.hover(); }}
        onPointerLeave={reset}
        onPointerUp={reset}
        onPointerCancel={reset}
        style={reduce ? undefined : { rotateX, rotateY }}
        whileTap={reduce ? undefined : { scale: 0.985 }}
      >
        <svg viewBox="0 0 400 252" className="rcard-guilloche" aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => <ellipse key={i} cx="200" cy="300" rx={60 + i * 22} ry={40 + i * 15} />)}
        </svg>
        <motion.span className="rcard-iris" style={reduce ? undefined : { backgroundImage: iris }} aria-hidden="true" />
        <motion.span className="rcard-light" style={reduce ? undefined : { backgroundImage: light }} aria-hidden="true" />
        <div className="rcard-body">
          <div className="between">
            <span className="rcard-brand"><VMark size={20} /> {BRAND.name.toUpperCase()}</span>
            <span className="rcard-rank fig-mono">{rank ? `#${rank}` : 'UNRANKED'}</span>
          </div>
          <div className="rcard-mid">
            <span className="rcard-chip" aria-hidden="true" />
            <span className="rcard-title">{careerName(level).toUpperCase()}</span>
          </div>
          <div className="rcard-foot">
            <div className="rcard-name">{name || 'Analyst'}</div>
            <div className="between rcard-meta fig-mono">
              <span><NumberTicker value={points} /> PTS</span>
              <span>{since ? `SINCE ${new Date(since).getFullYear()}` : 'MEMBER'}</span>
            </div>
            <span className="rcard-track" aria-hidden="true"><i style={{ transform: `scaleX(${pct})` }} /></span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
