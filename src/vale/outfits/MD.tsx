import { useMemo } from 'react';
import { Color, MeshPhysicalMaterial } from 'three';
import { applyMidas } from '../midas';
import { fabric, garment, trim } from './fabric';
import { Flat, OnSurface, SurfaceTube } from './parts';
import { useMaterials } from './useMaterials';

/** MANAGING DIRECTOR: charcoal three-piece, waistcoat showing, pocket square; cufflinks and a fountain pen. */
export default function MD() {
  const m = useMaterials(() => ({
    suit: fabric('#5B6470', { sheen: 0.7, roughness: 0.8 }),
    vest: fabric('#2A3039', { sheen: 0.6, roughness: 0.8 }),
    shirt: fabric('#F8FAFC', { sheen: 0.3 }),
    tie: fabric('#12161D', { sheen: 0.8, roughness: 0.55 }),
    square: fabric('#F8FAFC', { sheen: 0.5, roughness: 0.6 }),
    chrome: trim('#E6E9EE', 0.1),
    pen: applyMidas(new MeshPhysicalMaterial({ color: new Color('#05070B'), roughness: 0.15, clearcoat: 1 })),
  }));
  const shirt = useMemo(() => garment({ top: 0.11, bottom: -0.3, lift: 1.02 }), []);
  const vest = useMemo(() => garment({ top: 0.04, bottom: -0.8, lift: 1.035, open: (t) => (t < 0.3 ? 0.3 * (1 - t / 0.3) : 0) }), []);
  const jacket = useMemo(() => garment({ top: 0.1, bottom: -0.86, lift: 1.055, open: (t) => 0.66 - 0.28 * t }), []);
  return (
    <group>
      <mesh geometry={shirt} material={m.shirt} />
      <OnSurface y={0.07} angle={0} lift={1.04}>
        <mesh material={m.tie} scale={[1, 1.1, 0.6]}><sphereGeometry args={[0.035, 16, 12]} /></mesh>
      </OnSurface>
      <SurfaceTube path={[[0.05, 0], [-0.1, 0], [-0.22, 0]]} radius={0.032} flat={0.3} material={m.tie} lift={1.03} />
      <mesh geometry={vest} material={m.vest} />
      {[-0.12, -0.28, -0.44, -0.6].map((y) => (
        <OnSurface key={y} y={y} angle={0} lift={1.05}>
          <mesh material={m.chrome}><sphereGeometry args={[0.016, 12, 8]} /></mesh>
        </OnSurface>
      ))}
      <mesh geometry={jacket} material={m.suit} />
      {[-1, 1].map((s) => (
        <OnSurface key={s} y={-0.06} angle={s * 0.6} lift={1.07} spin={s * -0.3}>
          <Flat pts={[[s * -0.06, 0.22], [s * 0.15, 0.24], [s * 0.06, 0.06], [s * -0.03, -0.26]]} depth={0.01} material={m.suit} />
        </OnSurface>
      ))}
      <OnSurface y={-0.22} angle={-0.86} lift={1.075} spin={0.15}>
        <Flat pts={[[-0.07, 0], [0.07, 0], [0.05, 0.06], [0, 0.03], [-0.04, 0.07]]} depth={0.008} material={m.square} />
      </OnSurface>
      <OnSurface y={-0.2} angle={-0.66} lift={1.075}>
        <mesh material={m.pen} position={[0, 0.03, 0]}><cylinderGeometry args={[0.012, 0.012, 0.13, 16]} /></mesh>
        <mesh material={m.chrome} position={[0.012, 0.05, 0.006]}><boxGeometry args={[0.005, 0.07, 0.006]} /></mesh>
      </OnSurface>
      {[-1, 1].map((s) => (
        <OnSurface key={s} y={-0.56} angle={s * 1.5} lift={1.07}>
          <mesh material={m.chrome}><boxGeometry args={[0.03, 0.03, 0.02]} /></mesh>
        </OnSurface>
      ))}
    </group>
  );
}
