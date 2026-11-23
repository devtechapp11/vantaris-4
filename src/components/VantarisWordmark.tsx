import { useId } from 'react';

/*
  The Vantaris wordmark, cut from straight planes: every letter is a polygon on
  a 20-unit cap height with 3-unit strokes and chamfered corners, filled with
  liquid chrome and lit along its top edge.
*/
type Glyph = { w: number; d: string };

const G: Record<string, Glyph> = {
  V: { w: 14, d: 'M0 0H3.4L7 15.5L10.6 0H14L8.6 20H5.4Z' },
  A: { w: 14, d: 'M5.4 0H8.6L14 20H10.6L9.5 15.6H4.5L3.4 20H0ZM7 5.4L5.3 12.6H8.7Z' },
  N: { w: 14, d: 'M0 0H3L11 13.5V0H14V20H11L3 6.5V20H0Z' },
  T: { w: 14, d: 'M0 0H14V3H8.5V20H5.5V3H0Z' },
  R: { w: 14, d: 'M0 0H10.5L14 3.5V8.5L11.2 11.3L14 20H10.6L8 12H3V20H0ZM3 3V9H9.6L11 7.6V4.4L9.6 3Z' },
  I: { w: 3, d: 'M0 0H3V20H0Z' },
  S: { w: 14, d: 'M3 0H14V3H4L3 4V7L4 8.5H11L14 11.5V17L11 20H0V17H10L11 16V12.5L10 11.5H3L0 8.5V3Z' },
};
const TRACK = 3.4;

/** The V mark: two faceted arms meeting at a point. */
function Mark({ x, idL, idR }: { x: number; idL: string; idR: string }) {
  return (
    <g transform={`translate(${x} -2) scale(0.5)`}>
      <polygon points="5,8 16,8 24,28 24,41 20.5,41" fill={`url(#${idL})`} />
      <polygon points="43,8 32,8 24,28 24,41 27.5,41" fill={`url(#${idR})`} />
    </g>
  );
}

export default function VantarisWordmark({ height = 14, mark = false, title = 'Vantaris', className = '' }: { height?: number; mark?: boolean; title?: string; className?: string }) {
  const id = useId().replace(/:/g, '');
  const word = 'VANTARIS';
  const markW = mark ? 26 : 0;
  let x = markW;
  const glyphs = [...word].map((ch) => {
    const g = G[ch];
    const at = x;
    x += g.w + TRACK;
    return { ch, at, d: g.d };
  });
  const width = x - TRACK;
  return (
    <svg
      className={`vwordmark ${className}`}
      viewBox={`0 -1 ${width} 22`}
      height={height * 1.1}
      width={(height * 1.1 * width) / 22}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="0" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--white)" />
          <stop offset="0.3" stopColor="var(--chrome-hi)" />
          <stop offset="0.52" stopColor="var(--steel-300)" />
          <stop offset="0.7" stopColor="var(--chrome-hi)" />
          <stop offset="1" stopColor="var(--platinum)" />
        </linearGradient>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="var(--chrome-hi)" />
          <stop offset="0.55" stopColor="var(--steel-300)" />
          <stop offset="1" stopColor="var(--platinum)" />
        </linearGradient>
        <linearGradient id={`${id}-r`} x1="1" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="var(--steel-300)" />
          <stop offset="0.6" stopColor="var(--steel-500)" />
          <stop offset="1" stopColor="var(--steel-700)" />
        </linearGradient>
      </defs>
      {mark && <Mark x={0} idL={`${id}-l`} idR={`${id}-r`} />}
      <g fill={`url(#${id}-c)`} fillRule="evenodd">
        {glyphs.map((g, i) => <path key={i} d={g.d} transform={`translate(${g.at} 0)`} />)}
      </g>
      <g fill="none" stroke="var(--white)" strokeOpacity="0.55" strokeWidth="0.35">
        {glyphs.map((g, i) => <path key={i} d={`M${g.at} 0.2H${g.at + G[g.ch].w}`} />)}
      </g>
    </svg>
  );
}
