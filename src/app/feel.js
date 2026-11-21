// The tactile layer, installed once for the whole site: a felt click on every
// press, a faint tick when a mouse crosses a primary control, and the light on
// metal cards following the pointer. Delegated listeners: no per-component cost.
import { sound } from '../lib/sound';

const PRESSABLE = 'button:not(:disabled), a[href], [role="radio"], [role="tab"], [role="switch"], summary';
const HOVERABLE = '.btn--primary, .option, .metal--live, .hc-opt';

export function installFeel() {
  if (typeof window === 'undefined' || window.__vantarisFeel) return;
  window.__vantarisFeel = true;

  document.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    const el = e.target.closest?.(PRESSABLE);
    if (el && !el.closest('[data-silent]')) sound.tap();
  }, { capture: true, passive: true });

  let lastHover = null;
  let lastAt = 0;
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest?.(HOVERABLE);
    if (!el || el === lastHover || el.disabled) return;
    lastHover = el;
    const now = performance.now();
    if (now - lastAt > 90) {
      lastAt = now;
      sound.hover();
    }
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    if (lastHover && !lastHover.contains(e.relatedTarget)) lastHover = null;
  }, { passive: true });

  // Specular light under the pointer on metal cards (one rAF per frame at most).
  let frame = 0;
  let pending = null;
  const place = (e) => {
    const card = e.target.closest?.('.metal');
    if (!card) return;
    pending = { card, x: e.clientX, y: e.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const { card: c, x, y } = pending;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${Math.round(x - r.left)}px`);
      c.style.setProperty('--my', `${Math.round(y - r.top)}px`);
    });
  };
  document.addEventListener('pointermove', (e) => e.pointerType === 'mouse' && place(e), { passive: true });
  // Touch: light the spot you press
  document.addEventListener('pointerdown', (e) => e.pointerType !== 'mouse' && place(e), { passive: true });
}
