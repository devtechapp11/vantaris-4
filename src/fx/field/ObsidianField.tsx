import { useEffect, useRef } from 'react';
import FRAG from './obsidianField.frag?raw';
import { fieldBus } from './fieldBus';
import './field.css';

const VERT = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

/**
 * The living background: one full-screen WebGL2 canvas behind the landing and
 * the app. Rendered below native resolution, 30 fps max on phones, paused
 * while the tab is hidden, a single still frame when motion is reduced, and a
 * CSS gradient when WebGL2 is missing or the context is lost.
 *
 * `still` follows the in-app « Reduce motion » setting on top of the OS one.
 */
export default function ObsidianField({ still = false }: { still?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    let dispose: (() => void) | undefined;
    // Start after the first paint: the CSS gradient carries the first frame.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 120));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => {
      dispose = start(canvas, still);
    });
    return () => {
      cancelIdle(handle as number);
      dispose?.();
    };
  }, [still]);

  return <canvas ref={ref} className="field" aria-hidden="true" />;
}

function start(canvas: HTMLCanvasElement, stillPref: boolean): (() => void) | undefined {
  const fail = () => {
    canvas.dataset.fallback = '1';
    canvas.classList.remove('is-live');
  };
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) {
    fail();
    return undefined;
  }

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) {
    fail();
    return undefined;
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    fail();
    return undefined;
  }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = u('uRes');
  const uTime = u('uTime');
  const uPointer = u('uPointer');
  const uIntensity = u('uIntensity');
  const uPulse = u('uPulse');

  const phone = matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  const reduced = stillPref || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scale = phone ? 0.5 : Math.min(devicePixelRatio, 1.5) * 0.75;
  // rAF ticks every ~16.7 ms; the 2 ms slack keeps a steady 30 fps instead of jittering to 20.
  const minDt = phone ? 1000 / 30 - 2 : 0;
  const t0 = performance.now();
  const ptr = { x: 0.5, y: 0.6, tx: 0.5, ty: 0.6 };
  let raf = 0;
  let last = 0;
  let intensity = fieldBus.intensity;
  let shown = false;

  const draw = (now: number) => {
    ptr.x += (ptr.tx - ptr.x) * 0.06;
    ptr.y += (ptr.ty - ptr.y) * 0.06;
    intensity += (fieldBus.intensity - intensity) * 0.05;
    const age = fieldBus.pulseAt < 0 ? -1 : (now - fieldBus.pulseAt) / 1000;
    gl.uniform1f(uTime, reduced ? 40 : (now - t0) / 1000);
    gl.uniform2f(uPointer, ptr.x, ptr.y);
    gl.uniform1f(uIntensity, intensity);
    gl.uniform3f(uPulse, fieldBus.pulseX, fieldBus.pulseY, reduced || age > 2.5 ? -1 : age);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!shown) {
      shown = true;
      canvas.classList.add('is-live');
    }
  };
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (now - last < minDt) return;
    last = now;
    draw(now);
  };
  const resize = () => {
    canvas.width = Math.max(1, Math.floor(innerWidth * scale));
    canvas.height = Math.max(1, Math.floor(innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    if (reduced) draw(performance.now());
  };
  const onMove = (e: PointerEvent) => {
    ptr.tx = e.clientX / innerWidth;
    ptr.ty = 1 - e.clientY / innerHeight;
  };
  const onVis = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden && !reduced) raf = requestAnimationFrame(loop);
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    fail();
  };

  resize();
  addEventListener('resize', resize);
  if (!phone && !reduced) addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', onLost);
  if (reduced) draw(performance.now());
  else raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('pointermove', onMove);
    document.removeEventListener('visibilitychange', onVis);
    canvas.removeEventListener('webglcontextlost', onLost);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
