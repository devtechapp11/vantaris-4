// Financial glyphs for the background matrix, drawn once on a 2D canvas and
// sorted by ink density: index 0 is the emptiest, the last the fullest, so the
// shader picks a glyph straight from a brightness value.
const GLYPHS = [' ', '.', '·', ':', '-', '+', '×', '=', '÷', '%', '$', '€', '£', '¥', 'Σ', 'Δ',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export async function buildGlyphAtlas(cell = 64): Promise<{ canvas: HTMLCanvasElement; count: number }> {
  const font = `500 ${Math.round(cell * 0.7)}px "Martian Mono Variable", "Martian Mono", ui-monospace, monospace`;
  try {
    await document.fonts.load(font);
  } catch {
    /* system monospace stands in */
  }

  const draw = (ctx: CanvasRenderingContext2D, g: string, x: number) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(g, x + cell / 2, cell / 2 + cell * 0.04);
  };

  const probe = document.createElement('canvas');
  probe.width = cell;
  probe.height = cell;
  const pc = probe.getContext('2d', { willReadFrequently: true });
  if (!pc) throw new Error('2D canvas unavailable');
  const ranked = GLYPHS.map((g) => {
    pc.fillStyle = '#000000';
    pc.fillRect(0, 0, cell, cell);
    draw(pc, g, 0);
    const d = pc.getImageData(0, 0, cell, cell).data;
    let ink = 0;
    for (let i = 0; i < d.length; i += 4) ink += d[i];
    return { g, ink };
  }).sort((a, b) => a.ink - b.ink);

  const canvas = document.createElement('canvas');
  canvas.width = cell * ranked.length;
  canvas.height = cell;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ranked.forEach(({ g }, i) => draw(ctx, g, i * cell));
  return { canvas, count: ranked.length };
}
