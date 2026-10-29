import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, DodecahedronGeometry, EdgesGeometry,
  IcosahedronGeometry, OctahedronGeometry, TorusGeometry, Vector3,
} from 'three';
import { parallax } from '../../design/tokens';
import { StudioEnv, useOnScreenFrameloop, usePalette, useSoftPoints, useWindowPointer } from './common';

/**
 * variant
 *   landing   constellation across the page + golden sculpture on the right (scroll parallax)
 *   auth      constellation + sculpture centred
 *   backdrop  constellation only
 */
export default function HeroScene({ variant = 'landing', onReady }) {
  const [ref, frameloop] = useOnScreenFrameloop();
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        dpr={[1, 1.75]}
        frameloop={frameloop}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 8], fov: 42 }}
        style={{ pointerEvents: 'none' }}
        onCreated={() => requestAnimationFrame(() => onReady?.())}
      >
        <Scene variant={variant} />
      </Canvas>
    </div>
  );
}

function Scene({ variant }) {
  const pal = usePalette();
  const mouse = useWindowPointer();
  useFrame(({ camera }) => {
    // Depth parallax: the camera drifts toward the pointer and keeps looking at the centre.
    camera.position.x += (mouse.current.x * 0.55 - camera.position.x) * 0.035;
    camera.position.y += (mouse.current.y * 0.35 - camera.position.y) * 0.035;
    camera.lookAt(0, 0, 0);
  });
  return (
    <>
      <StudioEnv />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 5, 6]} intensity={2.4} color="#FFF1D0" />
      <pointLight position={[-3.5, -1, 2.5]} intensity={9} distance={12} color={pal.cyan} />
      <pointLight position={[3, -2.5, -2]} intensity={7} distance={10} color={pal.violet} />
      <Constellation pal={pal} mouse={mouse} dense={variant !== 'landing'} />
      {variant !== 'backdrop' && <Sculpture pal={pal} mouse={mouse} variant={variant} />}
    </>
  );
}

/* ---------- Geometry builders (random once per mount) ---------- */
function makeConstellation(count, bounds, pal) {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const scale = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() * 2 - 1) * bounds.x;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * bounds.y;
    pos[i * 3 + 2] = -2 - Math.random() * bounds.z * 1.6;
    vel[i * 3] = (Math.random() - 0.5) * 0.12;
    vel[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    const c = Math.random() < 0.72 ? pal.goldBright : Math.random() < 0.6 ? pal.cyan : pal.goldPale;
    col.set([c.r, c.g, c.b], i * 3);
    scale[i] = 0.5 + Math.random() * 1.2;
  }
  const pointsGeo = new BufferGeometry();
  pointsGeo.setAttribute('position', new BufferAttribute(pos, 3));
  pointsGeo.setAttribute('color', new BufferAttribute(col, 3));
  pointsGeo.setAttribute('aScale', new BufferAttribute(scale, 1));
  const maxSegments = count * 6;
  const linePos = new Float32Array(maxSegments * 6);
  const lineCol = new Float32Array(maxSegments * 6);
  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute('position', new BufferAttribute(linePos, 3));
  lineGeo.setAttribute('color', new BufferAttribute(lineCol, 3));
  return { pos, vel, pointsGeo, lineGeo, linePos, lineCol, maxSegments };
}

function makeDust(pal, n = 420) {
  const dPos = new Float32Array(n * 3);
  const dCol = new Float32Array(n * 3);
  const dScale = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = 2.5 + Math.random() * 2.6;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    dPos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.7, r * Math.cos(ph)], i * 3);
    const c = Math.random() < 0.65 ? pal.goldBright : Math.random() < 0.5 ? pal.cyan : pal.goldPale;
    dCol.set([c.r, c.g, c.b], i * 3);
    dScale[i] = 0.3 + Math.random() * 0.9;
  }
  const dust = new BufferGeometry();
  dust.setAttribute('position', new BufferAttribute(dPos, 3));
  dust.setAttribute('color', new BufferAttribute(dCol, 3));
  dust.setAttribute('aScale', new BufferAttribute(dScale, 1));
  return dust;
}

