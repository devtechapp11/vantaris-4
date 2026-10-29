import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { AdditiveBlending, Color, PMREMGenerator, ShaderMaterial } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { cssVar } from '../../design/tokens';

/** Studio reflections for metallic materials, without loading an HDR file. */
export function StudioEnv({ intensity = 0.04 }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), intensity).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

/** Brand colours, read once from tokens.css. */
export function usePalette() {
  return useMemo(() => ({
    gold: new Color(cssVar('--gold-500', '#D4AF37')),
    goldBright: new Color(cssVar('--gold-400', '#F1D27A')),
    goldPale: new Color(cssVar('--gold-300', '#F7E3A3')),
    cyan: new Color(cssVar('--cyan-500', '#00D4FF')),
    violet: new Color(cssVar('--violet-500', '#A98BFF')),
    navy: new Color(cssVar('--navy-500', '#2A3866')),
    platinum: new Color(cssVar('--platinum-500', '#DCE3EE')),
  }), []);
}

/** Soft round additive points with per-vertex colour and size attenuation. */
export function useSoftPoints(size = 26) {
  return useMemo(() => new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexColors: true,
    uniforms: { uSize: { value: size }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uSize; uniform float uPixelRatio;
      attribute float aScale;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * aScale * uPixelRatio / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a * a * uOpacity);
      }`,
  }), [size]);
}

/** Pause rendering while the canvas is off screen. Returns [ref, frameloop]. */
export function useOnScreenFrameloop() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible ? 'always' : 'never'];
}

/** Pointer position in -1..1, tracked on the window (the canvas itself ignores pointer events). */
export function useWindowPointer() {
  const p = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return p;
}

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeOutBack = (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
