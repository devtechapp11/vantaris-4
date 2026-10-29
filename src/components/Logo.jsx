import { useId } from 'react';
import { BRAND } from '../lib/config';

/** The Vantaris V: two faceted gold arms meeting at a point, with a cyan data point. */
export function VMark({ size = 32, className = '' }) {
  const id = useId();
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold-300)" />
          <stop offset="1" stopColor="var(--gold-500)" />
        </linearGradient>
        <linearGradient id={`${id}-r`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold-500)" />
          <stop offset="1" stopColor="var(--gold-700)" />
        </linearGradient>
      </defs>
      <polygon points="5,8 16,8 24,28 24,41 20.5,41" fill={`url(#${id}-l)`} />
      <polygon points="43,8 32,8 24,28 24,41 27.5,41" fill={`url(#${id}-r)`} />
      <polygon points="24,9.5 27.5,13 24,16.5 20.5,13" fill="var(--cyan)" />
    </svg>
  );
}

export function Wordmark({ className = '' }) {
  return (
    <span className={`wordmark ${className}`} style={{ font: 'var(--fw-heavy) var(--fs-md)/1 var(--font-ui)', letterSpacing: 'var(--tracking-wider)' }}>
      {BRAND.name.toUpperCase()}
    </span>
  );
}

export default function Logo({ size = 28, word = true }) {
  return (
    <span className="row-8" style={{ gap: 'var(--sp-2)' }}>
      <VMark size={size} />
      {word && <Wordmark />}
    </span>
  );
}

/** Main app loader: the pulsing V. */
export function LogoLoader({ label = 'Loading Vantaris' }) {
  return (
    <div className="splash" role="status" aria-label={label}>
      <div className="stack-16 center-x">
        <VMark size={64} className="logo-pulse" />
        <Wordmark />
      </div>
    </div>
  );
}
