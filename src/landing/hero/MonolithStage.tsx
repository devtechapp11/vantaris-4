import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { hasWebGL, lowPower, useMedia } from '../../app/useDevice';
import { usePrefs } from '../../app/prefs';
import { ledger, measureLedger } from './ledger';
import './monolith.css';

// three, fiber, drei and maath only load once the stage is near the screen.
const MonolithScene = lazy(() => import('./MonolithScene'));

/** The static poster: three slabs in CSS, shown while the scene loads and instead of it. */
function Poster() {
  return (
    <div className="mono-poster" aria-hidden="true">
      <i className="mono-slab mono-slab--platinum" />
      <i className="mono-slab mono-slab--chrome" />
      <i className="mono-slab mono-slab--glass" />
    </div>
  );
}

/**
 * Where the Ledger Monolith lives. `fixed`: a layer pinned to the right half of
 * the desktop landing, scrubbed by the scroll. `inline`: a band in the phone
 * hero, low power, rendering only while on screen.
 */
export default function MonolithStage({ variant }: { variant: 'fixed' | 'inline' }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefs = usePrefs();
  const reduce = useReducedMotion() || prefs.reduceMotion;
  const phone = useMedia('(max-width: 899px), (pointer: coarse)');
  const [near, setNear] = useState(false);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(ledger.locked);
  const can = !reduce && prefs.effects3d && hasWebGL();
  const low = phone || lowPower();

  useEffect(() => ledger.subscribe(() => setLocked(true)), []);

  // Never compete with the first paint or the opening: the 3D chunk is parsed
  // once the page is idle (the CSS poster stands in until then).
  // On phones it waits for the first touch or scroll: a visitor who only reads
  // the hero never pays for three.js on a mobile CPU.
  useEffect(() => {
    let idleId = 0;
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => {
        const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
        idleId = idle(() => setArmed(true), { timeout: 1500 }) as number;
      }, phone ? 0 : 700);
    };
    const events = ['pointerdown', 'touchstart', 'scroll', 'keydown'] as const;
    const onFirst = () => {
      events.forEach((e) => removeEventListener(e, onFirst));
      arm();
    };
    if (phone) events.forEach((e) => addEventListener(e, onFirst, { passive: true, once: true }));
    else arm();
    return () => {
      events.forEach((e) => removeEventListener(e, onFirst));
      clearTimeout(timer);
      (window.cancelIdleCallback ?? window.clearTimeout)(idleId);
    };
  }, [phone]);

  // Load when the stage comes within reach; pause while it is off screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || !can) return undefined;
    const io = new IntersectionObserver(([e]) => {
      setVisible(e.isIntersecting);
      if (e.isIntersecting) setNear(true);
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [can]);

  // The page's scroll drives explode / orbit / reassemble (read by the scene each frame).
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measureLedger();
      });
    };
    measureLedger();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div ref={ref} className={`mono mono--${variant} ${ready ? 'is-ready' : ''} ${locked ? 'is-locked' : ''}`} aria-hidden="true">
      <Poster />
      {can && near && armed && (
        <Suspense fallback={null}>
          <MonolithScene low={low} active={visible} onReady={() => setReady(true)} />
        </Suspense>
      )}
    </div>
  );
}
