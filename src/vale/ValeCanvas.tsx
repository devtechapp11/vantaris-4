import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import ValeStage from './ValeStage';
import ValeModel from './ValeModel';
import ValeGlb, { VALE_GLB } from './ValeGlb';
import Ripples from './Ripples';
import './vale3d.css';

/** Compile every shader once the scene is mounted, so the first move never stutters. */
function Precompile() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        gl.compile(scene, camera);
      } catch {
        /* best effort */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [gl, scene, camera]);
  return null;
}

/** Portrait screens: step the camera back so Vale keeps ~60% of the width. */
function Fit({ z }: { z: number }) {
  const { camera, size, scene } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    camera.position.z = aspect >= 1 ? z : z * Math.min(2, Math.max(1, (1 / aspect) * 0.75));
    camera.updateProjectionMatrix();
    // The pool's fog starts just past Vale, wherever the camera stands.
    const fog = scene.fog as { near: number; far: number } | null;
    if (fog) {
      fog.near = camera.position.z + 0.1;
      fog.far = camera.position.z + 8.6;
    }
  }, [camera, size, scene, z]);
  return null;
}

/** Render only while on screen and while the tab is visible. */
function useActive(ref: React.RefObject<HTMLElement | null>) {
  const [onScreen, setOnScreen] = useState(true);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  useEffect(() => {
    const el = ref.current;
    const vis = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', vis);
    let io: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: '120px' });
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', vis);
    };
  }, [ref]);
  return onScreen && visible;
}

type Props = {
  lowPower: boolean;
  reduced: boolean;
  /** Called on the first rendered frame (the poster can go). */
  onReady?: () => void;
  className?: string;
  /** Extra scene content (camera rig, post-processing…). */
  children?: ReactNode;
  camera?: { position: [number, number, number]; fov: number };
  /** Keep Vale framed on portrait screens (off when a camera rig drives the camera). */
  fit?: boolean;
};

/**
 * The one WebGL canvas: chrome studio, reflecting pool, ripples and Vale.
 * dpr is capped (1.75, or 1.25 on low-power devices); the canvas pauses off
 * screen and in a hidden tab.
 */
export default function ValeCanvas({ lowPower, reduced, onReady, className = '', children, camera = { position: [0, 0.2, 7.4], fov: 32 }, fit = true }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const active = useActive(wrap);
  return (
    <div ref={wrap} className={`vale3d ${className}`}>
      <Canvas
        dpr={[1, lowPower ? 1.25 : 1.75]}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: camera.position, fov: camera.fov, near: 0.1, far: 60 }}
        gl={{ antialias: !lowPower, powerPreference: 'high-performance', alpha: false }}
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          <ValeStage lowPower={lowPower} />
          {VALE_GLB
            ? <ValeGlb url={VALE_GLB} reduced={reduced} lowPower={lowPower} onReady={onReady} />
            : <ValeModel reduced={reduced} lowPower={lowPower} onReady={onReady} />}
          <Ripples />
          <Precompile />
          {fit && <Fit z={camera.position[2]} />}
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}
