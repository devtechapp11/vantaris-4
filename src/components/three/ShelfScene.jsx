import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  BoxGeometry, CylinderGeometry, EdgesGeometry, IcosahedronGeometry, LatheGeometry,
  MeshStandardMaterial, OctahedronGeometry, SphereGeometry, TorusKnotGeometry, Vector2,
} from 'three';
import { StudioEnv, useOnScreenFrameloop, usePalette } from './common';

/**
 * Trophy shelf: one metallic object per achievement, gold when earned and dark
 * glass when not. Objects sit over equal-width columns so DOM labels below line up.
 */
export default function ShelfScene({ achievements = [], onReady, onHover }) {
  const [ref, frameloop] = useOnScreenFrameloop();
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        dpr={[1, 1.75]}
        frameloop={frameloop}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0.35, 5.6], fov: 24 }}
        onCreated={() => requestAnimationFrame(() => onReady?.())}
      >
        <StudioEnv intensity={0.045} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 5]} intensity={2.2} color="#FFF1D0" />
        <pointLight position={[-4, 1, 3]} intensity={6} distance={12} color="#00D4FF" />
        <Shelf achievements={achievements} onHover={onHover} />
      </Canvas>
    </div>
  );
}

const lathe = (pts) => new LatheGeometry(pts.map(([x, y]) => new Vector2(x, y)), 64);

function shapeFor(id) {
  switch (id) {
    case 'first-deal': return [new OctahedronGeometry(0.4, 0)];
    case 'hat-trick': return [new SphereGeometry(0.15, 32, 32), 'triple'];
    case 'on-fire': return [lathe([[0, -0.36], [0.2, -0.28], [0.27, -0.08], [0.2, 0.14], [0.08, 0.32], [0, 0.44]])];
    case 'fast-hands': return [new TorusKnotGeometry(0.22, 0.07, 128, 16)];
    case 'module-clear': return [new BoxGeometry(0.62, 0.3, 0.34)];
    case 'associate': return [lathe([[0, -0.4], [0.24, -0.4], [0.24, -0.34], [0.06, -0.3], [0.05, -0.08], [0.14, 0], [0.3, 0.18], [0.32, 0.4], [0.28, 0.4], [0.25, 0.2], [0.12, 0.06], [0, 0.04]])];
    default: return [new IcosahedronGeometry(0.36, 0)];
  }
}

function Shelf({ achievements, onHover }) {
  const pal = usePalette();
  const { viewport } = useThree();
  const n = Math.max(1, achievements.length);
  const width = viewport.width;
  const colW = width / n;
  const [hover, setHover] = useState(null);

  const mats = useMemo(() => ({
    gold: new MeshStandardMaterial({ color: pal.gold, metalness: 1, roughness: 0.2, envMapIntensity: 1.5 }),
    ghost: new MeshStandardMaterial({ color: pal.navy, metalness: 0.4, roughness: 0.6, transparent: true, opacity: 0.4 }),
    plank: new MeshStandardMaterial({ color: '#16203E', metalness: 0.7, roughness: 0.35 }),
    edge: new MeshStandardMaterial({ color: pal.gold, metalness: 1, roughness: 0.25, emissive: pal.gold, emissiveIntensity: 0.25 }),
    pedestal: new MeshStandardMaterial({ color: '#0F1630', metalness: 0.8, roughness: 0.3 }),
  }), [pal]);
  const pedestal = useMemo(() => new CylinderGeometry(0.3, 0.34, 0.08, 48), []);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  return (
    <group position={[0, -0.05, 0]}>
      <mesh position={[0, -0.62, 0]} material={mats.plank}>
        <boxGeometry args={[width * 0.98, 0.09, 1.1]} />
      </mesh>
      <mesh position={[0, -0.6, 0.56]} material={mats.edge}>
        <boxGeometry args={[width * 0.98, 0.022, 0.02]} />
      </mesh>
      {achievements.map((a, i) => (
        <Trophy
          key={a.id}
          a={a}
          x={-width / 2 + colW * (i + 0.5)}
          mats={mats}
          pedestal={pedestal}
          hovered={hover === i}
          onOver={() => { setHover(i); onHover?.(a.id); document.body.style.cursor = 'pointer'; }}
          onOut={() => { setHover(null); onHover?.(null); document.body.style.cursor = ''; }}
        />
      ))}
    </group>
  );
}

function Trophy({ a, x, mats, pedestal, hovered, onOver, onOut }) {
  const ref = useRef(null);
  const [geo, kind] = useMemo(() => shapeFor(a.id), [a.id]);
  const edges = useMemo(() => new EdgesGeometry(geo, 20), [geo]);
  const mat = a.earned ? mats.gold : mats.ghost;
  const phase = useMemo(() => x * 1.7, [x]);
  useEffect(() => () => {
    geo.dispose();
    edges.dispose();
  }, [geo, edges]);

  useFrame((state, delta) => {
    const g = ref.current;
    const speed = hovered ? 2.6 : a.earned ? 0.6 : 0.2;
    g.rotation.y += delta * speed;
    const lift = hovered ? 0.18 : 0;
    g.position.y += (lift + Math.sin(state.clock.elapsedTime * 1.2 + phase) * 0.03 - g.position.y) * 0.1;
  });

  const body = kind === 'triple'
    ? [[-0.16, -0.08], [0.16, -0.08], [0, 0.18]].map(([px, py]) => <mesh key={`${px}${py}`} geometry={geo} material={mat} position={[px, py, 0]} />)
    : <mesh geometry={geo} material={mat} />;

  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={pedestal} material={mats.pedestal} position={[0, -0.54, 0]} />
      <group ref={ref} onPointerOver={onOver} onPointerOut={onOut}>
        {body}
        {!a.earned && kind !== 'triple' && (
          <lineSegments geometry={edges}>
            <lineBasicMaterial color="#8C95B2" transparent opacity={0.35} />
          </lineSegments>
        )}
      </group>
    </group>
  );
}
