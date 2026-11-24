import { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { ledger } from './ledger';
import { useHero, type HeroState } from './heroStore';

type V3 = [number, number, number];
type Badge = { id: string; anchor: V3; offset: V3; label: string; value?: string; mobile?: boolean };

// Anchors sit on the slabs' idle poses (W 0.5 · H 2.3 · D 0.7).
function badgesOf(h: HeroState): Badge[] {
  const precision = h.played ? `${Math.round((h.right / h.played) * 100)}%` : '—';
  const desk = h.grade ? `${h.grade.toUpperCase()} · PROVISIONAL` : h.played ? `${h.played}/${h.total} DEALS` : 'ANALYST';
  return [
    { id: 'floor', anchor: [-0.6, 0.2, 0.36], offset: [-0.25, -0.5, 0], label: 'Deal floor', value: h.deals != null ? `${h.deals} DEALS` : undefined },
    { id: 'desk', anchor: [0.6, -0.7, 0.36], offset: [-0.45, -0.5, 0], label: 'Next desk', value: desk },
    { id: 'precision', anchor: [0, 1.0, 0.36], offset: [0.35, 0.18, 0], label: 'Your precision', value: precision, mobile: true },
  ];
}

/** HUD badges: an anchor dot on the geometry, a thin leader line, a mono label with sight corners. */
export default function TelemetryBadges({ isMobile }: { isMobile: boolean }) {
  const hero = useHero();
  // Mounted one frame after the canvas: an Html created in the canvas's very
  // first commit can lose its DOM container.
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Only in the hero pose: once the sculpture orbits away with the page, the
  // badges would float over the next sections.
  const [inHero, setInHero] = useState(true);
  useFrame(() => {
    const next = ledger.orbit < 0.08 && ledger.explode < 0.05 && ledger.reassemble < 0.05;
    if (next !== inHero) setInHero(next);
  });
  if (!on || !inHero) return null;
  return (
    <>
      {badgesOf(hero).filter((b) => !isMobile || b.mobile).map((b0) => {
        // Phones: the one badge opens to the left so it stays inside the band.
        const b = isMobile ? { ...b0, offset: [-0.3, 0.3, 0] as V3 } : b0;
        const end: V3 = [b.anchor[0] + b.offset[0], b.anchor[1] + b.offset[1], b.anchor[2] + b.offset[2]];
        return (
          <group key={b.id}>
            <Line points={[b.anchor, end]} color="#9AA3AE" lineWidth={1} transparent opacity={0.45} />
            <mesh position={b.anchor}>
              <sphereGeometry args={[0.018, 12, 12]} />
              <meshBasicMaterial color="#F8FAFC" />
            </mesh>
            <Html position={end} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <div className={`hud-badge ${b.offset[0] < 0 ? 'hud-badge--left' : ''}`}>
                <span className="hud-badge__label">{b.label}</span>
                {b.value && <span className="hud-badge__value num">{b.value}</span>}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
