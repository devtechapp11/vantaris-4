import { BufferGeometry, CanvasTexture, Color, DoubleSide, Float32BufferAttribute, MeshPhysicalMaterial, RepeatWrapping, Vector2, Vector3 } from 'three';
import { pebble } from '../valeShape';
import { applyMidas } from '../midas';

let weave: CanvasTexture | null = null;

/** A twill weave normal map (512², drawn once): it is what makes cloth read as cloth next to the mirror skin. */
export function weaveNormal() {
  if (weave) return weave;
  const N = 512;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d')!;
  const img = g.createImageData(N, N);
  const h = (x: number, y: number) => {
    const d = ((x + y) % 16) / 16; // diagonal twill
    const warp = Math.sin((x / N) * Math.PI * 128) * 0.5 + 0.5;
    const weft = Math.sin((y / N) * Math.PI * 128) * 0.5 + 0.5;
    return (d < 0.5 ? warp : weft) * 0.8 + 0.2 * Math.sin(d * Math.PI);
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = h((x + 1) % N, y) - h((x + N - 1) % N, y);
      const dy = h(x, (y + 1) % N) - h(x, (y + N - 1) % N);
      const n = new Vector3(-dx * 2, -dy * 2, 1).normalize();
      const i = (y * N + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  weave = new CanvasTexture(c);
  weave.wrapS = weave.wrapT = RepeatWrapping;
  weave.repeat.set(5, 5);
  return weave;
}

/** Matte cloth (sheen, high roughness), Midas-ready so a promotion turns it to gold too. */
export function fabric(color: string, o: { sheen?: number; roughness?: number } = {}) {
  const m = new MeshPhysicalMaterial({
    color: new Color(color),
    roughness: o.roughness ?? 0.85,
    metalness: 0,
    sheen: o.sheen ?? 0.6,
    sheenRoughness: 0.45,
    sheenColor: new Color('#C9CED6'),
    normalMap: weaveNormal(),
    normalScale: new Vector2(0.35, 0.35),
    side: DoubleSide,
    envMapIntensity: 0.6,
  });
  return applyMidas(m);
}

/** Polished trim (zip, buttons, watch, cufflinks): small chrome pieces. */
export function trim(color = '#C9CED6', roughness = 0.18) {
  return applyMidas(new MeshPhysicalMaterial({ color: new Color(color), metalness: 1, roughness, envMapIntensity: 1.2 }));
}

/** A point on Vale's surface: pre-pebble height y (-1..1) and angle from the front (radians, + to Vale's left on screen right). */
export function surface(y: number, angle: number, lift = 1.03) {
  const s = Math.sqrt(Math.max(0, 1 - y * y));
  const v = new Vector3(Math.sin(angle) * s, y, Math.cos(angle) * s);
  const p = new Vector3(...pebble(v)).multiplyScalar(lift);
  // Numerical normal from two tangents.
  const e = 0.01;
  const at = (yy: number, aa: number) => {
    const ss = Math.sqrt(Math.max(0, 1 - yy * yy));
    return new Vector3(...pebble(new Vector3(Math.sin(aa) * ss, yy, Math.cos(aa) * ss)));
  };
  const ty = at(Math.min(0.999, y + e), angle).sub(at(Math.max(-0.999, y - e), angle));
  const ta = at(y, angle + e).sub(at(y, angle - e));
  const n = new Vector3().crossVectors(ta, ty).normalize();
  if (n.dot(p) < 0) n.negate();
  return { p, n };
}

/**
 * A garment shell on Vale's real silhouette: rows from pre-pebble height
 * `top` down to `bottom`, with a front opening whose half-angle can vary
 * down the garment (a V-neck, a half-open zip).
 */
export function garment(o: { top: number; bottom: number; lift?: number; open?: (t: number) => number; rows?: number; cols?: number }) {
  const rows = o.rows ?? 48;
  const cols = o.cols ?? 96;
  const lift = o.lift ?? 1.03;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const y = o.top + (o.bottom - o.top) * t;
    const half = Math.max(0, o.open?.(t) ?? 0);
    const s = Math.sqrt(Math.max(0, 1 - y * y));
    for (let c = 0; c <= cols; c++) {
      // angle from the front, skipping the opening
      const a = half + (Math.PI * 2 - 2 * half) * (c / cols);
      const v = new Vector3(Math.sin(a) * s, y, Math.cos(a) * s);
      const [x, py, z] = pebble(v);
      pos.push(x * lift, py * lift, z * lift);
      uv.push((c / cols) * 4, t * 2);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + cols + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
