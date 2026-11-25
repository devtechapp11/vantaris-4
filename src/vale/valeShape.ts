import { Color, MeshPhysicalMaterial, SphereGeometry, Vector2, Vector3 } from 'three';

/*
  Vale's shape, shared by every 3D Vale so they are the same character as the
  2D one in the app: a chrome pebble that echoes the V (wide rounded shoulders
  tapering to a soft point), a black glass visor band across the upper third,
  two round platinum eye lights. No mouth, no limbs.

  The visor and the eyes are painted by the body material itself (a shader
  patch in object space), so their edges stay crisp and follow the surface,
  even while the chrome ripples like mercury.
*/

/** Unit sphere point → pebble surface (identical to the app's MascotScene). */
export function pebble(v: Vector3): [number, number, number] {
  const y = v.y;
  const taper = y < 0 ? 1 - 0.6 * Math.pow(-y, 1.3) : 1 - 0.05 * y * y;
  return [v.x * taper, y > 0 ? y * 0.9 : y * 1.36, v.z * 0.8 * taper];
}

/** Lowest point of the body (the tip), in object space. */
export const VALE_TIP = -1.36;

export function makeValeBody(detail: 'high' | 'low' = 'high') {
  const g = detail === 'high' ? new SphereGeometry(1, 160, 120) : new SphereGeometry(1, 96, 72);
  const p = g.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const [x, y, z] = pebble(v);
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

export type ValeUniforms = {
  uTime: { value: number };
  /** Mercury ripple of the surface: 0 still, 0.06 resting, 0.6 a liquid drop. */
  uDistort: { value: number };
  uVisorColor: { value: Color };
  uEye: { value: Color };
  /** Eye travel inside the visor, -1..1 (x right, y up). */
  uEyeOffset: { value: Vector2 };
  /** 1 open, 0 closed (blink), < 1 squint. */
  uEyeOpen: { value: number };
  uEyeGlow: { value: number };
  /** 0 round eyes, 1 happy arcs (delight). */
  uSmile: { value: number };
};

/**
 * Mirror chrome with a fine iridescence (the « prism »: the only colour on the
 * site is this dispersion of light), visor and eyes painted on, and a slow
 * mercury ripple in the vertex stage.
 */
export function makeValeMaterial() {
  const m = new MeshPhysicalMaterial({
    color: new Color('#E6E9EE'),
    metalness: 1,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    iridescence: 0.35,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [180, 420],
    envMapIntensity: 1.4,
    // The pool fades into the void; Vale never does.
    fog: false,
  });
  const u: ValeUniforms = {
    uTime: { value: 0 },
    uDistort: { value: 0.06 },
    uVisorColor: { value: new Color('#05070B') },
    uEye: { value: new Color('#F8FAFC') },
    uEyeOffset: { value: new Vector2() },
    uEyeOpen: { value: 1 },
    uEyeGlow: { value: 1 },
    uSmile: { value: 0 },
  };
  m.userData.u = u;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vObj;
        uniform float uTime; uniform float uDistort;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vObj = position;
        // Mercury: three slow interfering waves, stronger at the shoulders than at the tip.
        float w = sin(position.x * 3.1 + uTime * 1.3) * sin(position.y * 2.7 - uTime * 1.1) * sin(position.z * 3.3 + uTime * 0.9);
        float w2 = sin(position.y * 6.0 + uTime * 2.1) * sin(position.x * 4.0 - uTime * 1.7);
        transformed += normal * (w + 0.35 * w2) * uDistort * 0.26;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vObj;
        uniform vec3 uVisorColor; uniform vec3 uEye; uniform vec2 uEyeOffset;
        uniform float uEyeOpen; uniform float uEyeGlow; uniform float uSmile;
        float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        float visorMask() {
          float ang = atan(vObj.x, vObj.z);
          vec2 p = vec2(ang * 0.62, vObj.y - 0.36);
          float d = sdRound(p, vec2(0.62, 0.19), 0.17);
          float aa = fwidth(d) * 1.2;
          return (1.0 - smoothstep(-aa, aa, d)) * step(0.0, vObj.z);
        }
        float eyeMask(float side, out float halo) {
          float ang = atan(vObj.x, vObj.z);
          vec2 c = vec2(side * 0.21, 0.38) + uEyeOffset * vec2(0.12, 0.06);
          vec2 p = vec2(ang * 0.62, vObj.y) - c;
          // Happy arcs: bend the eye into an upside-down U while smiling.
          p.y += uSmile * (0.9 * p.x * p.x - 0.018);
          p.y /= max(uEyeOpen, 0.08);
          float d = length(p) - 0.066;
          float arc = abs(length(p + vec2(0.0, 0.05)) - 0.07) - 0.017;
          d = mix(d, max(arc, -p.y - 0.02), uSmile);
          float aa = fwidth(d) * 1.2;
          halo = exp(-max(d, 0.0) * 40.0) * 0.6;
          return 1.0 - smoothstep(-aa, aa, d);
        }`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        float visor = visorMask();
        diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(-1.25, 0.35, vObj.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, uVisorColor, visor);
        metalnessFactor = mix(metalnessFactor, 0.0, visor);
        roughnessFactor = mix(roughnessFactor, 0.06, visor);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        material.clearcoat *= mix(1.0, 0.3, visor);
        material.specularColor *= mix(1.0, 0.35, visor);
        #ifdef USE_IRIDESCENCE
          material.iridescence *= 1.0 - visor;
        #endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float hl, hr;
        float eyes = eyeMask(-1.0, hl) + eyeMask(1.0, hr);
        totalEmissiveRadiance += uEye * (eyes * 2.6 + (hl + hr)) * uEyeGlow * visor;`);
  };
  // Same program for every Vale: the patch is identical.
  m.customProgramCacheKey = () => 'vale-v1';
  return m;
}
