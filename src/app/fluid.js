// Small pieces that keep navigation feeling native: a shared-element hand-off
// from a deal row to the exercise, scroll memory for the back button,
// iOS-style swipe-back in the installed app, and pull-to-refresh.
// Everything animates transform/opacity only and respects reduced motion.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { getPrefs } from './prefs';

const reduced = () => getPrefs().reduceMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---------- Shared element (FLIP) ----------
   The route transition fades the old page out before the new one mounts, so a
   true cross-page morph isn't possible; instead the title remembers where it
   was and the new page's title flies in from there. */
const shared = new Map();

/** Call on click with the element that will become the next page's title. */
export function rememberShared(key, el) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  shared.set(key, { r, size: parseFloat(getComputedStyle(el).fontSize) || 16, at: performance.now() });
}

/** On the next page: animate `ref` from the remembered rect to where it is now (once `ready`). */
export function useSharedEnter(ref, key, ready = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;
    const from = shared.get(key);
    shared.delete(key);
    if (!from || reduced() || performance.now() - from.at > 1500) return;
    const to = el.getBoundingClientRect();
    const k = from.size / (parseFloat(getComputedStyle(el).fontSize) || 16);
    const dx = from.r.left - to.left;
    const dy = from.r.top - to.top;
    el.animate(
      [
        { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${k})` },
        { transformOrigin: '0 0', transform: 'none' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, [ref, key, ready]);
}

/* ---------- Scroll memory ----------
   New pages start at the top; going back restores where you were. */
const positions = new Map();

export function useScrollMemory() {
  const location = useLocation();
  const type = useNavigationType();
  const key = location.key;
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);
  useEffect(() => {
    let frame = 0;
    const save = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        positions.set(key, window.scrollY);
      });
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      window.removeEventListener('scroll', save);
      cancelAnimationFrame(frame);
    };
  }, [key]);
  // Called when the old page has finished leaving and the new one mounts.
  return useCallback(() => {
    const y = type === 'POP' ? positions.get(key) ?? 0 : 0;
    window.scrollTo(0, y);
    if (y > 0) {
      // Lists may still be loading: try again once they have height.
      setTimeout(() => window.scrollY < y - 4 && window.scrollTo(0, y), 250);
      setTimeout(() => window.scrollY < y - 4 && window.scrollTo(0, y), 700);
    }
  }, [type, key]);
}

/* ---------- Swipe back ----------
   Only in the installed app on iOS, which has no system back gesture there
   (browsers and Android already provide one; doubling it would go back twice). */
export function useSwipeBack(enabled) {
  const navigate = useNavigate();
  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (!enabled || !standalone || !ios) return undefined;
    let start = null;
    const down = (e) => {
      const t = e.touches[0];
      start = t.clientX < 24 ? { x: t.clientX, y: t.clientY } : null;
    };
    const end = (e) => {
      if (!start) return;
      const t = e.changedTouches[0];
      if (t.clientX - start.x > 72 && Math.abs(t.clientY - start.y) < 60) navigate(-1);
      start = null;
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchend', end, { passive: true });
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchend', end);
    };
  }, [enabled, navigate]);
}

/* ---------- Pull to refresh ----------
   Touch only, from the very top of the page. Returns the pull distance
   (0-1) for the indicator and whether a refresh is running. */
export function usePullToRefresh(onRefresh) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const run = useRef(onRefresh);
  useEffect(() => {
    run.current = onRefresh;
  }, [onRefresh]);
  useEffect(() => {
    let startY = null;
    let dist = 0;
    let frame = 0;
    const down = (e) => {
      startY = window.scrollY <= 0 && !busy ? e.touches[0].clientY : null;
      dist = 0;
    };
    const move = (e) => {
      if (startY == null) return;
      dist = Math.max(0, e.touches[0].clientY - startY);
      if (window.scrollY > 0) dist = 0;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPull(Math.min(1, dist / 90)));
    };
    const up = async () => {
      if (startY == null) return;
      startY = null;
      cancelAnimationFrame(frame);
      if (dist >= 90) {
        setBusy(true);
        setPull(1);
        try {
          await run.current?.();
        } finally {
          setBusy(false);
          setPull(0);
        }
      } else setPull(0);
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up, { passive: true });
    window.addEventListener('touchcancel', up, { passive: true });
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', up);
      cancelAnimationFrame(frame);
    };
  }, [busy]);
  return { pull, busy };
}
