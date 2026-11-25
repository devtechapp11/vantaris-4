/** A square PNG of the promotion: the engraved desk plate, the player's name, « Vantaris ». */
export async function plaqueImage(desk: string, name: string): Promise<Blob | null> {
  const S = 1080;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  if (!g) return null;
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts unavailable: system fallback */
  }
  const bg = g.createRadialGradient(S / 2, S * 0.42, 40, S / 2, S / 2, S * 0.75);
  bg.addColorStop(0, '#1C222B');
  bg.addColorStop(1, '#05070B');
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);

  // Fine corner marks, as on the app's HUD
  g.strokeStyle = '#2A3039';
  g.lineWidth = 2;
  [[60, 60], [S - 60, 60], [60, S - 60], [S - 60, S - 60]].forEach(([x, y]) => {
    g.beginPath();
    g.moveTo(x - 14, y);
    g.lineTo(x + 14, y);
    g.moveTo(x, y - 14);
    g.lineTo(x, y + 14);
    g.stroke();
  });

  // The plate: brushed platinum with a chrome edge
  const w = 760;
  const h = 200;
  const x = (S - w) / 2;
  const y = S * 0.36;
  const plate = g.createLinearGradient(x, y, x + w, y + h);
  ['#C9CED6', '#E6E9EE', '#9AA3AE', '#E6E9EE', '#8A929D'].forEach((col, i, a) => plate.addColorStop(i / (a.length - 1), col));
  g.shadowColor = '#000000';
  g.shadowBlur = 60;
  g.shadowOffsetY = 30;
  g.beginPath();
  g.roundRect(x, y, w, h, 26);
  g.fillStyle = plate;
  g.fill();
  g.shadowBlur = 0;
  g.shadowOffsetY = 0;
  for (let k = 0; k < 120; k++) {
    g.globalAlpha = 0.05 + Math.random() * 0.06;
    g.fillStyle = k % 2 ? '#F8FAFC' : '#5B6470';
    g.fillRect(x + 10, y + 8 + Math.random() * (h - 16), w - 20, 1);
  }
  g.globalAlpha = 1;
  g.lineWidth = 3;
  g.strokeStyle = '#F8FAFC';
  g.stroke();

  // Engraved lettering: a light lip under a dark cut
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const label = `${desk.toUpperCase()} DESK`;
  if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '8px';
  // The largest size that fits the plate with a margin
  let size = 78;
  do {
    g.font = `800 ${size}px "Archivo Variable", system-ui, sans-serif`;
    size -= 2;
  } while (g.measureText(label).width > w - 120 && size > 30);
  g.fillStyle = '#F8FAFC';
  g.fillText(label, S / 2, y + h / 2 + 2);
  g.fillStyle = '#2A3039';
  g.fillText(label, S / 2, y + h / 2);

  g.font = '500 44px "Archivo Variable", system-ui, sans-serif';
  if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  g.fillStyle = '#E6E9EE';
  g.fillText(name, S / 2, y + h + 110);
  g.font = '400 28px "Martian Mono Variable", ui-monospace, monospace';
  g.fillStyle = '#9AA3AE';
  if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '8px';
  g.fillText('VANTARIS', S / 2, S - 120);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}
