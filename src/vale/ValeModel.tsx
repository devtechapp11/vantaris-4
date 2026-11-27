import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { easing } from 'maath';
import { MathUtils, Vector3, type BufferGeometry, type Group, type Mesh } from 'three';
import { valeBus, type ValeMood } from '../components/vale/valeBus';
import { makeValeBody, makeValeMaterial, type ValeUniforms } from './valeShape';
import { rippleBus } from './rippleBus';
import { siteSound } from './siteSound';
import { POOL_Y } from './ValeStage';
import { applyMidas, setMidasReach } from './midas';
import { valeMidas } from './valeMidas';
import { OUTFITS, useOutfit } from './outfits/outfitRegistry';
import Sparkles from './Sparkles';

/**
 * What the page can drive (the intro, the scroll): plain numbers read every
 * frame, no React state. `distort` adds to the mood's ripple; `eyes` dims the
 * eye lights (0 = dark visor, the « awakening » starts there).
 */
export const valeRig = {
  x: 0,
  y: 0,
  scale: 1,
  distort: 0,
  eyes: 1,
  /** Extra turn around the vertical axis, radians. */
  turn: 0,
};

let blinkRequested = false;
/** Ask for a blink on the next frame (on-demand canvases draw only now and then). */
export function requestBlink() {
  blinkRequested = true;
}

/** How long a mood holds before Vale settles back to idle (ms). */
const HOLD: Partial<Record<ValeMood, number>> = { delight: 1600, wow: 1500, concern: 1800 };

const tmp = new Vector3();

type Props = {
  reduced?: boolean;
  lowPower?: boolean;
  /** Tap reaction (off when Vale is only a decor). */
  interactive?: boolean;
  /** What a tap does besides the hop: the landing's Midas Touch, or nothing. */
  tapMidas?: boolean;
  onReady?: () => void;
  /** A sculpted body (public/vale.glb), instead of the procedural pebble. */
  bodyGeometry?: BufferGeometry;
  children?: ReactNode;
};

/**
 * Vale in 3D: the app's chrome pebble, alive. The eyes follow the pointer
 * (window-wide), the body leans after them with inertia, blinks every few
 * seconds, reacts to valeBus (delight hop, wow spin, concern looks at the
 * right answer), and a tap makes him jump, rings the pool and plinks.
 */
