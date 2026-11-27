import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, PointsMaterial, Vector3, type Mesh, type Points } from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { GOLD_LINEAR, midasRun, midasUniforms } from './midas';

const SAMPLES = 200;
const MAX = 40;
const LIFE = 1.1;

/**
 * Gold flakes (Gold Standard only): 200 points sampled on Vale once; while
 * the gold front sweeps, the samples it crosses lift off and fall softly.
 */
export default function Sparkles({ body, reduced }: { body: React.RefObject<Mesh | null>; reduced: boolean }) {
  const pts = useRef<Points>(null);
  const k = useRef({ samples: [] as Vector3[], fired: new Uint8Array(SAMPLES), run: -1, next: 0 });
  const { geo, mat, pos, vel, age } = useMemo(() => {
    const geo = new BufferGeometry();
    const pos = new Float32Array(MAX * 3).fill(1e4);
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    const mat = new PointsMaterial({ color: GOLD_LINEAR, size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false });
    return { geo, mat, pos, vel: new Float32Array(MAX * 3), age: new Float32Array(MAX).fill(LIFE) };
  }, []);
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);

  useFrame((_, dt) => {
    const b = body.current;
    const s = k.current;
    if (!b) return;
    if (!s.samples.length) {
      const sampler = new MeshSurfaceSampler(b).build();
      for (let i = 0; i < SAMPLES; i++) {
        const v = new Vector3();
        sampler.sample(v);
        s.samples.push(v);
      }
    }
    const gold = midasUniforms.uGold.value > 0.5 && !reduced;
    if (s.run !== midasRun.at) {
      s.run = midasRun.at;
      s.fired.fill(0);
    }
    if (gold && midasUniforms.uMidas.value > 0 && midasUniforms.uMidas.value < 1) {
      const r = midasUniforms.uMidas.value * midasUniforms.uReach.value;
      const w = new Vector3();
      for (let i = 0; i < SAMPLES; i++) {
        if (s.fired[i]) continue;
        w.copy(s.samples[i]).applyMatrix4(b.matrixWorld);
        if (Math.abs(w.distanceTo(midasUniforms.uTouch.value) - r) > 0.09) continue;
        s.fired[i] = 1;
        if (Math.random() > 0.35) continue; // 24–40 flakes, not 200
        const j = s.next;
        s.next = (s.next + 1) % MAX;
        pos.set([w.x, w.y, w.z], j * 3);
        vel.set([(Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6], j * 3);
        age[j] = 0;
      }
    }
    let alive = false;
    for (let j = 0; j < MAX; j++) {
      if (age[j] >= LIFE) continue;
      alive = true;
      age[j] += dt;
      vel[j * 3 + 1] -= 1.1 * dt;
      pos[j * 3] += vel[j * 3] * dt;
      pos[j * 3 + 1] += vel[j * 3 + 1] * dt;
      pos[j * 3 + 2] += vel[j * 3 + 2] * dt;
      if (age[j] >= LIFE) pos[j * 3 + 1] = 1e4;
    }
    geo.attributes.position.needsUpdate = alive || gold;
    if (pts.current) pts.current.visible = alive;
  });

  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} />;
}
