import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { duration, ease } from '../design/tokens';

/** Width of an element in CSS pixels, so charts draw at 1:1 and their text stays legible. */
function useWidth(fallback) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, w];
}

const niceMax = (v) => {
  if (v <= 10) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p / 0.5) * p * 0.5;
};

// Monotone cubic interpolation: smooth, but never overshoots the data.
function monotonePath(pts) {
  if (pts.length < 2) return '';
  const n = pts.length;
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    dy[i] = pts[i + 1][1] - pts[i][1];
    m[i] = dy[i] / dx[i];
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const s = 3 / Math.sqrt(h); t[i] = s * a * m[i]; t[i + 1] = s * b * m[i]; }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

const dayLabel = (iso, today) => (today ? 'Today' : new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }));
const longDay = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

/** Points per day, last seven days: gold area chart with a crosshair tooltip. */
export function ActivityChart({ week = [] }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const [active, setActive] = useState(null);
  const [box, width] = useWidth(640);
  const W = Math.max(280, width), H = W < 480 ? 190 : 210, L = 34, R = 18, T = 22, B = 30;
  const plotW = W - L - R, plotH = H - T - B, base = T + plotH;
  const max = niceMax(Math.max(0, ...week.map((d) => d.points)));
  const total = week.reduce((s, d) => s + d.points, 0);
  const pts = useMemo(
    () => week.map((d, i) => [L + (week.length === 1 ? plotW / 2 : (i * plotW) / (week.length - 1)), base - (d.points / max) * plotH]),
    [week, max, plotW, plotH, base],
  );
  const line = monotonePath(pts);
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${base} L${pts[0][0]},${base} Z` : '';
  const last = week.length - 1;
  const show = active ?? null;
  const band = week.length > 1 ? plotW / (week.length - 1) : plotW;

  const onKey = (e) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(last, (a ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? last + 1) - 1));
    else if (e.key === 'Escape') setActive(null);
  };

  return (
    <div className="chart" ref={box} onPointerLeave={() => setActive(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`} width="100%" role="img" tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)}
        aria-label={`Points over the last seven days: ${total} in total. Use the arrow keys to read each day.`}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--gold-500)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--gold-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={base - f * plotH} y2={base - f * plotH} stroke="var(--line)" strokeWidth="1" />
            <text x={L - 8} y={base - f * plotH} textAnchor="end" dominantBaseline="middle" className="chart-tick">{Math.round(max * f)}</text>
          </g>
        ))}
        <motion.path
          d={area} fill={`url(#${id}-fill)`}
          initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: duration.slower, delay: 0.3 }}
        />
        <motion.path
          d={line} fill="none" stroke="var(--gold-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: duration.slower * 1.6, ease: ease.out }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.45))' }}
        />
        {show != null && <line x1={pts[show][0]} x2={pts[show][0]} y1={T} y2={base} stroke="var(--line-strong)" strokeWidth="1" />}
        {pts.map(([x, y], i) => (
          <motion.circle
            key={week[i].date}
            cx={x} cy={y} r={i === last || i === show ? 6 : 4.5}
            fill={i === last ? 'var(--gold-400)' : 'var(--gold-500)'} stroke="var(--surface)" strokeWidth="2"
            initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 400, damping: 18 }}
            style={{ originX: 0.5, originY: 0.5, filter: i === last ? 'drop-shadow(0 0 8px rgba(241,210,122,0.8))' : undefined }}
          />
        ))}
        {/* Selective direct label: today's value at the end of the line */}
        {pts.length > 0 && show == null && (
          // Above the end point, or below it when the line arrives from above (so they never collide).
          <text
            x={pts[last][0] - 10}
            y={last > 0 && pts[last - 1][1] < pts[last][1] ? Math.min(base - 6, pts[last][1] + 22) : pts[last][1] - 14}
            textAnchor="end" className="chart-label"
          >
            {week[last].points} pts
          </text>
        )}
        {week.map((d, i) => (
          <text key={d.date} x={pts[i][0]} y={H - 8} textAnchor="middle" className={`chart-x ${i === last ? 'is-today' : ''}`}>{W < 420 && i !== last ? dayLabel(d.date, false).slice(0, 2) : dayLabel(d.date, i === last)}</text>
        ))}
        {/* Hit targets: wider than the marks */}
        {pts.map(([x], i) => (
          <rect key={`hit-${week[i].date}`} x={x - band / 2} y={T} width={band} height={plotH + 8} fill="transparent" onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)} />
        ))}
      </svg>
      {show != null && (
        <div className="chart-tip" style={{ left: `${(pts[show][0] / W) * 100}%`, top: `${(pts[show][1] / H) * 100}%` }} role="status">
          <span className="fig chart-tip-v">{week[show].points} pts</span>
          <span className="t-cap"><i className="chart-key" aria-hidden="true" />{longDay(week[show].date)}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>Points per day</caption>
        <tbody>{week.map((d) => <tr key={d.date}><th scope="row">{longDay(d.date)}</th><td>{d.points}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** Share of each module solved, as a radar. */
export function Radar({ skills = [] }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const [box, width] = useWidth(420);
  const W = 420, H = 300, cx = W / 2, cy = H / 2 - 4;
  const k = Math.max(1, W / Math.max(260, width)); // keep labels ~12px when the chart shrinks
  const Rr = 96 / k; // and shrink the web so the bigger labels still fit
  const n = skills.length || 1;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const ring = (f) => skills.map((_, i) => pt(i, Rr * f).join(',')).join(' ');
  const shape = skills.map((s, i) => pt(i, Rr * Math.max(0.04, s.total ? s.solved / s.total : 0)).join(',')).join(' ');
  return (
    <div ref={box}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" overflow="visible" role="img" aria-label={`Modules solved: ${skills.map((s) => `${s.short} ${s.solved} of ${s.total}`).join(', ')}`}>
      <defs>
        <radialGradient id={`${id}-r`}>
          <stop offset="0" stopColor="var(--cyan)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--cyan)" stopOpacity="0.08" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill={f === 1 ? 'rgba(255,255,255,0.02)' : 'none'} stroke="var(--line-strong)" strokeWidth="1" />
      ))}
      {skills.map((s, i) => {
        const [x, y] = pt(i, Rr);
        return <line key={s.module_id} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />;
      })}
      <motion.polygon
        points={shape} fill={`url(#${id}-r)`} stroke="var(--cyan)" strokeWidth="2" strokeLinejoin="round"
        style={{ originX: 0.5, originY: 0.5, filter: 'drop-shadow(0 0 10px rgba(0,212,255,0.35))' }}
        initial={reduce ? false : { scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: duration.slower, ease: ease.out }}
      />
      {skills.map((s, i) => {
        const [x, y] = pt(i, Rr * Math.max(0.04, s.total ? s.solved / s.total : 0));
        return <circle key={`d-${s.module_id}`} cx={x} cy={y} r="4" fill="var(--cyan)" stroke="var(--surface)" strokeWidth="2" />;
      })}
      {skills.map((s, i) => {
        const [x, y] = pt(i, Rr + 22 * k);
        const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
        return (
          <g key={`l-${s.module_id}`}>
            <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle" style={{ fill: 'var(--fg-2)', fontSize: 12 * k, fontWeight: 600 }}>{s.short}</text>
            <text x={x} y={y + 14 * k} textAnchor={anchor} dominantBaseline="middle" className="fig" style={{ fill: 'var(--fg-3)', fontSize: 10.5 * k }}>{s.solved}/{s.total}</text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}

/** Progress ring with a gold gradient stroke. */
export function Ring({ value, size = 64, stroke = 8, tone = 'gold', children, delay = 0.2 }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  const stops = tone === 'cyan' ? ['var(--cyan-300)', 'var(--cyan-700)'] : ['var(--gold-300)', 'var(--gold-600)'];
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={stops[0]} />
            <stop offset="1" stopColor={stops[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`url(#${id}-g)`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: duration.slower * 1.6, delay: reduce ? 0 : delay, ease: ease.out }}
          style={{ filter: `drop-shadow(0 0 6px ${tone === 'cyan' ? 'rgba(0,212,255,0.5)' : 'rgba(212,175,55,0.55)'})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  );
}
