/**
 * Midas Touch (DOM): the Prism Chrome edge reveals itself from the touched
 * point of a card. Call it AFTER the server said `correct: true`, with the
 * coordinates of the last pointerdown. Styles: .midas-surface (midas.css).
 */
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function midasTouch(el: HTMLElement, clientX?: number, clientY?: number): Animation[] {
  if (typeof el.animate !== 'function') return [];
  const r = el.getBoundingClientRect();
  const x = (clientX ?? r.left + r.width / 2) - r.left;
  const y = (clientY ?? r.top + r.height / 2) - r.top;
  const reach = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) + 32;

  el.style.setProperty('--mx', `${x}px`);
  el.style.setProperty('--my', `${y}px`);

  if (reducedMotion()) {
    el.style.setProperty('--midas-r', `${reach}px`);
    return [
      el.animate([{ '--midas-o': 0 }, { '--midas-o': 1, offset: 0.2 }, { '--midas-o': 1, offset: 0.7 }, { '--midas-o': 0 }] as Keyframe[], { duration: 1200 }),
    ];
  }
  const reveal = el.animate([{ '--midas-r': '0px' }, { '--midas-r': `${reach}px` }] as Keyframe[], {
    duration: 650,
    easing: 'cubic-bezier(.2,.7,.1,1)',
    fill: 'forwards',
  });
  const fade = el.animate([{ '--midas-o': 1 }, { '--midas-o': 1, offset: 0.65 }, { '--midas-o': 0 }] as Keyframe[], { duration: 1500, easing: 'ease-out' });
  fade.onfinish = () => reveal.cancel();
  return [reveal, fade];
}

/** Midas State (x5 combo, streak milestone): one class on <html>, CSS does the rest. */
export function setMidasState(on: boolean) {
  document.documentElement.classList.toggle('is-midas-state', on);
}
