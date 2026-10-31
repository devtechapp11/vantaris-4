import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, Color, MathUtils, MeshPhysicalMaterial, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from 'three';
import { StudioEnv } from './common';
import { cssVar } from '../../design/tokens';

/*
  Vale in 3D. One mesh: a sphere deformed into a pebble that tapers downward
  (the V), in mirror chrome (MeshPhysicalMaterial, metalness 1, roughness 0.05,
  clearcoat). The black glass visor and the two eye lights are painted by the
  same material through a small shader patch, so their edges stay crisp and
  follow the surface exactly. A procedural studio (RoomEnvironment) gives the
  reflections, so no HDR file is downloaded.

  The canvas pauses when it is off screen or the tab is hidden, and renders at
  a device pixel ratio of at most 2.

  Optional: a liquid-metal background (website hero only), drawn in the same
  canvas so the page never has more than one WebGL context.
*/

const MAX_LEAN = MathUtils.degToRad(8);

/** Unit sphere point → pebble surface. */
function pebble(v) {
  const y = v.y;
  const taper = y < 0 ? 1 - 0.6 * Math.pow(-y, 1.3) : 1 - 0.05 * y * y;
  return [v.x * taper, y > 0 ? y * 0.9 : y * 1.36, v.z * 0.8 * taper];
}

function makeBody() {
  const g = new SphereGeometry(1, 160, 120);
  const p = g.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const [x, y, z] = pebble(v);
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Chrome body with the visor and eyes painted on by a shader patch. */
function makeMaterial(colors) {
  const m = new MeshPhysicalMaterial({
    color: colors.platinum,
    metalness: 1,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 0.9,
  });
  const u = {
    uVisorColor: { value: colors.black.clone() },
    uEye: { value: colors.platinum.clone() },
    uEyeOffset: { value: new Vector2() },
    uEyeOpen: { value: 1 },
    uEyeGlow: { value: 1 },
  };
  m.userData.u = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vObj;
        uniform vec3 uVisorColor; uniform vec3 uEye; uniform vec2 uEyeOffset; uniform float uEyeOpen; uniform float uEyeGlow;
        float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        float visorMask() {
          float ang = atan(vObj.x, vObj.z);
          vec2 p = vec2(ang * 0.62, vObj.y - 0.36);
          float d = sdRound(p, vec2(0.62, 0.19), 0.17);
          float aa = fwidth(d) * 1.2;
          return (1.0 - smoothstep(-aa, aa, d)) * step(0.0, vObj.z);
        }
        float eyeMask(float side, out float halo) {
          float ang = atan(vObj.x, vObj.z);
          vec2 c = vec2(side * 0.21, 0.38) + uEyeOffset * vec2(0.12, 0.06);
          vec2 p = vec2(ang * 0.62, vObj.y) - c;
          p.y /= max(uEyeOpen, 0.08);
          float d = length(p) - 0.066;
          float aa = fwidth(d) * 1.2;
          halo = exp(-max(d, 0.0) * 40.0) * 0.6;
          return 1.0 - smoothstep(-aa, aa, d);
        }`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        float visor = visorMask();
        diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(-1.25, 0.35, vObj.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, uVisorColor, visor);
        metalnessFactor = mix(metalnessFactor, 0.0, visor);
        roughnessFactor = mix(roughnessFactor, 0.06, visor);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        material.clearcoat *= mix(1.0, 0.3, visor);
        material.specularColor *= mix(1.0, 0.35, visor);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float hl, hr;
        float eyes = eyeMask(-1.0, hl) + eyeMask(1.0, hr);
        totalEmissiveRadiance += uEye * (eyes * 2.6 + (hl + hr)) * uEyeGlow * visor;`);
  };
  return m;
}

