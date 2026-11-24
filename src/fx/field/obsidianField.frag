#version 300 es
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;    // 0..1, origin bottom-left
uniform float uIntensity;  // 0..1, driven by the combo
uniform vec3  uPulse;      // xy = origin 0..1, z = age in seconds (< 0 = none)

uniform sampler2D uGlyphs; // glyph atlas, sorted by ink density
uniform float uGlyphCount;
uniform float uCell;       // glyph cell, in pixels
uniform float uGlyphAmount;// 0..1, the scene's resting level
uniform float uGlyphFlash; // 0..1, the promotion rain
uniform float uTrameCell;  // vector trame cell, in pixels
uniform float uTrame;      // 0..1

out vec4 fragColor;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5; mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}
float fbm3(vec2 p){
  float v = 0.0, a = 0.5; mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++){ v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}
float sdSeg(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
vec2 toP(vec2 px){ return (px - 0.5 * uRes) / uRes.y; }
float ripple(vec2 p){
  if (uPulse.z < 0.0) return 0.0;
  vec2 o = (uPulse.xy - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float d = length(p - o);
  return exp(-pow((d - uPulse.z * 0.9) * 18.0, 2.0)) * exp(-uPulse.z * 2.2);
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 p = toP(frag);

  vec3 obsidian = vec3(0.0196, 0.0275, 0.0431); // #05070B
  vec3 steel    = vec3(0.165, 0.188, 0.224);    // #2A3039
  vec3 platinum = vec3(0.788, 0.808, 0.839);    // #C9CED6
  vec3 glacier  = vec3(0.561, 0.639, 0.722);    // #8FA3B8

  // 1. Liquid mercury: domain-warped fbm, very slow
  float t = uTime * 0.03;
  vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 - t + 3.1));
  float m = fbm(p * 1.8 + 2.0 * q + vec2(t * 0.7, -t * 0.4));
  float ridge = pow(1.0 - abs(m * 2.0 - 1.0), 6.0);

  // 2. Perspective grid below the horizon. fwidth stays outside any branch
  // (undefined in non-uniform control flow); the floor mask comes after.
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
  vec2 ptr = toP(uPointer * uRes);
  float pl = exp(-length(p - ptr) * 3.2) * 0.09;

  vec3 col = obsidian;
  col = mix(col, steel * 0.55, m * 0.35);
  col += platinum * ridge * (0.06 + 0.12 * uIntensity);
  col += mix(platinum, glacier, 0.5) * grid * (0.6 + 0.5 * uIntensity);
  col += glacier * beam;
  col += platinum * pl;
  col += platinum * ripple(p) * 0.45;

  // 5. Vector trame: short strokes like iron filings, turning toward the
  // pointer and shivering when a shockwave passes.
  if (uTrame > 0.0) {
    vec2 cell = floor(frag / uTrameCell);
    vec2 c = (cell + 0.5) * uTrameCell;
    vec2 toPtr = uPointer * uRes - c;
    float near = exp(-length(toPtr) / (0.22 * uRes.y));
    float ang = mix(fbm3(c / uRes.y * 2.0 + t) * 6.2832, atan(toPtr.y, toPtr.x), near);
    vec2 dir = vec2(cos(ang), sin(ang));
    float L = uTrameCell * (0.16 + 0.20 * near);
    float seg = 1.0 - smoothstep(0.5, 1.4, sdSeg(frag - c, -dir * L, dir * L));
    float amt = 0.022 + 0.10 * near + 0.30 * ripple(toP(c));
    col += platinum * seg * amt * uTrame;
  }

  // 6. Financial glyph matrix: nearly invisible at rest, revealed around the
  // pointer and on shockwaves, flooding the screen during a promotion.
  if (uGlyphAmount + uGlyphFlash > 0.0) {
    vec2 cell = floor(frag / uCell);
    vec2 cuv = fract(frag / uCell);
    vec2 gp = toP((cell + 0.5) * uCell);
    float level = smoothstep(0.25, 0.75, fbm3(gp * 2.2 + vec2(t * 1.5, -t)));
    level = fract(level + step(0.985, hash(cell + floor(uTime * 6.0))) * 0.37);
    float idx = floor(clamp(level, 0.0, 0.999) * uGlyphCount);
    vec2 auv = vec2((idx + clamp(cuv.x, 0.06, 0.94)) / uGlyphCount, clamp(cuv.y, 0.06, 0.94));
    float glyph = textureLod(uGlyphs, auv, 0.0).r;
    float nearG = exp(-length(gp - ptr) * 5.0);
    float mask = uGlyphAmount * (0.035 + 0.28 * nearG + 0.9 * ripple(gp))
               + uGlyphFlash * (0.25 + 0.45 * level);
    col += mix(platinum, glacier, 0.35) * glyph * mask * 0.5;
  }

  float vig = 1.0 - smoothstep(0.25, 1.25, length(p * vec2(0.9, 1.1)));
  col = mix(obsidian * 0.6, col, vig);
  col += (hash(frag + fract(uTime) * 100.0) - 0.5) * 0.012;

  fragColor = vec4(col, 1.0);
}
