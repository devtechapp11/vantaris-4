import { useMemo } from 'react';
import { Color, MeshPhysicalMaterial } from 'three';
import { applyMidas } from '../midas';
import { fabric, garment, surface, trim } from './fabric';
import { Flat, OnSurface } from './parts';
import { useMaterials } from './useMaterials';

/** VICE PRESIDENT: dark blazer, open collar and no tie; a plain watch. */
export default function VP() {
  const m = useMaterials(() => ({
    blazer: fabric('#12161D', { sheen: 0.7, roughness: 0.75 }),
    shirt: fabric('#E6E9EE', { sheen: 0.4 }),
    button: trim('#5B6470', 0.35),
    steel: trim('#C9CED6', 0.12),
    face: applyMidas(new MeshPhysicalMaterial({ color: new Color('#F8FAFC'), roughness: 0.2, clearcoat: 1 })),
  }));
  const shirt = useMemo(() => garment({ top: 0.11, bottom: -0.3, lift: 1.025, open: (t) => (t < 0.25 ? 0.12 * (1 - t / 0.25) : 0) }), []);
  const blazer = useMemo(() => garment({ top: 0.1, bottom: -0.8, lift: 1.05, open: (t) => (t < 0.55 ? 0.56 - (0.44 * t) / 0.55 : 0.12 + (t - 0.55) * 0.6) }), []);
  const watch = useMemo(() => surface(-0.5, 1.45, 1.0), []);
  return (
    <group>
      <mesh geometry={shirt} material={m.shirt} />
      <mesh geometry={blazer} material={m.blazer} />
      {[-1, 1].map((s) => (
        <OnSurface key={s} y={-0.05} angle={s * 0.5} lift={1.065} spin={s * -0.32}>
          <Flat pts={[[s * -0.05, 0.2], [s * 0.1, 0.16], [s * 0.05, 0.02], [s * -0.02, -0.24]]} depth={0.01} material={m.blazer} />
        </OnSurface>
      ))}
      <OnSurface y={-0.42} angle={0.12} lift={1.06}>
        <mesh material={m.button}><cylinderGeometry args={[0.022, 0.022, 0.012, 20]} /></mesh>
      </OnSurface>
      <group position={watch.p.add(watch.n.clone().multiplyScalar(0.07))} rotation={[0, Math.PI / 2, 0]}>
        <mesh material={m.steel}><torusGeometry args={[0.085, 0.012, 12, 48]} /></mesh>
        <mesh material={m.face} position={[0, 0, 0.004]}><circleGeometry args={[0.072, 40]} /></mesh>
      </group>
    </group>
  );
}
