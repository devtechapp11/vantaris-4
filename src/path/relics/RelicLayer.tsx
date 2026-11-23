import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, View } from '@react-three/drei';
import { easing } from 'maath';
import * as THREE from 'three';
import { makeMats, makeStudio, RelicShape, type Mats } from './shapes';
import type { RelicKind } from './kinds';

export type RelicSlot = { id: string; kind: RelicKind; el: HTMLElement };

const Kit = createContext<{ mats: Mats; env: THREE.Texture } | null>(null);

/** Bakes the studio once and shares it (plus the four materials) with every view. */
function KitProvider({ children }: { children: React.ReactNode }) {
  const gl = useThree((s) => s.gl);
  const kit = useMemo(() => ({ mats: makeMats(), env: makeStudio(gl) }), [gl]);
  useEffect(() => () => {
    kit.env.dispose();
    Object.values(kit.mats).forEach((m) => m.dispose());
  }, [kit]);
  return <Kit.Provider value={kit}>{children}</Kit.Provider>;
}

/** One relic in its own view. Only the « hot » one (next chapter, or hovered) turns; it slows with inertia. */
function Relic({ kind, hot, phase }: { kind: RelicKind; hot: boolean; phase: number }) {
  const kit = useContext(Kit);
  const scene = useThree((s) => s.scene);
  const group = useRef<THREE.Group>(null);
  const speed = useRef(0);
  const tilt = useMemo(() => new THREE.Euler(0.22, phase, 0), [phase]);
  useEffect(() => {
    if (kit) scene.environment = kit.env;
  }, [kit, scene]);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);
    speed.current = THREE.MathUtils.damp(speed.current, hot ? 0.85 : 0, hot ? 1.6 : 2.4, d);
    tilt.y += speed.current * d;
    easing.dampE(g.rotation, [hot ? 0.16 : 0.22, tilt.y, 0], 0.25, d);
    // Keep drawing while anything still moves; otherwise the canvas rests.
    if (speed.current > 0.003 || Math.abs(g.rotation.y - tilt.y) > 0.001) state.invalidate();
  });
  if (!kit) return null;
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.35, 4.7]} fov={28} onUpdate={(c) => c.lookAt(0, 0, 0)} />
      <group ref={group} rotation={tilt}>
        <RelicShape kind={kind} m={kit.mats} />
      </group>
    </>
  );
}

/** Re-render on scroll and resize: each view follows its slot in the page. */
function Follow() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const on = () => invalidate();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    const ro = new ResizeObserver(on);
    ro.observe(document.body);
    return () => {
      removeEventListener('scroll', on);
      removeEventListener('resize', on);
      ro.disconnect();
    };
  }, [invalidate]);
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(onReady);
  });
  return null;
}

/**
 * The chapter relics: one shared canvas fixed over the page, one drei <View>
 * per relic slot. Renders on demand: a frame on scroll, and continuously only
 * while a relic turns.
 */
export default function RelicLayer({ slots, hot, onReady }: { slots: RelicSlot[]; hot: string | null; onReady: () => void }) {
  return (
    <Canvas
      className="relic-canvas"
      frameloop="demand"
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
    >
      <KitProvider>
        {slots.map((s, i) => (
          <View key={s.id} track={{ current: s.el }}>
            <Relic kind={s.kind} hot={hot === s.id} phase={0.5 + i * 0.7} />
          </View>
        ))}
      </KitProvider>
      <Follow />
      <Ready onReady={onReady} />
    </Canvas>
  );
}
