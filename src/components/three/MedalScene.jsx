import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry, MeshStandardMaterial, SRGBColorSpace, TorusGeometry } from 'three';
import { cssVar } from '../../design/tokens';
import { StudioEnv, easeOutBack, easeOutCubic, usePalette, useSoftPoints } from './common';

/** Level-up medal: spins in from far away with a metallic finish, then sways. */
export default function MedalScene({ level = 'Associate', onReady }) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 5.2], fov: 38 }}
      onCreated={() => requestAnimationFrame(() => onReady?.())}
    >
      <StudioEnv intensity={0.05} />
      <ambientLight intensity={0.3} />
      <spotLight position={[-4, 5, 6]} angle={0.5} penumbra={0.8} intensity={60} color="#FFF3D6" />
      <pointLight position={[3, -2, 3]} intensity={10} distance={10} color={cssVar('--cyan-500', '#00D4FF')} />
      <pointLight position={[-3, -3, -2]} intensity={8} distance={10} color={cssVar('--violet-500', '#A98BFF')} />
      <Medal level={level} />
      <Sparks />
    </Canvas>
  );
}

function faceTexture(level) {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const mid = size / 2;
  const gold = [cssVar('--gold-300', '#F7E3A3'), cssVar('--gold-500', '#D4AF37'), cssVar('--gold-700', '#8C6D12')];
  const grad = g.createRadialGradient(mid * 0.8, mid * 0.7, 40, mid, mid, mid);
  grad.addColorStop(0, gold[0]);
  grad.addColorStop(0.55, gold[1]);
  grad.addColorStop(1, gold[2]);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const ring = (r, w, color) => {
    g.beginPath();
    g.arc(mid, mid, r, 0, Math.PI * 2);
    g.lineWidth = w;
    g.strokeStyle = color;
    g.stroke();
  };
  ring(mid - 30, 18, 'rgba(255,255,255,0.45)');
  ring(mid - 52, 6, 'rgba(60,40,0,0.55)');
  ring(mid - 120, 4, 'rgba(60,40,0,0.45)');
  // dentils around the rim
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    g.beginPath();
    g.arc(mid + Math.cos(a) * (mid - 86), mid + Math.sin(a) * (mid - 86), 9, 0, Math.PI * 2);
    g.fillStyle = i % 2 ? 'rgba(255,248,220,0.55)' : 'rgba(70,48,0,0.35)';
    g.fill();
  }
  const font = cssVar('--font-ui', 'sans-serif');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const emboss = (text, y, px, weight = 900, spacing = 0) => {
    g.font = `${weight} ${px}px ${font}`;
    if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
    g.fillStyle = 'rgba(70,46,0,0.65)';
    g.fillText(text, mid + 5, y + 6);
    g.fillStyle = 'rgba(255,250,230,0.85)';
    g.fillText(text, mid - 3, y - 3);
    g.fillStyle = gold[1];
    g.fillText(text, mid, y);
  };
  emboss('V', mid - 40, 400);
  emboss(level.toUpperCase(), mid + 210, 74, 800, 14);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  // Cylinder caps map UVs a quarter-turn off; turn the artwork upright.
  tex.center.set(0.5, 0.5);
  tex.rotation = Math.PI / 2;
  return tex;
}

function Medal({ level }) {
  const pal = usePalette();
  const group = useRef(null);
  const start = useRef(null);
  const { geo, mats, rim } = useMemo(() => {
    const tex = faceTexture(level);
    const face = new MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 2.2, metalness: 1, roughness: 0.3, envMapIntensity: 1.3 });
    const side = new MeshStandardMaterial({ color: pal.gold, metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });
    return {
      geo: new CylinderGeometry(1.25, 1.25, 0.16, 128, 1),
      mats: [side, face, face],
      rim: new TorusGeometry(1.26, 0.065, 24, 160),
    };
  }, [level, pal]);
  useEffect(() => () => {
    geo.dispose();
    rim.dispose();
    mats.forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
  }, [geo, mats, rim]);

  useFrame((state) => {
    if (start.current == null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    const spinT = Math.min(1, t / 2);
    const sway = t > 2 ? Math.sin((t - 2) * 1.1) * 0.38 : 0;
    group.current.rotation.y = -Math.PI * 6 * (1 - easeOutCubic(spinT)) + sway;
    const s = 0.2 + 0.8 * easeOutBack(Math.min(1, t / 1.3));
    group.current.scale.setScalar(s);
    group.current.position.y = Math.sin(t * 1.4) * 0.06;
  });

  return (
    <group ref={group}>
      <mesh geometry={geo} material={mats} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={rim} material={mats[0]} />
    </group>
  );
}

function makeSparks(pal, n = 160) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const scale = new Float32Array(n);
  const dirs = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.8 + Math.random() * 1.6;
    dirs.set([Math.cos(a) * sp, Math.sin(a) * sp, (Math.random() - 0.5) * 0.8], i * 3);
    const c = Math.random() < 0.8 ? pal.goldBright : pal.cyan;
    col.set([c.r, c.g, c.b], i * 3);
    scale[i] = 0.4 + Math.random();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  geo.setAttribute('aScale', new BufferAttribute(scale, 1));
  return { geo, dirs };
}

function Sparks() {
  const pal = usePalette();
  const material = useSoftPoints(34);
  const ref = useRef(null);
  const start = useRef(null);
  const { geo, dirs } = useMemo(() => makeSparks(pal), [pal]);

  useFrame((state) => {
    if (start.current == null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    const burst = Math.max(0, t - 0.9);
    const pos = geo.attributes.position.array;
    const r = 1.3 + burst * 1.4;
    for (let i = 0; i < dirs.length; i += 3) {
      pos[i] = dirs[i] * r;
      pos[i + 1] = dirs[i + 1] * r;
      pos[i + 2] = dirs[i + 2] * r;
    }
    geo.attributes.position.needsUpdate = true;
    material.uniforms.uOpacity.value = t < 0.9 ? 0 : Math.max(0, 1 - burst / 1.8);
  });
  return <points ref={ref} geometry={geo} material={material} />;
}
