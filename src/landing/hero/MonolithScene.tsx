import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshTransmissionMaterial, RoundedBox } from '@react-three/drei';
import { easing } from 'maath';
import * as THREE from 'three';
import { ledger } from './ledger';
import Medallions from './Medallions';
import TelemetryBadges from './TelemetryBadges';

/*
  Ledger Monolith: three architectural slabs (brushed platinum, liquid chrome,
  smoked obsidian glass). Idle, they float apart; once the demo deal is solved
  they slot together into one block. While « The method » scrolls by they burst
  into an exploded view, and they reassemble in front of « Membership ».
*/

type Pose = [number, number, number, number, number, number]; // x y z · rx ry rz

const W = 0.5; // slab width: three of them make a 1.5-unit block
const H = 2.3;
const D = 0.7;

const IDLE: Pose[] = [
  [-0.86, 0.16, 0.0, 0.0, 0.2, 0.05],
  [0.0, -0.14, 0.18, 0.0, -0.12, -0.03],
  [0.86, 0.24, -0.1, 0.0, 0.26, 0.06],
];
const LOCK: Pose[] = [
  [-W, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [W, 0, 0, 0, 0, 0],
];
const BURST: Pose[] = [
  [-1.75, 0.55, -0.5, 0.22, 0.75, 0.16],
  [0.08, -0.45, 0.9, -0.18, -0.55, -0.1],
  [1.75, 0.75, -1.0, 0.28, 0.95, 0.2],
];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
// What the smoked glass refracts where no slab is behind it.
const SMOKE = new THREE.Color('#2A3039');

/** A brushed-metal roughness map, drawn once: fine horizontal streaks. */
function useBrushed() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = '#000000';
      g.fillRect(0, 0, 4, 256);
      for (let y = 0; y < 256; y++) {
        g.fillStyle = `rgba(255,255,255,${(0.55 + Math.random() * 0.45).toFixed(2)})`;
        g.fillRect(0, y, 4, 1);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 3);
    return t;
  }, []);
}