/* ---------- Constellation: drifting data points linked by thin gold lines ---------- */
function Constellation({ pal, mouse, dense }) {
  const count = dense ? 90 : 120;
  const bounds = useMemo(() => new Vector3(9, 5.5, 3.5), []);
  const maxDist = 1.75;
  const material = useSoftPoints(40);
  const group = useRef(null);
  const linesRef = useRef(null);
  const pointsRef = useRef(null);

  const data = useMemo(() => makeConstellation(count, bounds, pal), [count, bounds, pal]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const { pos, vel, linePos, lineCol, maxSegments } = data;
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k;
        pos[j] += vel[j] * dt;
        const lim = k === 0 ? bounds.x : k === 1 ? bounds.y : bounds.z;
        const centre = k === 2 ? -2 - bounds.z * 0.8 : 0;
        if (pos[j] > centre + lim || pos[j] < centre - lim) vel[j] *= -1;
      }
    }
    data.pointsGeo.attributes.position.needsUpdate = true;

    let seg = 0;
    const max2 = maxDist * maxDist;
    const g = pal.gold;
    for (let i = 0; i < count && seg < maxSegments; i++) {
      const ax = pos[i * 3], ay = pos[i * 3 + 1], az = pos[i * 3 + 2];
      for (let j = i + 1; j < count && seg < maxSegments; j++) {
        const dx = ax - pos[j * 3], dy = ay - pos[j * 3 + 1], dz = az - pos[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > max2) continue;
        const a = (1 - Math.sqrt(d2) / maxDist) * 0.9;
        const o = seg * 6;
        linePos[o] = ax; linePos[o + 1] = ay; linePos[o + 2] = az;
        linePos[o + 3] = pos[j * 3]; linePos[o + 4] = pos[j * 3 + 1]; linePos[o + 5] = pos[j * 3 + 2];
        lineCol[o] = lineCol[o + 3] = g.r * a;
        lineCol[o + 1] = lineCol[o + 4] = g.g * a;
        lineCol[o + 2] = lineCol[o + 5] = g.b * a;
        seg++;
      }
    }
    data.lineGeo.setDrawRange(0, seg * 2);
    data.lineGeo.attributes.position.needsUpdate = true;
    data.lineGeo.attributes.color.needsUpdate = true;

    if (group.current) {
      group.current.rotation.y += (mouse.current.x * 0.1 - group.current.rotation.y) * 0.03;
      group.current.rotation.x += (-mouse.current.y * 0.06 - group.current.rotation.x) * 0.03;
      group.current.position.y = window.scrollY * 0.0012;
    }
  });

  return (
    <group ref={group}>
      <lineSegments ref={linesRef} geometry={data.lineGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.6} blending={AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <points ref={pointsRef} geometry={data.pointsGeo} material={material} />
    </group>
  );
}

