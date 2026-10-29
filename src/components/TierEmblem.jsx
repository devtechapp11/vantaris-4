import { useId } from 'react';

// Metallic finish per tier: [highlight, mid, shadow]
const METAL = {
  Analyst: ['var(--blue-300)', 'var(--blue-500)', 'var(--blue-800)'],
  Associate: ['var(--violet-300)', 'var(--violet-500)', 'var(--violet-800)'],
  VP: ['var(--gold-300)', 'var(--gold-500)', 'var(--gold-700)'],
  MD: ['var(--platinum-300)', 'var(--platinum-500)', 'var(--platinum-700)'],
};
const CHEVRONS = { Analyst: 1, Associate: 2, VP: 3 };

/** Large tier badge: a bevelled metallic hexagon with rank chevrons (a crown for MD). Floats gently. */
export default function TierEmblem({ level = 'Analyst', size = 72, float = true, className = '' }) {
  const id = useId().replace(/:/g, '');
  const [hi, mid, lo] = METAL[level] ?? METAL.Analyst;
  const n = CHEVRONS[level] ?? 0;
  return (
    <span className={`emblem ${float ? 'float' : ''} ${className}`} style={{ width: size, height: size }} role="img" aria-label={`${level} tier badge`}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-m`} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor={hi} />
            <stop offset="0.45" stopColor={mid} />
            <stop offset="0.7" stopColor={lo} />
            <stop offset="1" stopColor={mid} />
          </linearGradient>
          <linearGradient id={`${id}-i`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--navy-900)" stopOpacity="0.15" />
            <stop offset="1" stopColor="var(--navy-900)" stopOpacity="0.55" />
          </linearGradient>
          <clipPath id={`${id}-c`}><path d="M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z" /></clipPath>
        </defs>
        <path d="M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z" fill={`url(#${id}-m)`} />
        <path d="M50 14 L81 32 L81 68 L50 86 L19 68 L19 32 Z" fill={`url(#${id}-i)`} stroke={hi} strokeOpacity="0.55" strokeWidth="1.5" />
        <g fill="none" stroke={hi} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          {n > 0
            ? Array.from({ length: n }, (_, i) => {
                const y = 44 + (i - (n - 1) / 2) * 12;
                return <path key={i} d={`M33 ${y} L50 ${y + 10} L67 ${y}`} />;
              })
            : <path d="M30 62 L33 40 L42 50 L50 34 L58 50 L67 40 L70 62 Z" fill={hi} strokeWidth="3" />}
        </g>
        <g clipPath={`url(#${id}-c)`}>
          <rect className="emblem-sheen" x="-60" y="-10" width="40" height="130" fill="#FFFFFF" opacity="0.35" transform="rotate(20)" />
        </g>
      </svg>
    </span>
  );
}
