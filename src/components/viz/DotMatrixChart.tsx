import { useId } from 'react';
import './viz.css';

type Props = {
  values: number[];
  /** One label per column (e.g. weekday initials or dates). */
  labels?: string[];
  /** Show one label out of `labelEvery` (always the last). */
  labelEvery?: number;
  rows?: number;
  /** A previous period drawn as hollow rings behind the bars (the ghost run). */
  ghost?: number[];
  ariaLabel: string;
  className?: string;
};

/**
 * A bar chart drawn as a dot matrix: each column is a day, lit dots up to the
 * value. The last column (today) is brighter. Nothing is drawn as data when
 * every value is zero: the dots simply stay dark.
 */
export default function DotMatrixChart({ values, labels, labelEvery = 1, rows = 8, ghost, ariaLabel, className = '' }: Props) {
  const id = useId().replace(/:/g, '');
  const cols = values.length;
  const max = Math.max(1, ...values, ...(ghost ?? []));
  const step = 10;
  const r = 3;
  const w = cols * step;
  const h = rows * step;
  const lh = labels ? 12 : 0;
  const lit = (v: number) => (v <= 0 ? 0 : Math.max(1, Math.round((v / max) * rows)));
  return (
    <figure className={`dmc ${className}`}>
      <svg viewBox={`0 0 ${w} ${h + lh}`} style={{ maxWidth: cols * 24 }} role="img" aria-labelledby={`${id}-t`}>
        <title id={`${id}-t`}>{ariaLabel}</title>
        {values.map((v, c) => {
          const n = lit(v);
          const g = ghost ? lit(ghost[c] ?? 0) : 0;
          const today = c === cols - 1;
          return Array.from({ length: rows }, (_, k) => {
            const on = k < n;
            const ring = !on && g > 0 && k === g - 1;
            return (
              <circle
                key={`${c}-${k}`}
                cx={c * step + step / 2}
                cy={h - k * step - step / 2}
                r={ring ? r - 0.6 : r}
                className={on ? (today ? 'dmc__dot is-today' : 'dmc__dot is-on') : ring ? 'dmc__dot is-ghost' : 'dmc__dot'}
              />
            );
          });
        })}
        {labels?.map((l, i) => (i % labelEvery === 0 || i === cols - 1 ? (
          <text key={`l${i}`} x={i * step + step / 2} y={h + 9} textAnchor="middle" className="dmc__label" aria-hidden="true">{l}</text>
        ) : null))}
      </svg>
    </figure>
  );
}
