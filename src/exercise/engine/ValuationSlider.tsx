import { forwardRef, useRef } from 'react';
import type { ExercisePublic } from '../../lib/exercises/schema';
import { sfx } from '../../lib/sfx/engine';
import { haptic } from '../../lib/haptics';

type Slider = Extract<ExercisePublic, { kind: 'slider' }>;
type Props = { ex: Slider; value: number; onChange: (v: number) => void; locked: boolean };

const num = (v: number, d = 1) => v.toLocaleString('en-US', { maximumFractionDigits: d });
export const fmtSlider = (v: number, unit: Slider['unit']) =>
  unit === 'x' ? `${v.toFixed(1)}x` : unit === '%' ? `${v.toFixed(1)}%` : unit === 'Cr' ? `₹${num(v)} Cr` : `$${num(v)}M`;

/** Drag to an estimate; the value reads live, a tick every few notches. It is sent on CHECK. */
const ValuationSlider = forwardRef<HTMLDivElement, Props>(function ValuationSlider({ ex, value, onChange, locked }, ref) {
  const lastTick = useRef(value);
  const notches = Math.round((ex.max - ex.min) / ex.step);
  const every = Math.max(1, Math.round(notches / 24));
  const set = (v: number) => {
    onChange(v);
    if (Math.abs(v - lastTick.current) >= ex.step * every - 1e-9) {
      lastTick.current = v;
      sfx.tick();
      haptic('tap');
    }
  };
  return (
    <div className="xq" ref={ref}>
      <p className="xq-prompt">{ex.prompt}</p>
      <output className="xs-value">{fmtSlider(value, ex.unit)}</output>
      <input
        className="xs-range"
        type="range"
        min={ex.min}
        max={ex.max}
        step={ex.step}
        value={value}
        disabled={locked}
        aria-label="Your estimate"
        aria-valuetext={fmtSlider(value, ex.unit)}
        onChange={(e) => set(Number(e.target.value))}
      />
      <div className="xs-scale" aria-hidden="true"><span>{fmtSlider(ex.min, ex.unit)}</span><span>{fmtSlider(ex.max, ex.unit)}</span></div>
    </div>
  );
});
export default ValuationSlider;
