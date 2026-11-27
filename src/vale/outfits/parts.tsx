import { useMemo } from 'react';
import { CatmullRomCurve3, ExtrudeGeometry, Quaternion, Shape, TubeGeometry, Vector3, type Material } from 'three';
import { surface } from './fabric';

const Z = new Vector3(0, 0, 1);

/** A flat piece lying on Vale's surface (lapel, collar point, pocket square, badge). */
export function OnSurface({ y, angle, lift = 1.045, spin = 0, children }: { y: number; angle: number; lift?: number; spin?: number; children: React.ReactNode }) {
  const { p, q } = useMemo(() => {
    const { p, n } = surface(y, angle, lift);
    const q = new Quaternion().setFromUnitVectors(Z, n);
    q.multiply(new Quaternion().setFromAxisAngle(Z, spin));
    return { p, q };
  }, [y, angle, lift, spin]);
  return <group position={p} quaternion={q}>{children}</group>;
}

/** An extruded flat shape from 2D points (lapels, collar points). */
export function Flat({ pts, depth = 0.012, material }: { pts: [number, number][]; depth?: number; material: Material }) {
  const geo = useMemo(() => {
    const s = new Shape();
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    return new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
  }, [pts, depth]);
  return <mesh geometry={geo} material={material} />;
}

/** A tube along points on the surface (tie, lanyard, zip). */
export function SurfaceTube({ path, radius, material, lift = 1.05, flat = 1 }: { path: [number, number][]; radius: number; material: Material; lift?: number; flat?: number }) {
  const geo = useMemo(() => {
    const curve = new CatmullRomCurve3(path.map(([y, a]) => surface(y, a, lift).p));
    const g = new TubeGeometry(curve, 48, radius, 10, false);
    if (flat !== 1) g.scale(1, 1, flat);
    return g;
  }, [path, radius, lift, flat]);
  return <mesh geometry={geo} material={material} />;
}
