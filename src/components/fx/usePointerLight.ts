import { useEffect, type RefObject } from 'react';

/**
 * Sets --mx / --my (px) on the element as a fine pointer moves over it, at most
 * once per frame. Touch screens keep the default light in the top-left corner.
 */
export function usePointerLight(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia?.('(pointer: fine)').matches) return undefined;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${Math.round(x - r.left)}px`);
      el.style.setProperty('--my', `${Math.round(y - r.top)}px`);
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      el.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
}
