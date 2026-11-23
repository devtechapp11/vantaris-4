// A tiny full-screen fragment-shader runtime (no Three.js): one triangle, a
// few uniforms, and the rules every Vantaris shader follows. It renders at a
// capped pixel ratio, drops resolution when frames run long, pauses when the
// canvas is off screen or the tab is hidden, and draws a single still frame
// when motion is reduced.
import { cssVar } from '../design/tokens';

const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

/** A palette colour from tokens.css as a 0–1 RGB triple. */
export function rgb(name, fallback) {
  const hex = cssVar(name, fallback).trim().replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl'));
  } catch {
    return false;
  }
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(log || 'shader compile failed');
  }
  return s;
}

/**
 * Runs `frag` on `canvas`. `frame(t, set)` is called before each draw so the
 * caller can update uniforms with set(name, ...values).
 * Returns { stop, still } or null when WebGL is unavailable.
 */
export function runShader(canvas, frag, { frame, maxDpr = 1.5, scale = 1, still = false, onFirstFrame } = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true, powerPreference: 'high-performance' });
  if (!gl) return null;
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
  } catch {
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const cache = new Map();
  const set = (name, ...v) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
    const u = cache.get(name);
    if (u == null) return;
    if (v.length === 1) gl.uniform1f(u, v[0]);
    else if (v.length === 2) gl.uniform2f(u, v[0], v[1]);
    else gl.uniform3f(u, v[0], v[1], v[2]);
  };

  // Resolution: device pixels × quality, which falls when frames run long.
  let quality = 1;
  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * scale * quality;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    set('uRes', w, h);
  };

  let raf = 0;
  let visible = true;
  let first = true;
  let last = 0;
  let slow = 0;
  const t0 = performance.now();
  const draw = (now) => {
    raf = 0;
    if (!visible || document.hidden) return;
    if (last) {
      const dt = now - last;
      slow = dt > 24 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 20 && quality > 0.5) {
        quality = Math.max(0.5, quality * 0.8);
        slow = 0;
      }
    }
    last = now;
    size();
    frame?.((now - t0) / 1000, set);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (first) {
      first = false;
      onFirstFrame?.();
    }
    if (!still) raf = requestAnimationFrame(draw);
  };
  const kick = () => {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(draw);
    }
  };

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) kick();
  });
  io.observe(canvas);
  const onVis = () => !document.hidden && kick();
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => still && kick());
  ro.observe(canvas);
  kick();

  return {
    stop() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
    redraw: kick,
  };
}

/** Critically damped spring step toward a target (inertia without overshoot). */
export function follow(state, target, dt, stiffness = 40) {
  const k = stiffness;
  const c = 2 * Math.sqrt(k) * 0.82;
  state.v += (k * (target - state.x) - c * state.v) * dt;
  state.x += state.v * dt;
  return state.x;
}
