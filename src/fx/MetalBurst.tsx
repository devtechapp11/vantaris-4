import { useEffect, useRef } from 'react';
import { getPrefs } from '../app/prefs';

// Polished metal, from white highlight to dark steel (all on palette).
const SHADES = ['#F8FAFC', '#E6E9EE', '#E6E9EE', '#C9CED6', '#C9CED6', '#9AA3AE', '#9AA3AE', '#8A929D', '#7C848F', '#5B6470'];
const MAX = 140;

type Shard = { x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number; life: number; age: number; quad: boolean };
type Ring = { x: number; y: number; age: number };

const COUNT = { correct: 12, 2: 30, 3: 55, 5: 100 } as const;
export type BurstLevel = keyof typeof COUNT;

function allowed() {
  const p = getPrefs();
  if (!p.celebrations || p.reduceMotion) return false;
  return !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** The particle field; one canvas for the whole app, idle (no loop) when empty. */
class Field {
  shards: Shard[] = [];
  rings: Ring[] = [];
  canvas: HTMLCanvasElement | null = null;
  raf = 0;
  last = 0;

  attach(c: HTMLCanvasElement | null) {
    this.canvas = c;
  }

  emit(x: number, y: number, n: number, ring = false, spread = 1) {
    if (!this.canvas || !allowed()) return;
    const room = Math.max(0, MAX - this.shards.length);
    for (let i = 0; i < Math.min(n, room); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7 * spread;
      const v = 260 + Math.random() * 520;
      this.shards.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 80,
        r: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 18,
        s: 3 + Math.random() * 5,
        life: 0.9 + Math.random() * 0.7,
        age: 0,
        quad: Math.random() < 0.45,
      });
    }
    if (ring) this.rings.push({ x, y, age: 0 });
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  frame = (now: number) => {
    const c = this.canvas;
    const g = c?.getContext('2d');
    if (!c || !g) {
      this.raf = 0;
      return;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    this.shards = this.shards.filter((p) => (p.age += dt) < p.life);
    for (const p of this.shards) {
      p.vy += 980 * dt;
      p.vx *= 1 - 1.6 * dt;
      p.vy *= 1 - 0.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      const fade = p.age > p.life * 0.7 ? 1 - (p.age - p.life * 0.7) / (p.life * 0.3) : 1;
      // The shade follows the facet's angle to the light: it flashes as it turns.
      const k = Math.round(((1 - Math.cos(p.r)) / 2) * (SHADES.length - 1));
      g.globalAlpha = Math.max(0, fade);
      g.fillStyle = SHADES[k];
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.beginPath();
      if (p.quad) {
        g.moveTo(-p.s, -p.s * 0.35);
        g.lineTo(p.s, -p.s * 0.2);
        g.lineTo(p.s * 0.8, p.s * 0.35);
        g.lineTo(-p.s * 0.9, p.s * 0.25);
      } else {
        g.moveTo(0, -p.s);
        g.lineTo(p.s * 0.7, p.s * 0.6);
        g.lineTo(-p.s * 0.6, p.s * 0.5);
      }
      g.closePath();
      g.fill();
      g.restore();
    }

    this.rings = this.rings.filter((r) => (r.age += dt) < 0.7);
    for (const r of this.rings) {
      const t = r.age / 0.7;
      g.globalAlpha = 1 - t;
      g.strokeStyle = SHADES[3];
      g.lineWidth = 1;
      g.beginPath();
      g.arc(r.x, r.y, 20 + t * 260, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;

    if (this.shards.length || this.rings.length) this.raf = requestAnimationFrame(this.frame);
    else {
      g.clearRect(0, 0, w, h);
      this.raf = 0;
    }
  };
}

const field = new Field();

function centre(el: Element | null | undefined) {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Metal shards out of an element: 12 for a correct answer, 30 / 55 / 100 at x2 / x3 / x5 (with a shock ring). */
export const metalBurst = {
  burst(el: Element | null | undefined, level: BurstLevel = 'correct') {
    const { x, y } = centre(el);
    field.emit(x, y, COUNT[level], level === 5);
  },
  /** At a point in the viewport (px), with an explicit count. */
  at(x: number, y: number, n: number, ring = false, spread = 1) {
    field.emit(x, y, n, ring, spread);
  },
};

/** Mount once at the app root: the fixed overlay canvas (pointer-events: none). */
export default function MetalBurst() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    field.attach(ref.current);
    return () => field.attach(null);
  }, []);
  return <canvas ref={ref} aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 120 }} />;
}