function Slabs({ low, children }: { low: boolean; children?: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const slabs = useRef<(THREE.Mesh | null)[]>([]);
  const brushed = useBrushed();
  const target = useMemo(() => new THREE.Vector3(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const { camera, pointer } = useThree();

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const lockedPose = ledger.locked || ledger.reassemble > 0.5;
    const base = lockedPose ? LOCK : IDLE;
    const e = ledger.explode;
    // The impact: a short downward settle and a squash when the block locks.
    const since = ledger.lockedAt < 0 ? 99 : (performance.now() - ledger.lockedAt) / 1000;
    const thud = since < 0.6 ? Math.sin(Math.min(1, since / 0.6) * Math.PI) * (1 - since / 0.6) : 0;

    slabs.current.forEach((m, i) => {
      if (!m) return;
      const b = base[i];
      const x = BURST[i];
      const float = lockedPose ? 0 : Math.sin(t * 0.6 + i * 1.7) * 0.05;
      target.set(mix(b[0], x[0], e), mix(b[1], x[1], e) + float - thud * 0.06, mix(b[2], x[2], e));
      easing.damp3(m.position, target, lockedPose && e < 0.05 ? 0.16 : 0.32, dt);
      euler.set(mix(b[3], x[3], e), mix(b[4], x[4], e) + (lockedPose ? 0 : Math.sin(t * 0.4 + i) * 0.04), mix(b[5], x[5], e));
      easing.dampE(m.rotation, euler, 0.32, dt);
    });

    if (group.current) {
      const s = 1 - thud * 0.02;
      group.current.scale.set(1, s, 1);
      easing.dampE(group.current.rotation, [low ? 0 : pointer.y * -0.06, ledger.orbit * 1.4 + (low ? 0 : pointer.x * 0.12), 0], 0.4, dt);
    }
    // Camera orbits a little with the page, and pulls back for the exploded view.
    const a = -0.35 + ledger.orbit * 0.9;
    const r = 6.4 + ledger.explode * 1.6;
    easing.damp3(camera.position, [Math.sin(a) * r, 0.6 + ledger.explode * 0.5, Math.cos(a) * r], 0.45, dt);
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={group}>
      <RoundedBox ref={(m) => { slabs.current[0] = m; }} args={[W, H, D]} radius={0.025} smoothness={3} position={IDLE[0].slice(0, 3) as [number, number, number]}>
        <meshStandardMaterial color="#C9CED6" metalness={1} roughness={0.72} roughnessMap={brushed} envMapIntensity={1.5} />
      </RoundedBox>
      <RoundedBox ref={(m) => { slabs.current[1] = m; }} args={[W, H, D]} radius={0.025} smoothness={3} position={IDLE[1].slice(0, 3) as [number, number, number]}>
        <meshStandardMaterial color="#E6E9EE" metalness={1} roughness={0.05} envMapIntensity={1.5} />
      </RoundedBox>
      <RoundedBox ref={(m) => { slabs.current[2] = m; }} args={[W, H, D]} radius={0.025} smoothness={3} position={IDLE[2].slice(0, 3) as [number, number, number]}>
        {low ? (
          <meshPhysicalMaterial color="#2A3039" metalness={0.4} roughness={0.12} clearcoat={1} transparent opacity={0.82} envMapIntensity={1.6} />
        ) : (
          <MeshTransmissionMaterial background={SMOKE} color="#E6E9EE" thickness={0.5} roughness={0.12} transmission={0.92} clearcoat={1} clearcoatRoughness={0.04} ior={1.45} chromaticAberration={0.015} anisotropy={0.1} samples={6} resolution={512} backside={false} envMapIntensity={2.2} />
        )}
      </RoundedBox>
      {children}
    </group>
  );
}

/** Lights the metals with soft boxes only: no HDR file to fetch, nothing outside the palette. */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Graphite ambience, so no face ever reflects pure black */}
      <color attach="background" args={['#12161D']} />
      {/* Key softbox above, rim strips on the sides */}
      <Lightformer form="rect" intensity={2.2} color="#F8FAFC" position={[0, 5, 0]} scale={[10, 3, 1]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={1.6} color="#F8FAFC" position={[-5, 1, 0]} scale={[1.2, 8, 1]} rotation-y={Math.PI / 2} />
      <Lightformer form="rect" intensity={0.5} color="#8FA3B8" position={[5, 0.5, 0]} scale={[1.2, 8, 1]} rotation-y={-Math.PI / 2} />
      {/* In front of the slabs (behind the camera): the studio strips the faces mirror */}
      <Lightformer form="rect" intensity={1.8} color="#F8FAFC" position={[-1.6, 0.4, 7]} scale={[0.7, 9, 1]} />
      <Lightformer form="rect" intensity={1.1} color="#C9CED6" position={[1.4, 0.2, 7]} scale={[2.4, 9, 1]} />
      <Lightformer form="rect" intensity={0.6} color="#9AA3AE" position={[0, -2.6, 6]} scale={[12, 1.5, 1]} />
    </Environment>
  );
}

/** Phones: render on demand at 30 fps instead of every display refresh. */
function ThirtyFps({ on }: { on: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!on) return undefined;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 1000 / 30 - 2) return;
      last = now;
      invalidate();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, invalidate]);
  return null;
}

function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(onReady);
  });
  return null;
}

export default function MonolithScene({ low, active, onReady, phone = false, frozen = false }: { low: boolean; active: boolean; onReady: () => void; phone?: boolean; frozen?: boolean }) {
  return (
    <Canvas
      className="mono-canvas"
      dpr={low ? [1, 1.25] : [1, 1.75]}
      frameloop={!active ? 'never' : low ? 'demand' : 'always'}
      gl={{ alpha: true, antialias: true, powerPreference: low ? 'low-power' : 'high-performance' }}
      camera={{ fov: 30, position: [0, 0.6, 6.4], near: 0.1, far: 40 }}
    >
      <ThirtyFps on={low && active} />
      <Studio />
      <Slabs low={low}>
        <Medallions lowPower={low} frozen={frozen} />
        <TelemetryBadges isMobile={phone} />
      </Slabs>
      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}
