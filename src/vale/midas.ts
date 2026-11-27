import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * Midas: a transmutation that spreads from a touch point over every material
 * of Vale (chrome skin and outfit). One set of uniforms, so one tween drives
 * them all.
 *   uGold = 0 → Prism Chrome: mirror plus iridescence (right answers, combos, Midas State)
 *   uGold = 1 → real gold (desk promotion only, and the landing demo)
 * The only file allowed to hold the colour of gold (guarded by check-palette).
 */
export const midasUniforms = {
  uMidas: { value: 0 },
  uGold: { value: 0 },
  uTouch: { value: new THREE.Vector3() },
  uReach: { value: 3 },
};

export function setMidasReach(object: THREE.Object3D) {
  const sphere = new THREE.Box3().setFromObject(object).getBoundingSphere(new THREE.Sphere());
  midasUniforms.uReach.value = sphere.radius * 2.4 + 0.4;
}

const VERT_DECL = /* glsl */ `
varying vec3 vMidasWPos;`;

// After project_vertex, `transformed` already holds any deformation (drei's
// MeshDistortMaterial replaces begin_vertex, so we never hook there).
const VERT_ASSIGN = /* glsl */ `
vMidasWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`;

const FRAG_DECL = /* glsl */ `
varying vec3 vMidasWPos;
uniform float uMidas;
uniform float uGold;
uniform vec3 uTouch;
uniform float uReach;
float midasHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float midasNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(midasHash(i), midasHash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(midasHash(i + vec3(0.0, 1.0, 0.0)), midasHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(midasHash(i + vec3(0.0, 0.0, 1.0)), midasHash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(midasHash(i + vec3(0.0, 1.0, 1.0)), midasHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}`;

// smoothstep(a, b, x) is undefined when a >= b (GLSL spec): always 1.0 - smoothstep(small, large, x).
const fragColor = (mask: string) => /* glsl */ `
float mMask = ${mask};
float mActive = step(0.0001, uMidas);
float mDist = distance(vMidasWPos, uTouch) + (midasNoise(vMidasWPos * 7.0) - 0.5) * 0.22;
float mRad = uMidas * uReach;
float mDone = (1.0 - smoothstep(mRad - 0.22, mRad, mDist)) * mActive * mMask;
float mFront = (1.0 - smoothstep(0.0, 0.16, abs(mDist - mRad))) * mActive * (1.0 - step(0.9999, uMidas)) * mMask;
vec3 mTarget = mix(vec3(0.92, 0.93, 0.95), vec3(1.0, 0.766, 0.336), uGold);
diffuseColor.rgb = mix(diffuseColor.rgb, mTarget, mDone);`;

const FRAG_ROUGH = /* glsl */ `
roughnessFactor = mix(roughnessFactor, mix(0.06, 0.14, uGold), mDone);`;

const FRAG_METAL = /* glsl */ `
metalnessFactor = mix(metalnessFactor, 1.0, mDone);`;

const FRAG_EMISSIVE = /* glsl */ `
vec3 mPrism = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + mDist * 2.5));
vec3 mFrontCol = mix(mix(vec3(1.0), mPrism, 0.55), vec3(1.0, 0.55, 0.18), uGold);
totalEmissiveRadiance += mFront * mFrontCol * 1.8;`;

const FRAG_LIGHTS = /* glsl */ `
#ifdef USE_IRIDESCENCE
  material.iridescence = mix(material.iridescence, 1.0, mDone * (1.0 - uGold));
#endif
#ifdef USE_SHEEN
  material.sheenColor *= (1.0 - mDone);
#endif`;

function injectAfter(src: string, chunk: string, code: string): string {
  const token = `#include <${chunk}>`;
  if (!src.includes(token)) throw new Error(`[midas] missing chunk: ${chunk}`);
  return src.replace(token, `${token}\n${code}`);
}

