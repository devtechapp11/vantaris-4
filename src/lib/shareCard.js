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
  const display = cssVar('--font-display', 'serif');
  const black = cssVar('--black', '#090A0B');
  const platinum = cssVar('--platinum', '#E7E8E5');
  const silver = cssVar('--silver', '#B9BEC0');
  const aluminium = cssVar('--aluminium', '#858D92');
  const aluDark = cssVar('--aluminium-dark', '#343A3E');
  const gain = cssVar('--gain', '#35A77A');

  // Flat black with a faint ruled grid, like a term sheet
  g.fillStyle = black;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = aluDark;
  g.globalAlpha = 0.35;
  g.lineWidth = 1;
  for (let y = 120; y < H; y += 120) { g.beginPath(); g.moveTo(80, y + 0.5); g.lineTo(W - 80, y + 0.5); g.stroke(); }
  g.globalAlpha = 1;

  // Chrome wordmark
  const chrome = (x0, x1, y0 = 0, y1 = 0) => {
    const lg = g.createLinearGradient(x0, y0, x1, y1);
    lg.addColorStop(0, platinum);
    lg.addColorStop(0.45, silver);
    lg.addColorStop(0.55, aluminium);
    lg.addColorStop(1, platinum);
    return lg;
  };
  g.save();
  g.translate(W / 2 - 200, 150);
  g.scale(2, 2);
  g.fillStyle = chrome(0, 0, 0, 48);
  g.beginPath(); g.moveTo(5, 8); g.lineTo(16, 8); g.lineTo(24, 28); g.lineTo(24, 41); g.lineTo(20.5, 41); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(43, 8); g.lineTo(32, 8); g.lineTo(24, 28); g.lineTo(24, 41); g.lineTo(27.5, 41); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = chrome(0, 0, 170, 222);
  g.font = `600 52px ${ui}`;
  if ('letterSpacing' in g) g.letterSpacing = '14px';
  g.textBaseline = 'middle';
  g.fillText(BRAND.name.toUpperCase(), W / 2 - 90, 196);
  if ('letterSpacing' in g) g.letterSpacing = '0px';

  // Mascot
  const vale = await svgImage(valeSvg);
  if (vale) g.drawImage(vale, W / 2 - 250, 290, 500, 500);

  // Headline
  g.textAlign = 'center';
  g.fillStyle = aluminium;
  g.font = `600 30px ${ui}`;
  if ('letterSpacing' in g) g.letterSpacing = '8px';
  g.fillText(kind === 'promotion' ? 'PROMOTED' : 'DEAL CLOSED', W / 2, 880);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillStyle = platinum;
  g.font = `400 108px ${display}`;
  const lines = wrap(g, title, W - 160).slice(0, 2);
  lines.forEach((l, i) => g.fillText(l, W / 2, 990 + i * 112));
  let y = 990 + (lines.length - 1) * 112 + 80;
  if (subtitle) {
    g.fillStyle = silver;
    g.font = `400 40px ${ui}`;
    g.fillText(subtitle, W / 2, y);
    y += 30;
  }

  // Points: the one figure in colour (a gain)
  if (points != null) {
    g.font = `500 190px ${ui}`;
    g.fillStyle = gain;
    g.fillText(`+${points}`, W / 2, y + 150);
    g.fillStyle = aluminium;
    g.font = `500 38px ${ui}`;
    g.fillText('points', W / 2, y + 262);
    y += 290;
  }

  // Tier + streak, outlined
  const pills = [level && `${level}`, streak >= 1 && `${streak}-day streak`].filter(Boolean);
  g.font = `500 36px ${ui}`;
  const widths = pills.map((p) => g.measureText(p).width + 72);
  const totalW = widths.reduce((s, w) => s + w, 0) + (pills.length - 1) * 24;
  let x = W / 2 - totalW / 2;
  pills.forEach((p, i) => {
    roundRect(g, x + 1, y + 21, widths[i] - 2, 82, 6);
    g.strokeStyle = aluDark;
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = silver;
    g.fillText(p, x + widths[i] / 2, y + 64);
    x += widths[i] + 24;
  });

  // Footer
  g.fillStyle = silver;
  g.font = `500 36px ${ui}`;
  if (name && y + 110 < H - 290) g.fillText(name, W / 2, H - 250);
  g.fillStyle = platinum;
  g.font = `400 56px ${display}`;
  g.fillText(BRAND.tagline, W / 2, H - 170);
  g.fillStyle = aluminium;
  g.font = `500 34px ${ui}`;
  g.fillText(BRAND.site.replace(/^https?:\/\//, ''), W / 2, H - 100);

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
