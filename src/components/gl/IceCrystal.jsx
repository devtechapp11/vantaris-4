import { useEffect, useRef, useState } from 'react';
import { follow, hasWebGL, rgb, runShader } from '../../lib/gl';
import './gl.css';

/*
  The Vantaris artifact: a faceted glacier crystal held in a ring of liquid
  platinum, raymarched in one fragment shader. It floats, refracts a cold
  blue key light, and leans toward the pointer (or the tilt of the phone)
  with spring inertia; scrolling turns it.
*/
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLean;
uniform float uScroll;
uniform vec3 uBlack, uDeep, uIce, uIcePale, uPlat, uWhite;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdOct(vec3 p, float s) { p = abs(p); return (p.x + p.y + p.z - s) * 0.57735027; }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

vec3 rCrystal(vec3 p) {
  p.y -= sin(uTime * 0.9) * 0.07;
  p.xz *= rot(uTime * 0.32 + uLean.x * 0.9 + uScroll * 3.2);
  p.yz *= rot(-uLean.y * 0.5 + 0.18);
  return p;
}
float crystal(vec3 p) {
  vec3 q = p; q.y /= 1.62;
  float a = sdOct(q, 0.98);
  vec3 r = q; r.xz *= rot(0.7853982);
  float b = sdOct(r, 1.04);
  float cut = abs(p.y) - 1.42;
  return max(max(a, b), cut);
}
float ring(vec3 p) {
  p.y -= sin(uTime * 0.9 + 0.6) * 0.05;
  p.yz *= rot(1.12 + uLean.y * 0.3);
  p.xy *= rot(0.38 + uLean.x * 0.2);
  p.xz *= rot(-uTime * 0.45 - uScroll * 2.0);
  float ang = atan(p.z, p.x);
  float wob = 0.07 + 0.028 * sin(ang * 3.0 + uTime * 1.7) + 0.014 * sin(ang * 7.0 - uTime * 2.3);
  vec2 q = vec2(length(p.xz) - 1.62, p.y);
  float d = length(q) - wob;
  vec3 c1 = vec3(cos(uTime * 0.7) * 1.62, 0.0, sin(uTime * 0.7) * 1.62);
  vec3 c2 = vec3(cos(uTime * 0.7 + 3.4) * 1.62, 0.0, sin(uTime * 0.7 + 3.4) * 1.62);
  d = smin(d, length(p - c1) - 0.15, 0.22);
  d = smin(d, length(p - c2) - 0.11, 0.2);
  return d * 0.8;
}
vec2 map(vec3 p) {
  float c = crystal(rCrystal(p));
  float r = ring(p);
  return c < r ? vec2(c, 1.0) : vec2(r, 2.0);
}
vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(map(p + e.xyy).x - map(p - e.xyy).x, map(p + e.yxy).x - map(p - e.yxy).x, map(p + e.yyx).x - map(p - e.yyx).x));
}
vec3 env(vec3 d) {
  vec3 c = mix(uBlack, uDeep, smoothstep(-0.8, 0.4, d.y));
  c += uPlat * pow(max(0.0, d.y), 1.6) * 0.55;
  c += uIce * pow(max(0.0, dot(d, normalize(vec3(-0.75, 0.15, 0.65)))), 6.0) * 1.1;
  c += uIcePale * smoothstep(0.06, 0.0, abs(d.y - 0.1 - 0.1 * d.x)) * 0.7;
  c += uWhite * pow(max(0.0, dot(d, normalize(vec3(0.6, 0.7, 0.4)))), 24.0) * 2.2;
  c += uWhite * smoothstep(0.985, 1.0, dot(d, normalize(vec3(-0.2, 0.9, 0.4)))) * 1.5;
  return c;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec3 ro = vec3(0.0, 0.0, 5.6);
  vec3 rd = normalize(vec3(uv, -1.3));
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float b = dot(ro, rd);
  float disc = b * b - dot(ro, ro) + 4.2;
  float glow = 0.0;
  if (disc > 0.0) {
    float t = max(0.0, -b - sqrt(disc));
    float id = 0.0;
    float dmin = 10.0;
    for (int i = 0; i < 80; i++) {
      vec2 h = map(ro + rd * t);
      dmin = min(dmin, h.x);
      if (h.x < 0.0012) { id = h.y; break; }
      t += h.x;
      if (t > 8.0) break;
    }
    glow = exp(-dmin * 9.0);
    if (id > 0.0) {
      vec3 p = ro + rd * t;
      vec3 n = normalAt(p);
      float fres = pow(1.0 - max(0.0, dot(-rd, n)), 3.0);
      vec3 refl = env(reflect(rd, n));
      if (id < 1.5) {
        vec3 r1 = refract(rd, n, 0.69);
        vec3 r2 = refract(rd, n, 0.66);
        vec3 inner = env(r1 * vec3(1.0, -1.0, 1.0)) * mix(uIcePale, uWhite, 0.45) * 0.9 + env(r2.zyx) * uIce * 0.8;
        inner += uDeep * 0.5 + uIce * 0.12;
        float facet = pow(abs(dot(n, normalize(vec3(0.3, 0.9, 0.2)))), 4.0);
        float rim = pow(abs(dot(n, normalize(vec3(-0.8, 0.1, 0.6)))), 8.0);
        col = mix(inner, refl * 1.4, 0.3 + 0.65 * fres) + uIcePale * facet * 0.35 + uIce * rim * 0.4;
      } else {
        col = refl * mix(uPlat, uWhite, 0.4) * 1.25 + uPlat * 0.12 + uWhite * fres * 0.5;
        col = mix(col, col * uIcePale, 0.15);
      }
      alpha = 1.0;
    }
  }
  vec3 halo = uIce * glow * 0.35;
  vec2 q = gl_FragCoord.xy / uRes;
  float edge = smoothstep(0.0, 0.18, q.x) * smoothstep(1.0, 0.82, q.x) * smoothstep(0.0, 0.18, q.y) * smoothstep(1.0, 0.82, q.y);
  halo *= edge;
  float ha = glow * 0.28 * edge;
  col = col * alpha + halo * (1.0 - alpha);
  alpha = max(alpha, ha);
  col = 1.0 - exp(-col * 1.35);
  gl_FragColor = vec4(col, alpha);
}
`;

/**
 * The crystal canvas. `scrollRef` (optional) is a ref to a 0–1 scroll value.
 * Falls back to a still CSS crystal without WebGL.
 */
export default function IceCrystal({ className = '', still = false, scrollRef }) {
  const ref = useRef(null);
  const [ok, setOk] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !hasWebGL()) {
      setOk(false);
      return undefined;
    }
    const colors = {
      uBlack: rgb('--black', '#05070B'), uDeep: rgb('--ice-deep', '#1B2452'), uIce: rgb('--ice', '#38BDF8'),
      uIcePale: rgb('--ice-pale', '#BAE6FD'), uPlat: rgb('--platinum', '#E4E8EE'), uWhite: rgb('--white-metal', '#F8FAFC'),
    };
    const aim = { x: 0, y: 0 };
    const lx = { x: 0, v: 0 };
    const ly = { x: 0, v: 0 };
    const sc = { x: 0, v: 0 };
    const onMove = (e) => {
      aim.x = (e.clientX / window.innerWidth - 0.5) * 2;
      aim.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onTilt = (e) => {
      if (e.gamma == null) return;
      aim.x = Math.max(-1, Math.min(1, e.gamma / 35));
      aim.y = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 35));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('deviceorientation', onTilt, { passive: true });
    let prev = 0;
    const run = runShader(canvas, FRAG, {
      still,
      maxDpr: 1.5,
      onFirstFrame: () => setLive(true),
      frame(t, set) {
        const dt = Math.min(0.05, prev ? t - prev : 0.016);
        prev = t;
        set('uTime', still ? 2.4 : t);
        set('uLean', follow(lx, aim.x, dt, 30), follow(ly, aim.y, dt, 30));
        set('uScroll', follow(sc, scrollRef?.current ?? 0, dt, 22));
        Object.entries(colors).forEach(([k, v]) => set(k, ...v));
      },
    });
    if (!run) setOk(false);
    return () => {
      run?.stop();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, [still, scrollRef]);

  return (
    <div className={`ice ${className}`} aria-hidden="true">
      {ok ? <canvas ref={ref} className={`ice-canvas ${live ? 'is-live' : ''}`} /> : null}
      {(!ok || !live) && <span className="ice-fallback"><i /><i /></span>}
    </div>
  );
}
