import { useEffect } from 'react';
import { sfx } from '../lib/sfx/engine';
import './rituals.css';

/** Each chapter's monogram, engraved on its seal. */
export const MONOGRAM: Record<string, string> = {
  statements: '3S', dcf: 'DCF', comps: 'COMPS', precedents: 'PREC', lbo: 'LBO', ma: 'M&A', restructuring: 'RX', structuring: 'STR',
};

/**
 * Le Sceau: a chapter closed at 3★ is sealed — a metal disc engraved with its
 * monogram, a stamp's thud. The Vault keeps every seal (from the server's stars).
 */
export default function Seal({ skill, size = 112, stamp = false, label, mono: forced }: { skill: string; size?: number; stamp?: boolean; label?: string; mono?: string }) {
  useEffect(() => {
    if (!stamp) return undefined;
    const t = window.setTimeout(() => sfx.stamp(), 380);
    return () => clearTimeout(t);
  }, [stamp]);
  const mono = forced ?? MONOGRAM[skill] ?? skill.slice(0, 3).toUpperCase();
  return (
    <figure className={`seal ${stamp ? 'is-stamping' : ''}`} style={{ width: size, height: size }} aria-label={label ?? `${mono} seal: chapter mastered`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id={`seal-${skill}`} cx="38%" cy="32%" r="75%">
            <stop offset="0" style={{ stopColor: 'var(--chrome-100)' }} />
            <stop offset="0.55" style={{ stopColor: 'var(--chrome-300)' }} />
            <stop offset="1" style={{ stopColor: 'var(--steel-500)' }} />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="47" fill={`url(#seal-${skill})`} />
        <circle cx="50" cy="50" r="40" className="seal-ring" />
        {Array.from({ length: 36 }, (_, k) => {
          const a = (k / 36) * Math.PI * 2;
          return <line key={k} x1={50 + Math.cos(a) * 43} y1={50 + Math.sin(a) * 43} x2={50 + Math.cos(a) * 46} y2={50 + Math.sin(a) * 46} className="seal-tick" />;
        })}
        <text x="50" y="50" className="seal-mono" textAnchor="middle" dominantBaseline="central" style={{ fontSize: mono.length > 3 ? 15 : 21 }}>{mono}</text>
      </svg>
    </figure>
  );
}
