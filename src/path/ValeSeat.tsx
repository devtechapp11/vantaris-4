import { lazy, Suspense, useEffect, useState } from 'react';
import { hasWebGL } from '../app/useDevice';
import { deskOf, type Desk } from '../vale/outfits/outfitRegistry';
import '../vale/vale3d.css';

const ValeMini = lazy(() => import('../vale/ValeMini'));

/** Weak devices keep the still: ≤ 4 cores AND ≤ 4 GB (when the browser says). */
const weak = () => {
  const n = navigator as Navigator & { deviceMemory?: number };
  return (n.hardwareConcurrency ?? 8) <= 4 && (n.deviceMemory ?? 8) <= 4;
};

/**
 * Vale's seat beside the active node. The poster of his desk outfit paints
 * first (the path never waits for 3D); the 3D canvas loads once the page is
 * idle, on capable devices with WebGL.
 */
export default function ValeSeat({ level, reduced, size = 140, outfit }: { level?: string; reduced: boolean; size?: number; outfit?: Desk | null }) {
  // outfit: null = bare Vale (before the player has a desk).
  const desk = outfit === undefined ? deskOf(level ?? 'Analyst') : outfit;
  const [can3d] = useState(() => typeof window !== 'undefined' && hasWebGL() && !weak());
  const [armed, setArmed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!can3d) return undefined;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => setArmed(true), { timeout: 1500 });
    return () => cancel(id);
  }, [can3d]);
  return (
    <span className="vale-seat" style={{ width: size, height: size }} aria-hidden="true">
      <img className={`vale-seat-poster ${ready ? 'is-gone' : ''}`} src={desk ? `/vale/poster-${desk}.webp` : '/vale-poster.avif'} alt="" width={size} height={size} decoding="async" onError={(e) => { e.currentTarget.hidden = true; }} />
      {can3d && armed && (
        <Suspense fallback={null}>
          <ValeMini desk={desk} reduced={reduced} onReady={() => setReady(true)} />
        </Suspense>
      )}
    </span>
  );
}
