import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import Mascot from '../components/Mascot';
import { BRAND } from '../lib/config';

// Three deals fanned like lucite deal toys. Figures are inputs, never answers.
const FAN = [
  { kind: 'LBO returns', name: 'Meridian Software', fig: '9.0x', unit: 'EV / EBITDA', rot: -9, x: -58, y: 18 },
  { kind: 'Accretion / dilution', name: 'Pinnacle Healthcare', fig: '25%', unit: 'offer premium', rot: 7, x: 58, y: 22 },
  { kind: 'Terminal value', name: 'Lumen Health', fig: '3.0%', unit: 'perpetual growth', rot: -1, x: 0, y: 0 },
];

export default function Welcome() {
  const reduce = useReducedMotion();
  return (
    <main className="screen screen--bare" style={{ minHeight: '100dvh', justifyContent: 'space-between', gap: 28 }}>
      <div className="center" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 22px)' }}>
        <span style={{ font: '600 19px/1 var(--font-display)', letterSpacing: '0.16em' }}>{BRAND.name.toUpperCase()}</span>
      </div>

      <div style={{ position: 'relative', height: 250, margin: '0 auto', width: '100%', maxWidth: 360 }} aria-hidden="true">
        {FAN.map((card, i) => (
          <motion.div
            key={card.name}
            className="tomb"
            style={{
              position: 'absolute', left: '50%', top: 18, width: 214, marginLeft: -107, padding: '18px 16px 16px',
              zIndex: i, boxShadow: '0 18px 40px rgba(5,10,8,.28)',
            }}
            initial={reduce ? false : { opacity: 0, y: 40, rotate: 0, x: 0 }}
            animate={{ opacity: 1, y: card.y, rotate: card.rot, x: card.x }}
            transition={{ duration: 0.9, delay: 0.12 * i, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="tomb-top" style={{ justifyContent: 'center', fontSize: 11.5 }}>{card.kind}</div>
            <div className="tomb-rule" style={{ margin: '10px 22%' }} />
            <p className="tomb-name" style={{ fontSize: 22 }}>{card.name}</p>
            <div className="fig" style={{ marginTop: 12, fontSize: 24, fontWeight: 600, color: 'var(--brass-bright)' }}>{card.fig}</div>
            <div style={{ fontSize: 12, color: 'var(--on-ink-2)', marginTop: 2 }}>{card.unit}</div>
          </motion.div>
        ))}
        <motion.div
          style={{ position: 'absolute', right: 6, bottom: -6, zIndex: 5 }}
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.55 }}
        >
          <Mascot mood="wave" size={104} />
        </motion.div>
      </div>

      <div className="stack-12 center" style={{ alignItems: 'center' }}>
        <h1 className="t-large" style={{ maxWidth: 420 }}>Learn to value companies like a banker.</h1>
        <p className="t-body" style={{ maxWidth: 400 }}>
          Real deal problems in DCF, LBOs and M&amp;A. Solve one in five minutes, see every step, and climb from Analyst to MD.
        </p>
      </div>

      <div className="stack-8">
        <Link to="/signup" className="btn btn--accent">Get started</Link>
        <Link to="/signin" className="btn btn--plain">I already have an account</Link>
        <p className="t-foot center">Free to start. No card needed.</p>
      </div>
    </main>
  );
}
