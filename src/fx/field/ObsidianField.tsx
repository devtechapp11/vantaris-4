import { useEffect, useRef } from 'react';
import FRAG from './obsidianField.frag?raw';
import { fieldBus } from './fieldBus';
import { buildGlyphAtlas } from './glyphAtlas';
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
  const uG = {
    atlas: u('uGlyphs'), count: u('uGlyphCount'), cell: u('uCell'),
    amount: u('uGlyphAmount'), flash: u('uGlyphFlash'), tcell: u('uTrameCell'), trame: u('uTrame'), grid: u('uGrid'),
  };

  // Glyph atlas: a 1-pixel black placeholder until the real one is drawn.
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(uG.atlas, 0);
  gl.uniform1f(uG.count, 1);
  let disposed = false;

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
  let glyphs = fieldBus.glyphAmount;
  let shown = false;
  // Frame-time guard (desktop): if the first 120 measured frames average
  // below ~50 fps, the vector trame goes off for the rest of the session.
  let probeFrames = 0;
  let probeSum = 0;
  let prevNow = 0;

  const draw = (now: number) => {
    ptr.x += (ptr.tx - ptr.x) * 0.06;
    ptr.y += (ptr.ty - ptr.y) * 0.06;
    intensity += (fieldBus.intensity - intensity) * 0.05;
    const age = fieldBus.pulseAt < 0 ? -1 : (now - fieldBus.pulseAt) / 1000;
    gl.uniform1f(uTime, reduced ? 40 : (now - t0) / 1000);
    gl.uniform2f(uPointer, ptr.x, ptr.y);
    gl.uniform1f(uIntensity, intensity);
    gl.uniform3f(uPulse, fieldBus.pulseX, fieldBus.pulseY, reduced || age > 2.5 ? -1 : age);
    glyphs += (fieldBus.glyphAmount - glyphs) * (reduced ? 1 : 0.05);
    const fa = fieldBus.flashAt < 0 || reduced ? 1 : (now - fieldBus.flashAt) / fieldBus.flashDur;
    gl.uniform1f(uG.amount, glyphs);
    gl.uniform1f(uG.flash, fa < 1 ? Math.sin(Math.PI * fa) : 0);
    gl.uniform1f(uG.trame, fieldBus.trame * (phone ? 0.6 : 1));
    gl.uniform1f(uG.grid, fieldBus.grid);
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
    // Hidden (the landing): skip the GPU work, keep the loop cheap.
    canvas.classList.toggle('is-off', !fieldBus.visible);
    if (!fieldBus.visible) return;
    if (!phone && !fieldBus.trameOff && prevNow && probeFrames < 150) {
      probeFrames += 1;
      if (probeFrames > 30) probeSum += now - prevNow; // skip warm-up frames
      if (probeFrames === 150 && probeSum / 120 > 20) {
        fieldBus.trameOff = true;
        fieldBus.trame = 0;
      }
    }
    prevNow = now;
    draw(now);
  };
  const resize = () => {
    canvas.width = Math.max(1, Math.floor(innerWidth * scale));
    canvas.height = Math.max(1, Math.floor(innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uG.cell, (phone ? 22 : 18) * scale);
    gl.uniform1f(uG.tcell, (phone ? 44 : 36) * scale);
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

  buildGlyphAtlas().then(({ canvas: atlas, count }) => {
    if (disposed || gl.isContextLost()) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.useProgram(prog);
    gl.uniform1f(uG.count, count);
    if (reduced) draw(performance.now());
  }).catch(() => { /* no atlas: the matrix stays dark */ });

  // While motion is reduced the still frame follows scene changes.
  const sceneWatch = reduced ? window.setInterval(() => {
    canvas.classList.toggle('is-off', !fieldBus.visible);
    if (Math.abs(glyphs - fieldBus.glyphAmount) > 0.01) draw(performance.now());
  }, 500) : 0;

  return () => {
    disposed = true;
    window.clearInterval(sceneWatch);
    gl.deleteTexture(tex);
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('pointermove', onMove);
    document.removeEventListener('visibilitychange', onVis);
    canvas.removeEventListener('webglcontextlost', onLost);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