/**
 * Composes with an existing onBeforeCompile instead of replacing it.
 * `mask`: a GLSL float expression (1 = may transmute) evaluated after the
 * colour chunk; Vale's visor and eyes pass a mask so they never turn.
 */
export function applyMidas<M extends THREE.MeshPhysicalMaterial>(mat: M, opts: { mask?: string } = {}): M {
  if (mat.userData.midas === true) return mat;
  const prevCompile = mat.onBeforeCompile.bind(mat);
  const baseKey = mat.customProgramCacheKey();
  if (mat.iridescence === 0) mat.iridescence = 0.01; // enables USE_IRIDESCENCE, invisibly
  const mask = opts.mask ?? '1.0';

  mat.onBeforeCompile = (shader, renderer) => {
    prevCompile(shader, renderer);
    Object.assign(shader.uniforms, midasUniforms);
    shader.vertexShader = injectAfter(shader.vertexShader, 'common', VERT_DECL);
    shader.vertexShader = injectAfter(shader.vertexShader, 'project_vertex', VERT_ASSIGN);
    let f = shader.fragmentShader;
    f = injectAfter(f, 'common', FRAG_DECL);
    f = injectAfter(f, 'color_fragment', fragColor(mask));
    f = injectAfter(f, 'roughnessmap_fragment', FRAG_ROUGH);
    f = injectAfter(f, 'metalnessmap_fragment', FRAG_METAL);
    f = injectAfter(f, 'emissivemap_fragment', FRAG_EMISSIVE);
    f = injectAfter(f, 'lights_physical_fragment', FRAG_LIGHTS);
    shader.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => `midas|${mask}|${baseKey}`;
  mat.userData.midas = true;
  mat.needsUpdate = true;
  return mat;
}

/** Linear gold for the sparkles (same F0 as the shader). */
export const GOLD_LINEAR = new THREE.Color(1.0, 0.766, 0.336);

export type MidasMode = 'touch' | 'state' | 'gold' | 'demo';

/** Read by the sparkles: which sweep is running, and when it started. */
export const midasRun = { mode: 'touch' as MidasMode, at: -1e9, sweep: 0.6 };

/**
 * Starts the transmutation from `touch` (world point of the raycast, or
 * Vale's centre). Returns the timeline; `onPeak` swaps the outfit during the
 * flash of a promotion.
 */
export function playMidas(opts: { mode: MidasMode; touch: THREE.Vector3; reduced?: boolean; onPeak?: () => void }): gsap.core.Timeline {
  const { mode, touch, reduced = false, onPeak } = opts;
  const u = midasUniforms;
  gsap.killTweensOf(u.uMidas);
  gsap.killTweensOf(u.uGold);
  u.uTouch.value.copy(touch);
  u.uGold.value = mode === 'gold' || mode === 'demo' ? 1 : 0;

  const sweep = reduced ? 0.3 : mode === 'touch' ? 0.6 : mode === 'demo' ? 0.7 : 1.1;
  const hold = mode === 'state' ? Infinity : mode === 'touch' ? 0.5 : mode === 'demo' ? 0.2 : 0.6;
  midasRun.mode = mode;
  midasRun.at = performance.now();
  midasRun.sweep = sweep;
  const tl = gsap.timeline();
  tl.fromTo(u.uMidas, { value: 0 }, { value: 1, duration: sweep, ease: reduced ? 'none' : 'power2.inOut' });
  if (onPeak) tl.call(onPeak);
  if (hold !== Infinity) {
    tl.to(u.uMidas, { value: 0, duration: reduced ? 0.3 : 0.7, ease: 'power2.in', delay: hold });
    tl.set(u.uGold, { value: 0 });
  }
  return tl;
}

/** Leaves the Midas State (combo broken, lesson over). */
export function endMidasState(reduced = false) {
  gsap.killTweensOf(midasUniforms.uMidas);
  gsap.to(midasUniforms.uMidas, { value: 0, duration: reduced ? 0.2 : 0.6, ease: 'power2.in' });
}
