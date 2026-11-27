import { useMemo } from 'react';
import { Color, MeshPhysicalMaterial } from 'three';
import { applyMidas } from '../midas';
import { fabric, garment, surface, trim } from './fabric';
import { Flat, OnSurface, SurfaceTube } from './parts';
import { useMaterials } from './useMaterials';

/** ASSOCIATE: light oxford shirt, top button undone, tie loosened; one wireless earbud. */
export default function Associate() {
  const m = useMaterials(() => ({
    oxford: fabric('#E6E9EE', { sheen: 0.4, roughness: 0.8 }),
    tie: fabric('#1C222B', { sheen: 0.7, roughness: 0.6 }),
    button: trim('#F8FAFC', 0.4),
    bud: applyMidas(new MeshPhysicalMaterial({ color: new Color('#F8FAFC'), roughness: 0.25, clearcoat: 1 })),
  }));
  const shirt = useMemo(() => garment({ top: 0.11, bottom: -0.74, open: (t) => (t < 0.2 ? 0.16 * (1 - t / 0.2) : 0) }), []);
  const band = useMemo(() => garment({ top: 0.16, bottom: 0.095, lift: 1.05, rows: 6, open: () => 0.2 }), []);
  const bud = useMemo(() => surface(0.42, 1.5, 1.0), []);
  return (
    <group>
      <mesh geometry={shirt} material={m.oxford} />
      <mesh geometry={band} material={m.oxford} />
      {[-1, 1].map((s) => (
        <OnSurface key={s} y={0.09} angle={s * 0.24} lift={1.06} spin={s * 0.35}>
          <Flat pts={[[-0.07, 0.05], [0.07, 0.05], [s * -0.01, -0.1]]} depth={0.008} material={m.oxford} />
        </OnSurface>
      ))}
      {[-0.2, -0.4, -0.6].map((y) => (
        <OnSurface key={y} y={y} angle={0.13} lift={1.045}>
          <mesh material={m.button}><sphereGeometry args={[0.014, 12, 8]} /></mesh>
        </OnSurface>
      ))}
      {/* the knot sits low: loosened after a long day */}
      <OnSurface y={0.0} angle={0.04} lift={1.06}>
        <mesh material={m.tie} scale={[1, 1.2, 0.6]}><sphereGeometry args={[0.04, 16, 12]} /></mesh>
      </OnSurface>
      <SurfaceTube path={[[-0.02, 0.04], [-0.25, 0.06], [-0.52, 0.03]]} radius={0.036} flat={0.3} material={m.tie} lift={1.055} />
      <group position={bud.p.add(bud.n.clone().multiplyScalar(0.02))}>
        <mesh material={m.bud} rotation={[0, 0, 0.3]}><capsuleGeometry args={[0.028, 0.06, 6, 12]} /></mesh>
      </group>
    </group>
  );
}
