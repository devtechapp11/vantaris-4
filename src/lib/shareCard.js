// Story-sized share image (1080×1920) for Instagram / LinkedIn, drawn on a
// canvas and shared with the Web Share API (or downloaded where that's missing).
import { cssVar } from '../design/tokens';
import { BRAND } from './config';

const W = 1080;
const H = 1920;

// Inline Vale (or any SVG on the page) as an image: CSS variables don't resolve
// inside an <img>, so swap each var(--x) for its computed value first.
async function svgImage(svg) {
  if (!svg) return null;
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '600');
  clone.setAttribute('height', '600');
  const markup = new XMLSerializer().serializeToString(clone).replace(/var\((--[\w-]+)\)/g, (_, name) => cssVar(name, '#000'));
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function wrap(g, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draw the card. `kind` is 'deal' (a correct answer) or 'promotion' (new tier).
 * Returns a PNG Blob.
 */
export async function drawShareCard({ kind = 'deal', title, subtitle, points, level, streak, name, valeSvg }) {
  await document.fonts?.ready;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const ui = cssVar('--font-ui', 'sans-serif');
  const mono = cssVar('--font-figure', 'monospace');
  const gold = [cssVar('--gold-300'), cssVar('--gold-500'), cssVar('--gold-600')];
  const cyan = cssVar('--cyan-500');
  const fg = cssVar('--fg');
  const fg2 = cssVar('--fg-2');

  // Background: navy → plum → black, gold glow, constellation
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, cssVar('--navy-900'));
  bg.addColorStop(0.55, cssVar('--plum-900'));
  bg.addColorStop(1, cssVar('--navy-1000'));
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 760, 40, W / 2, 760, 760);
  glow.addColorStop(0, 'rgba(212,175,55,0.30)');
  glow.addColorStop(1, 'rgba(212,175,55,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const dots = Array.from({ length: 70 }, () => [rnd() * W, rnd() * H, 1 + rnd() * 3]);
  g.lineWidth = 1.5;
  dots.forEach(([x, y], i) => dots.slice(i + 1).forEach(([x2, y2]) => {
    const d = Math.hypot(x - x2, y - y2);
    if (d < 190) {
      g.strokeStyle = `rgba(212,175,55,${(1 - d / 190) * 0.25})`;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x2, y2);
      g.stroke();
    }
  }));
  dots.forEach(([x, y, r], i) => {
    g.fillStyle = i % 4 ? 'rgba(241,210,122,0.8)' : cyan;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  });

  // Brand
  const goldGrad = (x0, x1) => {
    const lg = g.createLinearGradient(x0, 0, x1, 0);
    lg.addColorStop(0, gold[0]);
    lg.addColorStop(0.55, gold[1]);
    lg.addColorStop(1, gold[2]);
    return lg;
  };
  g.save();
  g.translate(W / 2 - 200, 150);
  g.scale(2, 2);
  g.fillStyle = goldGrad(0, 48);
  g.beginPath(); g.moveTo(5, 8); g.lineTo(16, 8); g.lineTo(24, 28); g.lineTo(24, 41); g.lineTo(20.5, 41); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(43, 8); g.lineTo(32, 8); g.lineTo(24, 28); g.lineTo(24, 41); g.lineTo(27.5, 41); g.closePath(); g.fill();
  g.fillStyle = cyan;
  g.beginPath(); g.moveTo(24, 9.5); g.lineTo(27.5, 13); g.lineTo(24, 16.5); g.lineTo(20.5, 13); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = fg;
  g.font = `800 52px ${ui}`;
  if ('letterSpacing' in g) g.letterSpacing = '14px';
  g.textBaseline = 'middle';
  g.fillText(BRAND.name.toUpperCase(), W / 2 - 90, 196);
  if ('letterSpacing' in g) g.letterSpacing = '0px';

  // Vale
  const vale = await svgImage(valeSvg);
  if (vale) g.drawImage(vale, W / 2 - 270, 270, 540, 540);

  // Headline
  g.textAlign = 'center';
  g.fillStyle = gold[0];
  g.font = `800 34px ${ui}`;
  if ('letterSpacing' in g) g.letterSpacing = '8px';
  g.fillText(kind === 'promotion' ? 'PROMOTED' : 'DEAL CLOSED', W / 2, 880);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillStyle = fg;
  g.font = `900 96px ${ui}`;
  const lines = wrap(g, title, W - 160).slice(0, 2);
  lines.forEach((l, i) => g.fillText(l, W / 2, 985 + i * 104));
  let y = 985 + (lines.length - 1) * 104 + 80;
  if (subtitle) {
    g.fillStyle = fg2;
    g.font = `500 40px ${ui}`;
    g.fillText(subtitle, W / 2, y);
    y += 30;
  }

  // Points
  if (points != null) {
    g.font = `700 200px ${mono}`;
    g.fillStyle = goldGrad(W / 2 - 300, W / 2 + 300);
    g.shadowColor = 'rgba(212,175,55,0.55)';
    g.shadowBlur = 50;
    g.fillText(`+${points}`, W / 2, y + 150);
    g.shadowBlur = 0;
    g.fillStyle = fg2;
    g.font = `600 40px ${ui}`;
    g.fillText('points', W / 2, y + 265);
    y += 290;
  }

  // Tier + streak pills
  const pills = [level && `${level}`, streak >= 1 && `🔥 ${streak}-day streak`].filter(Boolean);
  g.font = `700 38px ${ui}`;
  const widths = pills.map((p) => g.measureText(p).width + 80);
  const totalW = widths.reduce((s, w) => s + w, 0) + (pills.length - 1) * 24;
  let x = W / 2 - totalW / 2;
  pills.forEach((p, i) => {
    roundRect(g, x, y + 20, widths[i], 84, 42);
    g.fillStyle = 'rgba(212,175,55,0.14)';
    g.fill();
    g.strokeStyle = 'rgba(212,175,55,0.5)';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = gold[0];
    g.fillText(p, x + widths[i] / 2, y + 64);
    x += widths[i] + 24;
  });

  // Footer
  g.fillStyle = fg2;
  g.font = `600 36px ${ui}`;
  // The name sits above the footer only when the pills leave room for it.
  if (name && y + 110 < H - 290) g.fillText(name, W / 2, H - 250);
  g.fillStyle = fg;
  g.font = `800 44px ${ui}`;
  g.fillText(BRAND.tagline, W / 2, H - 170);
  g.fillStyle = gold[1];
  g.font = `600 36px ${mono}`;
  g.fillText(BRAND.site.replace(/^https?:\/\//, ''), W / 2, H - 105);

  return new Promise((resolve, reject) => {
    try {
      c.toBlob(resolve, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

/** Share through the native sheet when files are supported, otherwise download the PNG. */
export async function shareCard(opts) {
  // Some browsers (older Safari) taint the canvas once an SVG is drawn; retry without Vale.
  const blob = await drawShareCard(opts).catch(() => drawShareCard({ ...opts, valeSvg: null }));
  if (!blob) throw new Error('Could not draw the card');
  const file = new File([blob], `vantaris-${opts.kind ?? 'deal'}.png`, { type: 'image/png' });
  const text = opts.kind === 'promotion'
    ? `Just made ${opts.level} on ${BRAND.name}. ${BRAND.tagline}`
    : `Closed ${opts.title} on ${BRAND.name}: +${opts.points} points. ${BRAND.tagline}`;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: BRAND.name, text });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
