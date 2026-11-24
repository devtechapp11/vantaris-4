import './viz.css';

// 5×7 dot font: each glyph is 7 rows of 5 bits.
const FONT: Record<string, number[]> = {
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  '#': [10, 10, 31, 10, 31, 10, 10],
  '—': [0, 0, 0, 31, 0, 0, 0],
  ' ': [0, 0, 0, 0, 0, 0, 0],
};

type Props = { value: number | string; label: string; dot?: number; className?: string };

/** A figure set in a 5×7 dot-matrix font (streak, rank). */
export default function DotMatrixNumber({ value, label, dot = 5, className = '' }: Props) {
  const chars = String(value).split('').map((c) => (FONT[c] ? c : ' '));
  const gap = dot * 0.5;
  const cell = dot + gap;
  const glyphW = 5 * cell;
  const w = chars.length * (glyphW + cell) - cell;
  const h = 7 * cell - gap;
  return (
    <svg className={`dmn ${className}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      {chars.map((c, i) =>
        FONT[c].flatMap((row, y) =>
          Array.from({ length: 5 }, (_, x) => {
            const on = (row >> (4 - x)) & 1;
            return (
              <rect
                key={`${i}-${y}-${x}`}
                x={i * (glyphW + cell) + x * cell}
                y={y * cell}
                width={dot}
                height={dot}
                rx={dot / 2}
                className={on ? 'dmn__on' : 'dmn__off'}
              />
            );
          }),
        ),
      )}
    </svg>
  );
}
