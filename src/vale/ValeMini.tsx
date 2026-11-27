import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import ValeModel, { requestBlink } from './ValeModel';
import { valeBus } from '../components/vale/valeBus';
import { valeOutfit, type Desk } from './outfits/outfitRegistry';
import './vale3d.css';

/** A pocket studio: the same light direction as the landing's, at 64 px, no pool. */
function MiniStage() {
  return (
    <Environment resolution={64} frames={1}>
      <mesh scale={30}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#2A3039" side={1} />
      </mesh>
      <Lightformer form="rect" intensity={4} position={[0, 5, -3]} scale={[10, 1.2, 1]} />
      <Lightformer form="rect" intensity={2.4} position={[0, 5, 1]} scale={[10, 1, 1]} />
      <Lightformer form="rect" intensity={1.8} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
      <Lightformer form="rect" intensity={1.4} position={[5, 0.5, 2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
      <Lightformer form="rect" intensity={1.4} position={[-4.5, 1, 8]} scale={[2.2, 10, 1]} />
      <Lightformer form="rect" intensity={1.4} position={[4.5, 1, 8]} scale={[2.2, 10, 1]} />
    </Environment>
  );
}

/**
 * frameloop="demand": frames are drawn only while something happens — a
 * reaction (2.6 s, a Gold Standard included), the pointer moving (0.6 s), a blink every 4–7 s.
 */
function Pulse() {
  const invalidate = useThree((s) => s.invalidate);
  const until = useRef(0);
  useFrame(() => {
    if (performance.now() < until.current) invalidate();
  });
  useEffect(() => {
    const run = (ms: number) => {
      until.current = Math.max(until.current, performance.now() + ms);
      invalidate();
    };
    run(1200);
    const off = valeBus.subscribe(() => run(2600));
    const move = () => run(600);
    addEventListener('pointermove', move, { passive: true });
    let id = 0;
    const blink = () => {
      requestBlink();
      run(320);
      id = window.setTimeout(blink, 4000 + Math.random() * 3000);
    };
    id = window.setTimeout(blink, 2500);
    return () => {
      off();
      removeEventListener('pointermove', move);
      clearTimeout(id);
    };
  }, [invalidate]);
  return null;
}

/**
 * Vale beside the active node: one small canvas (140 px), dpr ≤ 1.5, the
 * low-detail body, the player's desk outfit. Tap: he hops (no Midas here).
 */
export default function ValeMini({ desk, reduced, onReady }: { desk: Desk | null; reduced: boolean; onReady?: () => void }) {
  const [ready, setReady] = useState(false);
  // One store for every Vale on screen: set, never cleared here (the Path's Vale keeps the desk outfit).
  useEffect(() => {
    valeOutfit.set(desk);
  }, [desk]);
  return (
    <Canvas
      className={`vale-mini-canvas ${ready ? 'is-ready' : ''}`}
      dpr={[1, 1.5]}
      frameloop="demand"
      camera={{ position: [0, 0.05, 6.2], fov: 30, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      aria-hidden="true"
    >
      <MiniStage />
      <ValeModel
        reduced={reduced}
        lowPower
        tapMidas={false}
        onReady={() => {
          setReady(true);
          onReady?.();
        }}
      />
      <Pulse />
    </Canvas>
  );
}
