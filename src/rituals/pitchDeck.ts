import { careerName } from '../lib/career';
import { deskOf } from '../vale/outfits/outfitRegistry';

export type DeckFacts = { level: string; streak: number; accuracy: number | null; points: number; name?: string | null };

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });

/**
 * The « Pitch deck » card: a 1080 × 1350 pitchbook cover, drawn on the device.
 * Real values only (desk, streak, accuracy, XP); the first name only if the
 * player ticks it. Colours come from the tokens.
 */
export async function pitchDeckImage(f: DeckFacts): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  const sans = css('--font-sans') || 'system-ui, sans-serif';
  const mono = css('--font-mono') || 'ui-monospace, monospace';
  await Promise.all([document.fonts?.load(`800 64px ${sans}`), document.fonts?.load(`500 28px ${mono}`)].map((p) => p?.catch(() => null)));

  const void0 = css('--void') || css('--obsidian');
  const fg = css('--fg');
  const fg2 = css('--fg-2');
  const line = css('--steel-700');
  const chrome = css('--chrome-200');

  g.fillStyle = void0;
  g.fillRect(0, 0, W, H);
  // A pitchbook cover: a rule, the code name, the classification.
  g.strokeStyle = line;
  g.lineWidth = 2;
  g.strokeRect(48, 48, W - 96, H - 96);
  g.fillStyle = fg2;
  g.font = `500 26px ${mono}`;
  g.fillText('VANTARIS', 96, 128);
  g.textAlign = 'right';
  g.fillText('STRICTLY CONFIDENTIAL', W - 96, 128);
  g.textAlign = 'left';
  g.fillStyle = fg;
  g.font = `800 96px ${sans}`;
  g.fillText('PROJECT VALE', 96, 260);
  g.fillStyle = fg2;
  g.font = `500 30px ${mono}`;
  g.fillText('— CONFIDENTIAL —', 96, 316);

  const desk = deskOf(f.level);
  const vale = await load(`/vale/poster-${desk}.webp`);
  if (vale) g.drawImage(vale, (W - 560) / 2, 380, 560, 560);

  g.fillStyle = chrome;
  g.font = `800 64px ${sans}`;
  g.textAlign = 'center';
  g.fillText(`${String(careerName(f.level)).toUpperCase()} DESK`, W / 2, 1010);
  g.textAlign = 'left';

  const facts: [string, string][] = [
    ['STREAK', `${f.streak} ${f.streak === 1 ? 'DAY' : 'DAYS'}`],
    ['ACCURACY', f.accuracy == null ? '—' : `${Math.round(f.accuracy * 100)}%`],
    ['XP', f.points.toLocaleString('en-US')],
  ];
  const colW = (W - 192) / 3;
  facts.forEach(([k, v], i) => {
    const x = 96 + i * colW;
    g.fillStyle = fg2;
    g.font = `500 24px ${mono}`;
    g.fillText(k, x, 1110);
    g.fillStyle = fg;
    g.font = `600 44px ${mono}`;
    g.fillText(v, x, 1166);
  });
  g.strokeStyle = line;
  g.beginPath();
  g.moveTo(96, 1210);
  g.lineTo(W - 96, 1210);
  g.stroke();
  g.fillStyle = fg2;
  g.font = `500 24px ${mono}`;
  g.fillText(f.name ? `PREPARED BY ${f.name.toUpperCase().slice(0, 28)}` : 'PREPARED ON VANTARIS', 96, 1256);
  g.textAlign = 'right';
  g.fillText(new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase(), W - 96, 1256);

  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}
