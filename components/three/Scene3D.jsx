import { Component, lazy, Suspense, useEffect, useState } from 'react';
import { useCan3D } from '../../app/useDevice';

// Three.js + React Three Fiber live in their own chunk and only download on
// devices that can render them, after the page is idle.
const SCENES = {
  mascot: lazy(() => import('./MascotScene')),
};

const START_DELAY_MS = 1100;

class Guard extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* WebGL unavailable or context lost: the 2D fallback stays */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Renders the 2D `fallback` everywhere, and on capable devices loads the 3D
 * scene behind it, crossfading once its first frame is drawn.
 */
export default function Scene3D({ scene, fallback = null, className = '', style, ...props }) {
  const can = useCan3D();
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [settled, setSettled] = useState(false);

  // Keep the 2D layer until the canvas has faded in over it.
  useEffect(() => {
    if (!live) return undefined;
    const t = setTimeout(() => setSettled(true), 900);
    return () => clearTimeout(t);
  }, [live]);

  // Start only after the page's entrance animations (shader compilation is
  // main-thread work), and then when the browser is idle.
  useEffect(() => {
    if (!can) return undefined;
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 250));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    let h = null;
    const t = setTimeout(() => {
      h = idle(() => setReady(true), { timeout: 1500 });
    }, START_DELAY_MS);
    return () => {
      clearTimeout(t);
      if (h != null) cancel(h);
    };
  }, [can]);

  const S = SCENES[scene];
  return (
    <div className={`s3d ${className}`} style={style} data-live={live} aria-hidden="true">
      {(!can || !settled) && <div className="s3d-layer s3d-fallback">{fallback}</div>}
      {can && ready && (
        <Guard>
          <Suspense fallback={null}>
            <div className="s3d-layer s3d-canvas">
              <S {...props} onReady={() => setLive(true)} />
            </div>
          </Suspense>
        </Guard>
      )}
    </div>
  );
}
