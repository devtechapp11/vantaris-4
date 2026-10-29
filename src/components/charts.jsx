import { motion, useReducedMotion } from 'motion/react';

/** Points per day for the last seven days. Today's bar is brass. */
export function WeekBars({ week = [] }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...week.map((d) => d.points));
  const W = 320;
  const H = 132;
  const top = 22;
  const base = H - 24;
  const slot = W / 7;
  const bw = 26;
  const total = week.reduce((s, d) => s + d.points, 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Points over the last seven days: ${total} in total`}>
      <line x1="0" x2={W} y1={base + 0.5} y2={base + 0.5} style={{ stroke: 'var(--line-strong)' }} strokeWidth="1" />
      {week.map((d, i) => {
        const isToday = i === week.length - 1;
        const h = d.points ? Math.max(6, ((base - top) * d.points) / max) : 3;
        const x = i * slot + (slot - bw) / 2;
        const day = new Date(`${d.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'narrow' });
        return (
          <g key={d.date}>
            <motion.rect
              x={x}
              width={bw}
              rx="6"
              style={{ fill: d.points ? (isToday ? 'var(--brass)' : 'var(--accent)') : 'var(--surface-3)' }}
              initial={reduce ? false : { y: base, height: 0 }}
              animate={{ y: base - h, height: h }}
              transition={{ duration: 0.7, delay: reduce ? 0 : 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
            />
            {d.points > 0 && (
              <text x={x + bw / 2} y={base - h - 6} textAnchor="middle" className="fig"
                style={{ fill: isToday ? 'var(--brass-ink)' : 'var(--fg-2)', fontSize: 11, fontWeight: 600 }}>
                {d.points}
              </text>
            )}
            <text x={x + bw / 2} y={H - 6} textAnchor="middle"
              style={{ fill: isToday ? 'var(--fg)' : 'var(--fg-3)', fontSize: 12, fontWeight: isToday ? 700 : 500 }}>
              {day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Share of each module solved, as a radar. */
export function Radar({ skills = [] }) {
  const reduce = useReducedMotion();
  const W = 420;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2 - 4;
  const R = 96;
  const n = skills.length || 1;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const ring = (f) => skills.map((_, i) => pt(i, R * f).join(',')).join(' ');
  const shape = skills.map((s, i) => pt(i, R * Math.max(0.04, s.total ? s.solved / s.total : 0)).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={`Modules solved: ${skills.map((s) => `${s.short} ${s.solved} of ${s.total}`).join(', ')}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} style={{ fill: f === 1 ? 'var(--surface-2)' : 'none', stroke: 'var(--line-strong)' }} strokeWidth="1" />
      ))}
      {skills.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} style={{ stroke: 'var(--line)' }} strokeWidth="1" />;
      })}
      <motion.polygon
        points={shape}
        style={{ fill: 'var(--accent)', fillOpacity: 0.18, stroke: 'var(--accent)', transformOrigin: `${cx}px ${cy}px` }}
        strokeWidth="2"
        strokeLinejoin="round"
        initial={reduce ? false : { scale: 0.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
      {skills.map((s, i) => {
        const [x, y] = pt(i, R + 22);
        const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
        return (
          <g key={s.module_id}>
            <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle" style={{ fill: 'var(--fg-2)', fontSize: 12, fontWeight: 600 }}>
              {s.short}
            </text>
            <text x={x} y={y + 14} textAnchor={anchor} dominantBaseline="middle" className="fig" style={{ fill: 'var(--fg-3)', fontSize: 10.5 }}>
              {s.solved}/{s.total}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Progress ring (Activity-style) for level progress. */
export function Ring({ value, size = 64, stroke = 8, tone = 'accent', children }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: 'var(--surface-2)' }} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          style={{ stroke: tone === 'brass' ? 'var(--brass)' : 'var(--accent)' }}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  );
}
