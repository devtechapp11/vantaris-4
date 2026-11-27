import { forwardRef, useRef } from 'react';
import type { ExercisePublic } from '../../lib/exercises/schema';
import { sfx } from '../../lib/sfx/engine';
import { haptic } from '../../lib/haptics';

type Formula = Extract<ExercisePublic, { kind: 'formula' }>;
type Props = { ex: Formula; value: (string | null)[]; onChange: (v: (string | null)[]) => void; locked: boolean };

/**
 * Rebuild a formula from blocks: tap a block to drop it in the next empty
 * slot, or drag it onto a slot; tap a placed block to send it back. Blocks
 * snap with a mechanical click; one or two of them are decoys.
 */
const FormulaBuilder = forwardRef<HTMLDivElement, Props>(function FormulaBuilder({ ex, value, onChange, locked }, ref) {
  const drag = useRef<{ id: string; x: number; y: number; el: HTMLElement; moved: boolean } | null>(null);
  const used = new Set(value.filter(Boolean) as string[]);
  const label = (id: string) => ex.tokens.find((t) => t.id === id)?.label ?? '';

  const place = (id: string, slot?: number) => {
    if (locked) return;
    const next = [...value];
    const i = slot ?? next.findIndex((v) => v == null);
    if (i < 0) return;
    const was = next.indexOf(id);
    if (was >= 0) next[was] = null;
    next[i] = id;
    onChange(next);
    sfx.tick();
    haptic('tap');
  };
  const back = (i: number) => {
    if (locked || value[i] == null) return;
    const next = [...value];
    next[i] = null;
    onChange(next);
    sfx.press();
  };

  const onDown = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = { id, x: e.clientX, y: e.clientY, el: e.currentTarget, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) d.moved = true;
    if (d.moved) d.el.style.transform = `translate(${e.clientX - d.x}px, ${e.clientY - d.y}px)`;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return; // a tap: the click handler places it
    d.el.style.transform = '';
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-slot]');
    if (over) place(d.id, Number(over.dataset.slot));
  };
  const onClick = (id: string) => {
    if (drag.current?.moved) return;
    place(id);
  };

  return (
    <div className="xq" ref={ref} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <p className="xq-prompt">{ex.prompt}</p>
      <ol className="xf-slots" aria-label="Your formula">
        {value.map((id, i) => (
          <li key={i}>
            <button type="button" data-slot={i} className={`xf-slot midas-surface ${id ? 'is-filled' : ''}`} onClick={() => back(i)} disabled={locked || !id} aria-label={id ? `Remove ${label(id)}` : `Empty slot ${i + 1}`}>
              {id ? label(id) : ''}
            </button>
          </li>
        ))}
      </ol>
      <div className="xf-bank" role="group" aria-label="Blocks">
        {ex.tokens.map((t) => (
          <button key={t.id} type="button" className="xf-token" disabled={locked || used.has(t.id)} onPointerDown={(e) => onDown(e, t.id)} onClick={() => onClick(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
});
export default FormulaBuilder;
