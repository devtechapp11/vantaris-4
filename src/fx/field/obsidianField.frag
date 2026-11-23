#version 300 es
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;    // 0..1, origin bottom-left
uniform float uIntensity;  // 0..1, driven by the combo
uniform vec3  uPulse;      // xy = origin 0..1, z = age in seconds (< 0 = none)
out vec4 fragColor;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}

void main(){
  float aspect = uRes.x / uRes.y;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  vec3 obsidian = vec3(0.0196, 0.0275, 0.0431); // #05070B
  vec3 steel    = vec3(0.165, 0.188, 0.224);    // #2A3039
  vec3 platinum = vec3(0.788, 0.808, 0.839);    // #C9CED6
  vec3 glacier  = vec3(0.561, 0.639, 0.722);    // #8FA3B8

  // 1. Liquid mercury: domain-warped fbm, very slow
  float t = uTime * 0.03;
  vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 - t + 3.1));
  float m = fbm(p * 1.8 + 2.0 * q + vec2(t * 0.7, -t * 0.4));
  float ridge = pow(1.0 - abs(m * 2.0 - 1.0), 6.0); // bright filaments

  // 2. Architectural perspective grid (floor below the horizon).
  // Derivatives are taken outside any branch (fwidth is undefined in
  // non-uniform control flow); the floor mask is applied afterwards.
  float horizon = -0.08;
  float below = step(p.y, horizon);
  float depth = 0.35 / max(horizon - p.y, 0.002);
  vec2 g = vec2(p.x * depth, depth + uTime * 0.04);
  vec2 gv = abs(fract(g) - 0.5) / max(fwidth(g), vec2(1e-4));
  float line = 1.0 - min(min(gv.x, gv.y), 1.0);
  float grid = below * line * (1.0 - smoothstep(1.0, 8.0, depth)) * 0.35;

  // 3. Diagonal specular beam
  float beamPos = sin(uTime * 0.07) * 0.8;
  float beam = exp(-pow((p.x * 0.8 + p.y * 0.6 - beamPos) * 3.0, 2.0)) * 0.07;

  // 4. Pointer light
  vec2 ptr = (uPointer - 0.5) * vec2(aspect, 1.0);
  float pl = exp(-length(p - ptr) * 3.2) * 0.09;

  // 5. Shockwave (right answer)
  float ripple = 0.0;
  if (uPulse.z >= 0.0) {
    vec2 o = (uPulse.xy - 0.5) * vec2(aspect, 1.0);
    float d = length(p - o);
    float r = uPulse.z * 0.9;
    ripple = exp(-pow((d - r) * 18.0, 2.0)) * exp(-uPulse.z * 2.2) * 0.45;
  }

  vec3 col = obsidian;
  col = mix(col, steel * 0.55, m * 0.35);
  col += platinum * ridge * (0.075 + 0.14 * uIntensity);
  col += mix(platinum, glacier, 0.5) * grid * (0.6 + 0.5 * uIntensity);
  col += glacier * beam;
  col += platinum * pl;
  col += platinum * ripple;

  // Vignette (edge0 < edge1)
  float vig = 1.0 - smoothstep(0.25, 1.25, length(p * vec2(0.9, 1.1)));
  col = mix(obsidian * 0.6, col, vig);

  // Film grain against banding
  col += (hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.012;

  fragColor = vec4(col, 1.0);
}
