import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Mesh, MeshPhysicalMaterial, SphereGeometry } from 'three';
import { actBus, stageState } from './stage';
import { valeRig, requestBlink } from '../vale/ValeModel';
import { rippleBus } from '../vale/rippleBus';
import { siteSound } from '../vale/siteSound';
import { POOL_Y } from '../vale/ValeStage';

/** Where Vale starts, under the pool, before he rises. */
const DEEP = POOL_Y - 1.9;

/**
 * The intro (act 0), in the canvas: a drop of chrome falls (0–600 ms), splashes
 * with rings (600–1100), Vale rises out of the pool (1100–1900), then his eyes
 * light up and he blinks (1900–2300). Reduced motion: Vale already standing.
 *
 * Sounds are panned to where Vale stands on screen (`valeRig.pan`).
 */
export default function Director({ reduced }: { reduced: boolean }) {
  const drop = useRef<Mesh>(null);
  const geo = useMemo(() => new SphereGeometry(0.16, 32, 16), []);
  const mat = useMemo(() => new MeshPhysicalMaterial({ color: '#E6E9EE', metalness: 1, roughness: 0.08 }), []);
  const t0 = useRef<number | null>(null);
  const fired = useRef({ splash: false, blink: false });

  useEffect(() => {
    if (reduced) {
      valeRig.y = 0;
      valeRig.eyes = 1;
    } else {
      valeRig.y = DEEP;
      valeRig.eyes = 0;
    }
    return () => {
      valeRig.y = 0;
      valeRig.eyes = 1;
      valeRig.tapMode = 'touch';
    };
  }, [reduced]);

  // One ring on the pool at each act change (the only transition besides the aberration).
  useEffect(() => actBus.subscribe((act, from) => {
    rippleBus.emit(0, 0, 0.5);
    if (act === 2 && from < 2) siteSound.play((s) => s.panned(valeRig.pan, (p) => p.whoosh()));
    valeRig.tapMode = act === 4 ? 'gold' : 'touch';
    // Act 1: a glance at the title, then back to the visitor.
    if (act === 1 && !reduced) {
      valeRig.turn = -0.35;
      window.setTimeout(() => (valeRig.turn = 0), 900);
    }
  }), [reduced]);

  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);

  useFrame(() => {
    const now = performance.now();
    if (t0.current == null) t0.current = now;
    const ms = now - t0.current;

    if (!reduced && ms < 2600) {
      const d = drop.current;
      if (d) {
        const k = MathUtils.clamp(ms / 600, 0, 1);
        d.visible = ms < 600;
        d.position.y = MathUtils.lerp(3.2, POOL_Y, k * k);
      }
      if (ms >= 600 && !fired.current.splash) {
        fired.current.splash = true;
        rippleBus.emit(0, 0, 1);
        window.setTimeout(() => rippleBus.emit(0, 0, 0.7), 180);
        window.setTimeout(() => rippleBus.emit(0, 0, 0.45), 360);
        siteSound.play((s) => s.panned(0, (p) => p.plink()));
      }
      if (ms >= 1100) {
        const r = MathUtils.clamp((ms - 1100) / 800, 0, 1);
        valeRig.y = MathUtils.lerp(DEEP, 0, 1 - Math.pow(1 - r, 3));
      }
      if (ms >= 1900) valeRig.eyes = MathUtils.clamp((ms - 1900) / 300, 0, 1);
      if (ms >= 2100 && !fired.current.blink) {
        fired.current.blink = true;
        requestBlink();
      }
    } else if (drop.current?.visible) {
      drop.current.visible = false;
    }

    stageState.pan = valeRig.pan;
  });

  return <mesh ref={drop} geometry={geo} material={mat} position={[0, 3.2, 0]} visible={!reduced} />;
}