/* ---------- Sculpture: faceted gold core inside rotating wireframe polyhedra ---------- */
function Sculpture({ pal, mouse, variant }) {
  const { viewport } = useThree();
  const group = useRef(null);
  const tilt = useRef(null);
  const core = useRef(null);
  const shellA = useRef(null);
  const shellB = useRef(null);
  const shellC = useRef(null);
  const ring = useRef(null);
  const dust = useRef(null);
  const dustMat = useSoftPoints(30);
  const glowMat = useSoftPoints(900);

  const geo = useMemo(() => {
    const dodeca = new DodecahedronGeometry(1.5, 0);
    const p = dodeca.attributes.position;
    const seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      if (!seen.has(key)) seen.set(key, new Vector3(p.getX(i), p.getY(i), p.getZ(i)));
    }
    const dust = makeDust(pal);
    const glow = new BufferGeometry();
    glow.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, -0.6]), 3));
    glow.setAttribute('color', new BufferAttribute(new Float32Array([pal.gold.r * 0.55, pal.gold.g * 0.45, pal.gold.b * 0.3]), 3));
    glow.setAttribute('aScale', new BufferAttribute(new Float32Array([1]), 1));
    return {
      core: new IcosahedronGeometry(0.92, 0),
      a: new EdgesGeometry(dodeca),
      b: new EdgesGeometry(new IcosahedronGeometry(2.15, 1)),
      c: new EdgesGeometry(new OctahedronGeometry(1.18, 0)),
      ring: new TorusGeometry(2.6, 0.008, 6, 220),
      nodes: [...seen.values()],
      dust,
      glow,
    };
  }, [pal]);

  const wide = viewport.width > 9;
  const base = variant === 'landing'
    ? { x: wide ? viewport.width * 0.28 : viewport.width * 0.22, y: wide ? 0.75 : 0.9, s: Math.min(1.05, Math.max(0.7, viewport.width / 12)) }
    : { x: 0, y: 0.25, s: Math.min(0.95, Math.max(0.62, viewport.width / 10)) };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    core.current.rotation.x += dt * 0.22;
    core.current.rotation.y += dt * 0.34;
    shellA.current.rotation.y -= dt * 0.12;
    shellA.current.rotation.x += dt * 0.05;
    shellB.current.rotation.y += dt * 0.05;
    shellB.current.rotation.z += dt * 0.025;
    shellC.current.rotation.x -= dt * 0.18;
    shellC.current.rotation.z += dt * 0.1;
    ring.current.rotation.z += dt * 0.35;
    dust.current.rotation.y += dt * 0.03;
    tilt.current.rotation.x += (mouse.current.y * 0.22 - tilt.current.rotation.x) * 0.05;
    tilt.current.rotation.y += (mouse.current.x * 0.32 - tilt.current.rotation.y) * 0.05;
    // Scroll parallax: drifts up a little slower than the page, then hides when far away.
    const scroll = variant === 'landing' ? window.scrollY / window.innerHeight : 0;
    group.current.position.y = base.y + Math.sin(t * 0.8) * 0.08 + scroll * viewport.height * parallax.hero * 2.4;
    group.current.visible = scroll < 1.6;
  });

  return (
    <group ref={group} position={[base.x, base.y, 0]} scale={base.s}>
      <points geometry={geo.glow} material={glowMat} />
      <group ref={tilt}>
        <mesh ref={core} geometry={geo.core}>
          <meshStandardMaterial color={pal.gold} metalness={1} roughness={0.2} flatShading envMapIntensity={1.5} emissive={pal.gold} emissiveIntensity={0.06} />
        </mesh>
        <lineSegments ref={shellC} geometry={geo.c}>
          <lineBasicMaterial color={pal.goldPale} transparent opacity={0.55} />
        </lineSegments>
        <group ref={shellA}>
          <lineSegments geometry={geo.a}>
            <lineBasicMaterial color={pal.goldBright} transparent opacity={0.85} />
          </lineSegments>
          {geo.nodes.map((v) => (
            <mesh key={`${v.x}-${v.y}-${v.z}`} position={v}>
              <sphereGeometry args={[0.045, 12, 12]} />
              <meshBasicMaterial color={pal.goldPale} />
            </mesh>
          ))}
        </group>
        <lineSegments ref={shellB} geometry={geo.b}>
          <lineBasicMaterial color={pal.gold} transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} />
        </lineSegments>
        <group rotation={[1.15, 0.2, 0]}>
          <group ref={ring}>
            <mesh geometry={geo.ring}>
              <meshBasicMaterial color={pal.cyan} transparent opacity={0.55} />
            </mesh>
            {[0, 2.1, 4.2].map((a) => (
              <mesh key={a} position={[Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0]}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshBasicMaterial color={pal.cyan} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
      <points ref={dust} geometry={geo.dust} material={dustMat} />
    </group>
  );
}