export default function ValeModel({ reduced = false, lowPower = false, interactive = true, tapMidas = true, onReady, bodyGeometry, children }: Props) {
  const procedural = useMemo(() => (bodyGeometry ? null : makeValeBody(lowPower ? 'low' : 'high')), [lowPower, bodyGeometry]);
  const geometry = bodyGeometry ?? procedural!;
  // The visor and the eyes never turn: they must stay readable.
  const material = useMemo(() => applyMidas(makeValeMaterial(), { mask: '(1.0 - visorMask())' }), []);
  const desk = useOutfit();
  const Outfit = desk ? OUTFITS[desk] : null;
  const root = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const { camera, gl } = useThree();
  const k = useRef({ px: 0, py: 0, has: false, blinkAt: 0.9, blinks: 0, tap: -10, spun: 0, baseY: 0, ready: false, gaze: null as null | { x: number; y: number } });

  useEffect(() => () => {
    procedural?.dispose();
    material.dispose();
  }, [procedural, material]);

  // Pointer (and finger) anywhere on the page, in NDC (-1..1, y up).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      k.current.px = (e.clientX / innerWidth) * 2 - 1;
      k.current.py = -((e.clientY / innerHeight) * 2 - 1);
      k.current.has = true;
    };
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onMove, { passive: true });
    return () => {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onMove);
    };
  }, []);

  // A miss with a target: remember where the right answer is, in NDC.
  useEffect(() => valeBus.subscribe(({ gaze }) => {
    const r = gaze?.getBoundingClientRect();
    k.current.gaze = r ? { x: ((r.left + r.width / 2) / innerWidth) * 2 - 1, y: -(((r.top + r.height / 2) / innerHeight) * 2 - 1) } : null;
  }), []);

  useEffect(() => {
    valeMidas.reduced = reduced;
  }, [reduced]);
  useEffect(() => {
    if (root.current) setMidasReach(root.current);
  }, [desk]);

  const onTap = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    if (tapMidas) valeMidas.touch(e.point.clone());
    k.current.tap = performance.now();
    valeBus.correct(2);
    rippleBus.emit(root.current?.position.x ?? 0, 0, 0.8);
    siteSound.play((s) => s.plink());
  };

  useFrame((state, dt) => {
    const g = root.current;
    const sp = spin.current;
    if (!g || !sp) return;
    const s = k.current;
    const u = material.userData.u as ValeUniforms;
    const t = state.clock.elapsedTime;
    const now = performance.now();
    const { mood, at } = valeBus.state;
    const age = now - at;
    const live: ValeMood = HOLD[mood] && age > (HOLD[mood] ?? 0) ? 'idle' : mood;
    const a = age / 1000;

    // Where Vale is on screen, to aim the eyes at the pointer from there.
    tmp.set(g.position.x, g.position.y + 0.35 * g.scale.y, g.position.z).project(camera);
    let lx = 0;
    let ly = 0;
    if (live === 'concern' && s.gaze) {
      lx = s.gaze.x - tmp.x;
      ly = s.gaze.y - tmp.y;
    } else if (live === 'concern') {
      lx = -0.5;
      ly = -0.6;
    } else if (s.has) {
      lx = (s.px - tmp.x) * 1.4;
      ly = (s.py - tmp.y) * 1.4;
    }
    lx = MathUtils.clamp(lx, -1, 1);
    ly = MathUtils.clamp(ly, -1, 1);

    // Eyes first, the body follows with inertia.
    u.uEyeOffset.value.set(
      MathUtils.damp(u.uEyeOffset.value.x, lx, 10, dt),
      MathUtils.damp(u.uEyeOffset.value.y, ly, 10, dt),
    );
    let rx = -ly * 0.18;
    let ry = lx * 0.32;
    let rz = 0;
    if (live === 'concern') {
      rz = 0.1;
      if (a < 0.5) ry += Math.sin(a * Math.PI * 2 / 0.25) * 0.12 * (1 - a / 0.5);
    }
    if (live === 'wow' && !reduced) ry += Math.sin(t * 9) * 0.5 * Math.max(0, 1 - a / 1.2);
    easing.dampE(sp.rotation, [rx, ry + valeRig.turn, rz], 0.35, dt);

    // Breathing, hop on delight / tap, spin on wow.
    let hop = 0;
    if (!reduced) {
      if (live === 'delight' && a < 0.9) hop = Math.max(0, Math.sin(a * Math.PI / 0.45)) * 0.22 * (1 - a / 0.9);
      const tapAge = (now - s.tap) / 1000;
      if (tapAge < 0.5) hop = Math.max(hop, Math.sin(tapAge * Math.PI / 0.5) * 0.18);
    }
    const breathe = reduced ? 0 : Math.sin(t * 1.1) * 0.04;
    g.position.x = MathUtils.damp(g.position.x, valeRig.x, 6, dt);
    s.baseY = MathUtils.damp(s.baseY, valeRig.y + breathe, 8, dt);
    g.position.y = s.baseY + hop;
    const sc = valeRig.scale;
    const squash = !reduced && now - s.tap < 140 ? 0.94 : 1;
    g.scale.set(
      MathUtils.damp(g.scale.x, sc * (2 - squash), 14, dt),
      MathUtils.damp(g.scale.y, sc * squash, 14, dt),
      MathUtils.damp(g.scale.z, sc * (2 - squash), 14, dt),
    );
    if (live === 'wow' && !reduced) {
      s.spun = Math.min(Math.PI * 2, s.spun + dt * Math.PI * 2 * 1.6);
    } else {
      s.spun = MathUtils.damp(s.spun, s.spun > Math.PI ? Math.PI * 2 : 0, 6, dt);
      if (Math.abs(s.spun - Math.PI * 2) < 0.001) s.spun = 0;
    }
    g.rotation.y = s.spun;

    // Blink every 2.8–6.4 s (reduced motion: a single blink).
    let open = 1;
    if (blinkRequested) {
      blinkRequested = false;
      s.blinkAt = t;
    }
    const since = t - s.blinkAt;
    if (since > 0 && since < 0.16) open = Math.abs(Math.cos((since / 0.16) * Math.PI)) * 0.92 + 0.08;
    if (since >= 0.16) {
      s.blinks += 1;
      s.blinkAt = reduced ? Infinity : t + 2.8 + Math.random() * 3.6;
    }
    const squint = live === 'delight' ? 0.5 : live === 'wow' ? 1.15 : live === 'focus' ? 0.8 : 1;
    u.uEyeOpen.value = MathUtils.damp(u.uEyeOpen.value, Math.min(open, squint), since > 0 && since < 0.16 ? 60 : 14, dt);
    u.uEyeGlow.value = MathUtils.damp(u.uEyeGlow.value, valeRig.eyes * (live === 'concern' ? 0.8 : 1), 8, dt);

    // Mercury: still in reduced motion, a little alive at rest, more when moved.
    // Dressed, the chrome ripples less: the cloth shell sits just 3% above the skin.
    const target = reduced ? 0 : ((live === 'wow' ? 0.22 : live === 'delight' ? 0.14 : 0.06) + valeRig.distort) * (desk ? 0.35 : 1);
    u.uDistort.value = MathUtils.damp(u.uDistort.value, target, 4, dt);
    u.uTime.value = reduced ? 0 : t;

    valeMidas.center.set(g.position.x, g.position.y + 0.1 * g.scale.y, g.position.z + 0.4);

    if (!s.ready) {
      s.ready = true;
      onReady?.();
    }
  });

  return (
    <>
    <group ref={root}>
      <group ref={spin}>
        <mesh
          ref={body}
          geometry={geometry}
          material={material}
          onPointerDown={onTap}
          onPointerOver={() => { if (interactive) gl.domElement.style.cursor = 'pointer'; }}
          onPointerOut={() => { gl.domElement.style.cursor = ''; }}
        />
        {Outfit && (
          <Suspense fallback={null}>
            <Outfit key={desk} />
          </Suspense>
        )}
        {children}
      </group>
    </group>
    {/* world space: outside Vale's transforms */}
    <Sparkles body={body} reduced={reduced} />
    </>
  );
}

/** The pool height under Vale (for the intro drop). */
export const VALE_POOL_Y = POOL_Y;
