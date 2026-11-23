import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { hasWebGL, rgb, runShader } from '../../lib/gl';
import { usePrefs } from '../../app/prefs';
import './gl.css';

/*
  The app's backdrop: slow waves of brushed obsidian metal with a cold
  glacier sheen on the crests. Rendered at a fraction of screen resolution
  (it is soft by design) and kept dark so text always reads first.
*/
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBlack, uCarbon, uSteel, uIce, uIcePale, uDeep;

float h(vec2 p, float t) {
  return sin(p.x * 1.3 + t * 0.16 + sin(p.y * 1.7 - t * 0.11) * 1.4) * 0.55
       + sin(p.y * 2.6 + p.x * 0.6 + t * 0.13) * 0.28
       + sin((p.x - p.y) * 4.1 - t * 0.09) * 0.08;
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy / min(uRes.x, uRes.y)) * 2.2;
  float t = uTime;
  float e = 0.02;
  float c = h(p, t);
  vec3 n = normalize(vec3(h(p + vec2(e, 0.0), t) - c, h(p + vec2(0.0, e), t) - c, e * 1.6));
  vec3 l = normalize(vec3(-0.5, 0.6, 0.6));
  float diff = max(0.0, dot(n, l));
  float spec = pow(max(0.0, dot(reflect(-l, n), vec3(0.0, 0.0, 1.0))), 28.0);
  float brush = sin((p.x + c * 0.3) * 260.0) * 0.5 + 0.5;
  vec3 col = mix(uBlack, uCarbon, diff * 0.85);
  col += uSteel * diff * diff * 0.09 * (0.8 + 0.2 * brush);
  col += mix(uIce, uIcePale, 0.5) * spec * 0.24;
  col = mix(col, uDeep * 0.5, smoothstep(0.2, 1.0, uv.y) * 0.18);
  float vig = smoothstep(1.25, 0.2, length(uv - vec2(0.5, 0.42)));
  col *= 0.55 + 0.45 * vig;
  gl_FragColor = vec4(col, 1.0);
}
`;

export default function MetalWaves({ className = '' }) {
  const ref = useRef(null);
  const prefs = usePrefs();
  const reduce = useReducedMotion() || prefs.reduceMotion;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !hasWebGL()) return undefined;
    const colors = {
      uBlack: rgb('--black', '#05070B'), uCarbon: rgb('--carbon', '#10141B'), uSteel: rgb('--silver', '#B6BEC8'),
      uIce: rgb('--ice', '#38BDF8'), uIcePale: rgb('--ice-pale', '#BAE6FD'), uDeep: rgb('--ice-deep', '#1B2452'),
    };
    const run = runShader(canvas, FRAG, {
      still: reduce,
      maxDpr: 1,
      scale: 0.4,
      onFirstFrame: () => canvas.classList.add('is-live'),
      frame(t, set) {
        set('uTime', reduce ? 8 : t);
        Object.entries(colors).forEach(([k, v]) => set(k, ...v));
      },
    });
    return () => run?.stop();
  }, [reduce]);
  return <canvas ref={ref} className={`waves ${className}`} aria-hidden="true" />;
}
