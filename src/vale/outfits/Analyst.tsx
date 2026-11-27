import { useMemo } from 'react';
import { Color, MeshPhysicalMaterial } from 'three';
import { applyMidas } from '../midas';
import { fabric, garment, surface, trim } from './fabric';
import { Flat, OnSurface, SurfaceTube } from './parts';
import { useMaterials } from './useMaterials';

/** ANALYST: zipped fleece gilet, high collar, zip half down; lanyard badge and a coffee cup. */
export default function Analyst() {
  const m = useMaterials(() => ({
    fleece: fabric('#2A3039', { sheen: 0.8, roughness: 0.95 }),
    zip: trim('#9AA3AE', 0.25),
    lanyard: fabric('#5B6470', { sheen: 0.3 }),
    card: applyMidas(new MeshPhysicalMaterial({ color: new Color('#F8FAFC'), roughness: 0.35, clearcoat: 0.6 })),
    stripe: fabric('#1C222B'),
    cup: applyMidas(new MeshPhysicalMaterial({ color: new Color('#F8FAFC'), roughness: 0.6 })),
    lid: applyMidas(new MeshPhysicalMaterial({ color: new Color('#1C222B'), roughness: 0.5 })),
  }));
  const body = useMemo(() => garment({ top: 0.1, bottom: -0.72, open: (t) => (t < 0.3 ? 0.09 * (1 - t / 0.3) : 0) }), []);
  const collar = useMemo(() => garment({ top: 0.175, bottom: 0.07, lift: 1.07, rows: 8, open: () => 0.12 }), []);
  const cup = useMemo(() => surface(-0.32, 1.32, 1.0).p.add(surface(-0.32, 1.32).n.multiplyScalar(0.2)), []);
  return (
    <group>
      <mesh geometry={body} material={m.fleece} />
      <mesh geometry={collar} material={m.fleece} />
      <SurfaceTube path={[[0.07, 0], [-0.3, 0], [-0.7, 0]]} radius={0.009} material={m.zip} lift={1.04} />
      <OnSurface y={-0.06} angle={0.02} lift={1.05}>
        <mesh material={m.zip}><boxGeometry args={[0.035, 0.08, 0.02]} /></mesh>
      </OnSurface>
      <SurfaceTube path={[[0.12, -0.62], [-0.05, -0.42], [-0.26, 0.1]]} radius={0.012} flat={0.4} material={m.lanyard} lift={1.05} />
      <SurfaceTube path={[[0.12, 0.62], [-0.05, 0.45], [-0.26, 0.2]]} radius={0.012} flat={0.4} material={m.lanyard} lift={1.05} />
      <OnSurface y={-0.36} angle={0.16} lift={1.055} spin={-0.06}>
        <Flat pts={[[-0.085, -0.115], [0.085, -0.115], [0.085, 0.115], [-0.085, 0.115]]} depth={0.01} material={m.card} />
        <group position={[0, 0.05, 0.016]}>
          <Flat pts={[[-0.07, -0.016], [0.07, -0.016], [0.07, 0.016], [-0.07, 0.016]]} depth={0.002} material={m.stripe} />
        </group>
      </OnSurface>
      <group position={cup} rotation={[0, 0, -0.08]}>
        <mesh material={m.cup}><cylinderGeometry args={[0.105, 0.08, 0.3, 32]} /></mesh>
        <mesh material={m.stripe} position={[0, -0.01, 0]}><cylinderGeometry args={[0.101, 0.09, 0.12, 32]} /></mesh>
        <mesh material={m.lid} position={[0, 0.165, 0]}><cylinderGeometry args={[0.1, 0.112, 0.04, 32]} /></mesh>
      </group>
    </group>
  );
}
