import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { RelicKind } from './kinds';

export type Mats = { platinum: THREE.Material; chrome: THREE.Material; glass: THREE.Material; steel: THREE.Material };

/** A brushed roughness map: fine streaks, drawn once. */
function brushedMap() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    for (let y = 0; y < 256; y++) {
      g.fillStyle = `rgba(255,255,255,${(0.55 + Math.random() * 0.45).toFixed(2)})`;
      g.fillRect(0, y, 4, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  return t;
}

/** The Ledger Monolith's materials: brushed platinum, liquid chrome, smoked obsidian glass, dark steel. */
export function makeMats(): Mats {
  return {
    platinum: new THREE.MeshStandardMaterial({ color: '#C9CED6', metalness: 1, roughness: 0.62, roughnessMap: brushedMap(), envMapIntensity: 1.5 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#E6E9EE', metalness: 1, roughness: 0.06, envMapIntensity: 1.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#2A3039', metalness: 0.35, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.84, envMapIntensity: 1.8 }),
    steel: new THREE.MeshStandardMaterial({ color: '#5B6470', metalness: 1, roughness: 0.4, envMapIntensity: 1.2 }),
  };
}

/** Studio soft boxes, baked once into an environment map shared by every relic. */
export function makeStudio(gl: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2A3039');
  const box = (w: number, h: number, pos: [number, number, number], rot: [number, number, number], color: string, k: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.rotation.set(...rot);
    scene.add(m);
  };
  box(10, 4, [0, 5, 0], [Math.PI / 2, 0, 0], '#F8FAFC', 3.2);
  box(1.6, 9, [-5, 1, 0], [0, Math.PI / 2, 0], '#F8FAFC', 2.6);
  box(1.6, 9, [5, 0.5, 0], [0, -Math.PI / 2, 0], '#8FA3B8', 0.9);
  box(1.2, 10, [-2, 0.4, 7], [0, 0, 0], '#F8FAFC', 2.8);
  box(4, 10, [2, 0.2, 7], [0, 0, 0], '#C9CED6', 1.6);
  box(14, 2, [0, -2.6, 6], [0, 0, 0], '#9AA3AE', 1.1);
  box(14, 6, [0, 1, -7], [0, 0, 0], '#5B6470', 0.8);
  const pmrem = new THREE.PMREMGenerator(gl);
  const tex = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  return tex;
}

function useFluted() {
  return useMemo(() => {
    const g = new THREE.CylinderGeometry(0.46, 0.46, 1.25, 144, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 0.01) continue;
      const k = 1 + 0.05 * Math.cos(Math.atan2(z, x) * 20);
      p.setX(i, x * k);
      p.setZ(i, z * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
}

const R = 0.03;

/** The eight relics. Each fits a 1.6-unit box centred on the origin. */
export function RelicShape({ kind, m }: { kind: RelicKind; m: Mats }) {
  const fluted = useFluted();
  switch (kind) {
    case 'blades':
      return (
        <group rotation={[0.08, 0, 0]}>
          <RoundedBox args={[1.35, 0.16, 0.8]} radius={R} smoothness={3} position={[0, -0.3, 0]} material={m.glass} />
          <RoundedBox args={[1.35, 0.16, 0.8]} radius={R} smoothness={3} position={[0.06, 0, 0]} rotation={[0, 0.22, 0]} material={m.platinum} />
          <RoundedBox args={[1.35, 0.16, 0.8]} radius={R} smoothness={3} position={[-0.04, 0.3, 0]} rotation={[0, -0.18, 0]} material={m.chrome} />
        </group>
      );
    case 'fluted':
      return (
        <group>
          <mesh geometry={fluted} material={m.chrome} />
          <mesh position={[0, 0.66, 0]} material={m.platinum}><cylinderGeometry args={[0.56, 0.56, 0.07, 96]} /></mesh>
          <mesh position={[0, -0.66, 0]} material={m.platinum}><cylinderGeometry args={[0.56, 0.56, 0.07, 96]} /></mesh>
        </group>
      );
    case 'prisms':
      return (
        <group position={[0, -0.1, 0]}>
          {[0.7, 1.05, 0.85, 1.25].map((h, i) => (
            <mesh key={i} position={[-0.63 + i * 0.42, h / 2 - 0.55, 0]} rotation={[0, i * 0.35, 0]} material={[m.platinum, m.chrome, m.glass, m.chrome][i]}>
              <cylinderGeometry args={[0.2, 0.2, h, 3]} />
            </mesh>
          ))}
          <RoundedBox args={[1.7, 0.08, 0.6]} radius={0.02} smoothness={2} position={[0, -0.6, 0]} material={m.steel} />
        </group>
      );
    case 'archive':
      return (
        <group position={[0, -0.15, 0]}>
          {[1.4, 1.1, 0.8, 0.5].map((w, i) => (
            <RoundedBox key={i} args={[w, 0.22, w * 0.62]} radius={R} smoothness={3} position={[i * 0.05, -0.45 + i * 0.26, 0]} material={i % 2 ? m.glass : m.platinum} />
          ))}
          <mesh position={[0.15, 0.68, 0]} material={m.chrome}><sphereGeometry args={[0.09, 32, 16]} /></mesh>
        </group>
      );
    case 'lever':
      return (
        <group position={[0, -0.1, 0]}>
          <RoundedBox args={[0.95, 0.62, 0.62]} radius={R} smoothness={3} position={[-0.25, -0.35, 0]} material={m.glass} />
          <mesh position={[0.35, -0.3, 0]} material={m.platinum}><cylinderGeometry args={[0, 0.24, 0.5, 4]} /></mesh>
          <group position={[0.35, -0.02, 0]} rotation={[0, 0, 0.32]}>
            <RoundedBox args={[1.9, 0.07, 0.14]} radius={0.02} smoothness={2} material={m.chrome} />
            <RoundedBox args={[0.24, 0.24, 0.24]} radius={0.02} smoothness={2} position={[0.82, 0.15, 0]} material={m.platinum} />
          </group>
        </group>
      );
    case 'interlock':
      return (
        <group rotation={[0, 0.55, 0]}>
          <group position={[-0.14, 0.1, -0.14]}>
            <RoundedBox args={[0.32, 1.25, 0.34]} radius={R} smoothness={3} position={[-0.34, 0, 0]} material={m.platinum} />
            <RoundedBox args={[1.0, 0.32, 0.34]} radius={R} smoothness={3} position={[0, 0.465, 0]} material={m.platinum} />
          </group>
          <group position={[0.14, -0.1, 0.14]}>
            <RoundedBox args={[0.32, 1.25, 0.34]} radius={R} smoothness={3} position={[0.34, 0, 0]} material={m.chrome} />
            <RoundedBox args={[1.0, 0.32, 0.34]} radius={R} smoothness={3} position={[0, -0.465, 0]} material={m.chrome} />
          </group>
        </group>
      );
    case 'fracture':
      return (
        <group rotation={[0, -0.75, 0]}>
          <RoundedBox args={[0.52, 1.35, 0.62]} radius={R} smoothness={3} position={[-0.33, 0.06, 0]} rotation={[0, 0, 0.07]} material={m.platinum} />
          <RoundedBox args={[0.52, 1.35, 0.62]} radius={R} smoothness={3} position={[0.33, -0.06, 0]} rotation={[0, 0, -0.07]} material={m.glass} />
          <RoundedBox args={[0.05, 1.4, 0.7]} radius={0.012} smoothness={2} material={m.chrome} />
        </group>
      );
    case 'gyro':
    default:
      return (
        <group>
          <mesh material={m.chrome}><torusGeometry args={[0.66, 0.035, 24, 128]} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.platinum}><torusGeometry args={[0.56, 0.035, 24, 128]} /></mesh>
          <mesh rotation={[0, Math.PI / 2, 0.6]} material={m.glass}><torusGeometry args={[0.46, 0.05, 24, 128]} /></mesh>
          <mesh material={m.chrome}><sphereGeometry args={[0.15, 48, 24]} /></mesh>
        </group>
      );
  }
}