/** Soft contact shadow on a faintly lit floor (a radial texture, no shadow map). */
function useFloorTexture(colors) {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    const dark = `#${colors.aluDark.getHexString()}`;
    grd.addColorStop(0, 'rgba(9,10,11,1)');
    grd.addColorStop(0.4, 'rgba(9,10,11,0.85)');
    grd.addColorStop(0.62, `${dark}66`);
    grd.addColorStop(1, `${dark}00`);
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new CanvasTexture(c);
  }, [colors]);
}

/** Liquid-metal backdrop: domain-warped noise mapped onto the monochrome ramp. */
function LiquidMetal({ poseRef, colors }) {
  const { viewport } = useThree();
  const mat = useMemo(() => new ShaderMaterial({
    depthWrite: false,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uA: { value: colors.black }, uB: { value: colors.carbon }, uC: { value: colors.aluDark }, uD: { value: colors.silver },
      uPointer: { value: new Vector2() },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      varying vec2 vUv; uniform float uTime; uniform float uFade; uniform vec3 uA, uB, uC, uD; uniform vec2 uPointer;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
      void main() {
        vec2 p = vUv * vec2(3.2, 2.0) + uPointer * 0.15;
        float t = uTime * 0.05;
        vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
        float v = fbm(p + 2.2 * q + vec2(t * 0.7, -t));
        // Brushed-metal ramp: mostly black and carbon, thin silver crests
        vec3 col = mix(uA, uB, smoothstep(0.25, 0.55, v));
        col = mix(col, uC, smoothstep(0.55, 0.7, v));
        col += uD * (smoothstep(0.66, 0.7, v) - smoothstep(0.7, 0.76, v)) * 0.35;
        float vig = smoothstep(1.15, 0.25, length(vUv - vec2(0.5, 0.45)) * 1.6);
        gl_FragColor = vec4(col * vig, uFade);
      }`,
  }), [colors]);
  useFrame((state, dt) => {
    mat.uniforms.uTime.value += dt;
    const fade = poseRef?.current?.bg ?? 1;
    mat.uniforms.uFade.value = MathUtils.damp(mat.uniforms.uFade.value, fade, 6, dt);
    mat.uniforms.uPointer.value.lerp(state.pointer, 0.03);
  });
  return (
    <mesh position={[0, 0, -3]} renderOrder={-1} material={mat} visible>
      <planeGeometry args={[viewport.width * 2.2, viewport.height * 2.2]} />
    </mesh>
  );
}

function Vale({ state, lookAt, pulse, interactive, poseRef, onReady, colors }) {
  const group = useRef(null);
  const spinner = useRef(null);
  const geometry = useMemo(makeBody, []);
  const material = useMemo(() => makeMaterial(colors), [colors]);
  const floor = useFloorTexture(colors);
  const floorRef = useRef(null);
  const { gl, size } = useThree();
  const ready = useRef(false);
  const k = useRef({ since: 0, last: state, nodAt: -10, pointer: new Vector2(), hasPointer: false, spinV: 0, spin: 0, squash: 0, drag: null, blinkAt: 2 });

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
    floor.dispose();
  }, [geometry, material, floor]);

  // A new keystroke: one small nod.
  useEffect(() => { k.current.nodAt = performance.now() / 1000; }, [pulse]);

  // Pointer follow (window-wide, so the eyes track the cursor anywhere), rAF-coalesced by R3F.
  useEffect(() => {
    if (lookAt !== 'pointer') return undefined;
    const onMove = (e) => {
      const r = gl.domElement.getBoundingClientRect();
      k.current.pointer.set(
        MathUtils.clamp((e.clientX - (r.left + r.width / 2)) / Math.max(240, window.innerWidth / 2), -1, 1),
        MathUtils.clamp((e.clientY - (r.top + r.height * 0.4)) / Math.max(240, window.innerHeight / 2), -1, 1),
      );
      k.current.hasPointer = true;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [lookAt, gl]);

  // Drag to spin with inertia; tap to squash.
  useEffect(() => {
    if (!interactive) return undefined;
    const el = gl.domElement;
    el.style.touchAction = 'pan-y';
    el.style.cursor = 'grab';
    const down = (e) => { k.current.drag = { x: e.clientX, t: performance.now(), moved: 0 }; el.setPointerCapture?.(e.pointerId); el.style.cursor = 'grabbing'; };
    const move = (e) => {
      const d = k.current.drag;
      if (!d) return;
      const dx = e.clientX - d.x;
      d.moved += Math.abs(dx);
      d.x = e.clientX;
      k.current.spinV = (dx / size.width) * 9;
      k.current.spin += (dx / size.width) * 4;
    };
    const up = () => {
      const d = k.current.drag;
      k.current.drag = null;
      el.style.cursor = 'grab';
      if (d && d.moved < 6) k.current.squash = 1;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [interactive, gl, size.width]);

  useFrame((three, dt) => {
    const g = group.current;
    const sp = spinner.current;
    if (!g || !sp) return;
    const s = k.current;
    const now = performance.now() / 1000;
    const t = three.clock.elapsedTime;
    if (state !== s.last) { s.last = state; s.since = now; }
    const age = now - s.since;
    const u = material.userData.u;

    // Where to look
    let lx = 0, ly = 0;
    if (state === 'privacy') { lx = 0.9; ly = -0.5; }
    else if (state === 'thinking') { lx = Math.sin(t * 2.4) * 0.7; ly = -0.3; }
    else if (lookAt && lookAt !== 'pointer') { lx = lookAt.x; ly = lookAt.y; }
    else if (lookAt === 'pointer' && s.hasPointer) { lx = s.pointer.x; ly = s.pointer.y; }

    // Body pose
    let rx = ly * MAX_LEAN * 0.8, ry = lx * MAX_LEAN, rz = 0, py = Math.sin(t * 1.9) * 0.035, sx = 1, sy = 1;
    if (state === 'privacy') ry = -0.45;
    if (state === 'curious') rz = 0.14;
    if (state === 'thinking') rz = Math.sin(t * 1.5) * 0.06;
    if (state === 'success' && age < 0.9) rx += Math.sin(age * Math.PI * 2 / 0.45) * 0.16 * (1 - age / 0.9);
    if (state === 'error' && age < 0.7) ry += Math.sin(age * Math.PI * 2 / 0.23) * 0.28 * (1 - age / 0.7);
    if (state === 'celebrate' && age < 1.2) {
      py += Math.max(0, Math.sin(age * Math.PI / 0.6)) * 0.35 * (1 - age / 1.2);
      s.spin += dt * Math.PI * 2 * (1 - age / 1.2) * 1.4;
    }
    const nod = now - s.nodAt;
    if (nod < 0.22) rx += Math.sin(nod / 0.22 * Math.PI) * 0.07;
    if (s.squash > 0) { sy = 1 - 0.04 * s.squash; sx = 1 + 0.02 * s.squash; s.squash = Math.max(0, s.squash - dt * 6); }

    // Inertia, then settle facing front
    if (!s.drag) {
      s.spin += s.spinV * dt;
      s.spinV *= Math.pow(0.04, dt);
      if (Math.abs(s.spinV) < 0.3) {
        const front = Math.round(s.spin / (Math.PI * 2)) * Math.PI * 2;
        s.spin = MathUtils.damp(s.spin, front, 3.2, dt);
      }
    }

    // Pose from the page (the landing film): xf/yf are fractions of the half viewport.
    const pose = poseRef?.current;
    const vp = three.viewport;
    const tx = pose?.xf != null ? pose.xf * vp.width / 2 : pose?.x ?? 0;
    const ty = pose?.yf != null ? pose.yf * vp.height / 2 : pose?.y ?? 0;
    g.position.x = MathUtils.damp(g.position.x, tx, 4, dt);
    g.position.y = MathUtils.damp(g.position.y, ty + py, 5, dt);
    const sc = pose?.scale ?? 1;
    g.scale.set(MathUtils.damp(g.scale.x, sc * sx, 10, dt), MathUtils.damp(g.scale.y, sc * sy, 10, dt), MathUtils.damp(g.scale.z, sc * sx, 10, dt));
    g.rotation.x = MathUtils.damp(g.rotation.x, rx, 7, dt);
    g.rotation.z = MathUtils.damp(g.rotation.z, rz, 6, dt);
    sp.rotation.y = MathUtils.damp(sp.rotation.y, ry + s.spin + (pose?.turn ?? 0), 7, dt);

    // Eyes
    u.uEyeOffset.value.set(MathUtils.damp(u.uEyeOffset.value.x, lx, 9, dt), MathUtils.damp(u.uEyeOffset.value.y, -ly, 9, dt));
    let open = 1;
    if (t > s.blinkAt) { const b = t - s.blinkAt; open = b < 0.14 ? Math.abs(Math.cos(b / 0.14 * Math.PI)) : 1; if (b > 0.14) s.blinkAt = t + 2.6 + Math.random() * 2.8; }
    if (state === 'celebrate' && age < 1.4) open = 0.35;
    if (state === 'success' && age < 0.5) open = 0.5;
    u.uEyeOpen.value = MathUtils.damp(u.uEyeOpen.value, open, 30, dt);
    const glow = state === 'privacy' ? 0.12 : state === 'thinking' ? 0.7 + Math.sin(t * 5) * 0.3 : 1;
    u.uEyeGlow.value = MathUtils.damp(u.uEyeGlow.value, glow, 8, dt);

    if (floorRef.current) {
      const lift = g.position.y - ty;
      floorRef.current.material.opacity = MathUtils.clamp(0.9 - lift * 1.2, 0.35, 0.9);
      floorRef.current.position.x = g.position.x;
      floorRef.current.position.y = g.position.y - py - 1.5 * g.scale.y;
      floorRef.current.scale.setScalar(g.scale.x);
    }

    if (!ready.current) {
      ready.current = true;
      onReady?.();
    }
  });

  return (
    <>
      <mesh ref={floorRef} rotation-x={-Math.PI / 2} position={[0, -1.5, 0]}>
        <planeGeometry args={[3.4, 1.6]} />
        <meshBasicMaterial map={floor} transparent depthWrite={false} />
      </mesh>
      <group ref={group}>
        <group ref={spinner}>
          <mesh geometry={geometry} material={material} />
        </group>
      </group>
    </>
  );
}

/** Palette as three.js colours (read once from tokens.css). */
function usePalette() {
  return useMemo(() => ({
    black: new Color(cssVar('--black', '#090A0B')),
    carbon: new Color(cssVar('--carbon', '#171A1D')),
    aluDark: new Color(cssVar('--aluminium-dark', '#343A3E')),
    silver: new Color(cssVar('--silver', '#B9BEC0')),
    platinum: new Color(cssVar('--platinum', '#E7E8E5')),
  }), []);
}

/** Pause rendering when the canvas is off screen or the tab is hidden. */
function useActive(ref) {
  const [onScreen, setOnScreen] = useState(true);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    const vis = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', vis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', vis);
    };
  }, [ref]);
  return onScreen && visible;
}

export default function MascotScene({ state = 'idle', lookAt = null, pulse = 0, interactive = false, background = 'none', poseRef, camera = 6.2, onReady }) {
  const wrap = useRef(null);
  const active = useActive(wrap);
  const colors = usePalette();
  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        dpr={[1, 2]}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [0, 0.15, camera], fov: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <StudioEnv intensity={0.035} />
        {background === 'liquid' && <LiquidMetal poseRef={poseRef} colors={colors} />}
        <Vale state={state} lookAt={lookAt} pulse={pulse} interactive={interactive} poseRef={poseRef} onReady={onReady} colors={colors} />
      </Canvas>
    </div>
  );
}
