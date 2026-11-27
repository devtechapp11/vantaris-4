import { useEffect } from 'react';
import { sfx } from '../lib/sfx/engine';
import './rituals.css';

/**
 * Closing Signature: once the last answer is held (700 ms), a signature line
 * traces itself across the sheet, then the « CLOSED » stamp lands on it.
 */
export default function Signature({ reduced }: { reduced: boolean }) {
  useEffect(() => {
    const t = window.setTimeout(() => sfx.stamp(), reduced ? 0 : 620);
    return () => clearTimeout(t);
  }, [reduced]);
  return (
    <div className={`sig ${reduced ? 'is-still' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 320 60" className="sig-line" preserveAspectRatio="none">
        <path pathLength={1} d="M6 42c18-22 30-30 36-22s-10 26-2 24 20-30 30-28-4 22 6 22 18-18 26-16 2 14 12 12 22-14 34-12 10 8 22 6 30-6 46-6 38 4 64 2" />
        <path pathLength={1} className="sig-rule" d="M6 52H314" />
      </svg>
      <span className="sig-stamp">CLOSED</span>
    </div>
  );
}
