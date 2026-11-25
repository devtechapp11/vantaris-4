import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { rippleBus } from './rippleBus';

const POOL = 6;
const LIFE = 1.4; // seconds
const MAX_R = 3;

/**
 * Six thin additive rings lying just above the pool. A drop (rippleBus.emit)
 * takes the oldest ring: its radius grows 0 → 3 while it fades out in 1.4 s.
 */
export default function Ripples({ y = -1.54 }: { y?: number }) {
  const geo = useMemo(() => new RingGeometry(0.97, 1, 128), []);
  const mats = useMemo(() => Array.from({ length: POOL }, () => new MeshBasicMaterial({
    color: new Color('#E6E9EE'), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  })), []);
  const meshes = useRef<(Mesh | null)[]>([]);
  const state = useRef(Array.from({ length: POOL }, () => ({ at: -1, s: 0 })));
  const next = useRef(0);

  useFrame(() => {
    const now = performance.now();
    for (const r of rippleBus.drain()) {
      const i = next.current;
      next.current = (i + 1) % POOL;
      state.current[i] = { at: r.at, s: r.strength };
      meshes.current[i]?.position.set(r.x, y, r.z);
    }
    state.current.forEach((r, i) => {
      const m = meshes.current[i];
      if (!m) return;
      const t = r.at < 0 ? 1 : (now - r.at) / 1000 / LIFE;
      if (t >= 1) {
        m.visible = false;
        return;
      }
      m.visible = true;
      const k = 1 - Math.pow(1 - t, 3); // ease-out
      const radius = Math.max(0.001, k * MAX_R * (0.6 + 0.4 * r.s));
      m.scale.set(radius, radius, radius);
      mats[i].opacity = 0.4 * r.s * (1 - t);
    });
  });

  return (
    <group>
      {mats.map((mat, i) => (
        <mesh key={i} ref={(el) => { meshes.current[i] = el; }} geometry={geo} material={mat} rotation-x={-Math.PI / 2} visible={false} renderOrder={2} />
      ))}
    </group>
  );
}
