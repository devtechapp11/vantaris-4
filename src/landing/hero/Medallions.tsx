import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ledger } from './ledger';

type Kind = 'platinum' | 'chrome' | 'glass';
type Medal = { glyph: string; kind: Kind; orbit: [number, number]; speed: number; phase: number; tilt: number };

// Original engraved glyphs on a guilloché ground: no brand or coin marks.
const MEDALS: Medal[] = [
  { glyph: 'V', kind: 'platinum', orbit: [1.35, 0.9], speed: 0.16, phase: 0.0, tilt: 0.25 },
  { glyph: 'Σ', kind: 'chrome', orbit: [1.2, 0.8], speed: 0.13, phase: 1.3, tilt: -0.35 },
  { glyph: '%', kind: 'glass', orbit: [1.5, 1.0], speed: 0.11, phase: 2.6, tilt: 0.5 },
  { glyph: '×', kind: 'platinum', orbit: [1.15, 0.75], speed: 0.19, phase: 3.9, tilt: -0.15 },
  { glyph: 'Δ', kind: 'chrome', orbit: [1.4, 0.95], speed: 0.14, phase: 5.1, tilt: 0.1 },
];

function useEngraving(glyph: string) {
  const tex = useMemo(() => {
    const s = 256;
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = '#9AA3AE';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = '#5B6470';
      g.lineWidth = 1.2;
      for (let r = 20; r < s / 2 - 24; r += 10) {
        g.beginPath();
        g.arc(s / 2, s / 2, r, 0, Math.PI * 2);
        g.stroke();
      }
      g.strokeStyle = '#2A3039';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(s / 2, s / 2, s / 2 - 14, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#2A3039';
      g.font = '600 120px "Space Grotesk Variable", "Space Grotesk", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(glyph, s / 2, s / 2 + 6);
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }, [glyph]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Face({ kind, bump, slot }: { kind: Kind; bump: THREE.Texture | null; slot: 1 | 2 }) {
  if (kind === 'glass') {
    return <meshPhysicalMaterial attach={`material-${slot}`} color="#12161D" transmission={0.85} thickness={0.2} roughness={0.2} ior={1.45} />;
  }
  return (
    <meshPhysicalMaterial
      attach={`material-${slot}`}
      color={kind === 'chrome' ? '#E6E9EE' : '#C9CED6'}
      metalness={0.85}
      roughness={kind === 'chrome' ? 0.18 : 0.38}
      envMapIntensity={1.8}
      bumpMap={bump}
      bumpScale={0.35}
    />
  );
}

function Medallion({ m, lowPower, frozen }: { m: Medal; lowPower: boolean; frozen: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const clock = useRef(m.phase);
  const bump = useEngraving(m.glyph);
  useFrame((_, dt) => {
    if (!frozen) {
      // A whip when the demo deal locks the monoliths, then calm again.
      const since = ledger.lockedAt < 0 ? Infinity : (performance.now() - ledger.lockedAt) / 1000;
      const boost = Number.isFinite(since) ? 3 * Math.exp(-since / 0.6) : 0;
      clock.current += Math.min(dt, 0.1) * m.speed * (1 + boost);
    }
    const t = clock.current;
    ref.current?.position.set(Math.cos(t) * m.orbit[0], Math.sin(t * 2) * 0.08, Math.sin(t) * m.orbit[1]);
    ref.current?.rotation.set(0.35 + Math.sin(t) * 0.1, t * 1.4, 0.15);
  });
  return (
    <group rotation={[m.tilt, 0, m.tilt * 0.6]}>
      <group ref={ref}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.17, 0.17, 0.03, 48]} />
          <meshPhysicalMaterial attach="material-0" color="#C9CED6" metalness={1} roughness={0.22} />
          <Face kind={m.kind} bump={lowPower ? null : bump} slot={1} />
          <Face kind={m.kind} bump={lowPower ? null : bump} slot={2} />
        </mesh>
      </group>
    </group>
  );
}

/** Five engraved metal tokens orbiting the monoliths (three on low power). */
export default function Medallions({ lowPower, frozen }: { lowPower: boolean; frozen: boolean }) {
  const list = lowPower ? MEDALS.filter((m) => m.kind !== 'glass').slice(0, 3) : MEDALS;
  return <>{list.map((m) => <Medallion key={m.glyph} m={m} lowPower={lowPower} frozen={frozen} />)}</>;
}
