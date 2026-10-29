// 2D animated equivalents of the 3D scenes, for phones, low-power devices and
// reduced motion. Pure SVG + CSS, no Three.js. Built for cheap rendering: each
// moving part is its own <svg> layer whose transform/opacity the compositor
// animates, so nothing repaints on the main thread while it moves.
import { useId, useMemo } from 'react';
import { CORE, INNER, MIDDLE, NODES, OUTER } from './sculpture2d';

const circlePath = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
const NODE_PATH = NODES.map(([x, y]) => circlePath(x, y, 3.4)).join('');

/** The hero sculpture, flattened: counter-rotating wireframes around a faceted gold core. */
export function SculptureFallback({ className = '' }) {
  const id = useId().replace(/:/g, '');
  const box = '0 0 520 520';
  return (
    <div className={`sculpt2d ${className}`} aria-hidden="true">
      <svg viewBox={box} className="sculpt2d-layer">
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor="var(--gold-500)" stopOpacity="0.45" />
            <stop offset="0.6" stopColor="var(--plum-700)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--navy-900)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="260" cy="260" r="250" fill={`url(#${id}-glow)`} />
        <ellipse cx="260" cy="260" rx="262" ry="80" transform="rotate(-24 260 260)" fill="none" stroke="var(--cyan)" strokeOpacity="0.45" strokeWidth="1" />
        <circle cx="21" cy="366" r="5" fill="var(--cyan)" />
        <circle cx="499" cy="154" r="4" fill="var(--cyan)" />
      </svg>
      <svg viewBox={box} className="sculpt2d-layer sculpt2d-spin sculpt2d-spin--slow">
        <path d={OUTER} stroke="var(--gold-500)" strokeOpacity="0.28" strokeWidth="1" fill="none" />
      </svg>
      <svg viewBox={box} className="sculpt2d-layer sculpt2d-spin sculpt2d-spin--rev">
        <path d={MIDDLE} stroke="var(--gold-400)" strokeOpacity="0.85" strokeWidth="1.4" fill="none" />
        <path d={NODE_PATH} fill="var(--gold-300)" />
      </svg>
      <svg viewBox={box} className="sculpt2d-layer sculpt2d-spin">
        <path d={INNER} stroke="var(--gold-300)" strokeOpacity="0.55" strokeWidth="1.2" fill="none" />
      </svg>
      <svg viewBox={box} className="sculpt2d-layer sculpt2d-core">
        <defs>
          <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--gold-300)" />
            <stop offset="1" stopColor="var(--gold-700)" />
          </linearGradient>
        </defs>
        {CORE.map(([pts, shade]) => (
          <polygon key={pts} points={pts} fill={`url(#${id}-face)`} stroke="var(--gold-300)" strokeOpacity="0.4" strokeWidth="0.6" style={{ filter: `brightness(${0.55 + shade * 0.75})` }} />
        ))}
      </svg>
    </div>
  );
}

// Deterministic field so the backdrop is identical on every render.
function makeField(count, seed) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const nodes = Array.from({ length: count }, () => ({ x: rnd() * 1000, y: rnd() * 640, r: 0.8 + rnd() * 1.8, cyan: rnd() < 0.25 }));
  // Links bucketed by strength, so all the lines draw as three paths.
  const links = ['', '', ''];
  nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => {
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < 140) links[Math.min(2, Math.floor((1 - d / 140) * 3))] += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }));
  // Dots split into three twinkle groups (gold) plus one cyan group.
  const dots = ['', '', '', ''];
  nodes.forEach((n, i) => {
    dots[n.cyan ? 3 : i % 3] += circlePath(+n.x.toFixed(1), +n.y.toFixed(1), +n.r.toFixed(2));
  });
  return { links, dots };
}

/** Constellation backdrop: fixed points and links; dot groups twinkle on the compositor. */
export function ConstellationFallback({ count = 80, seed = 7, className = '' }) {
  const { links, dots } = useMemo(() => makeField(count, seed), [count, seed]);
  const box = '0 0 1000 640';
  return (
    <div className={`const2d ${className}`} aria-hidden="true">
      <svg viewBox={box} preserveAspectRatio="xMidYMid slice" className="const2d-layer">
        {links.map((d, i) => <path key={i} d={d} stroke="var(--gold-500)" strokeOpacity={0.12 + i * 0.13} strokeWidth="0.9" fill="none" />)}
      </svg>
      {dots.map((d, i) => (
        <svg key={i} viewBox={box} preserveAspectRatio="xMidYMid slice" className={`const2d-layer const2d-twinkle const2d-twinkle--${i}`}>
          <path d={d} fill={i === 3 ? 'var(--cyan)' : 'var(--gold-400)'} />
        </svg>
      ))}
    </div>
  );
}

/** Spinning medal (level up) in CSS 3D. */
export function MedalFallback({ level = 'Associate' }) {
  return (
    <div className="medal2d" data-tier={level}>
      <div className="medal2d-coin">
        <div className="medal2d-face medal2d-front"><span className="medal2d-v">V</span><span className="medal2d-level">{level}</span></div>
        <div className="medal2d-face medal2d-back" />
      </div>
    </div>
  );
}
