import { useState } from 'react';
import { motion, useAnimate } from 'motion/react';
import { sfx } from '../lib/sfx/engine';
import { haptics, HAPTIC } from '../lib/haptics';
import { springs } from '../motion/springs';

type Pairs = { left: string[]; right: string[]; answer: Record<string, string> };
type Side = 'l' | 'r';

/**
 * Rapid Pair Match: four terms on the left, four formulas on the right. Tap
 * one on each side; a right pair locks with a click and a chrome flash, a
 * wrong one shakes and frees both. `onDone(slips)` once all four are locked.
 */
export default function PairsQ({ pairs, onDone, done }: { pairs: Pairs; onDone: (slips: number) => void; done: boolean }) {
  const [sel, setSel] = useState<{ side: Side; v: string } | null>(null);
  const [locked, setLocked] = useState<string[]>([]); // left terms matched
  const [slips, setSlips] = useState(0);
  const [miss, setMiss] = useState<string[]>([]);
  const [scope, animate] = useAnimate();
  const matchedRight = new Set(locked.map((l) => pairs.answer[l]));

  const tap = (side: Side, v: string) => {
    if (done) return;
    if (side === 'l' ? locked.includes(v) : matchedRight.has(v)) return;
    if (!sel || sel.side === side) {
      setSel({ side, v });
      sfx.tick();
      haptics.fire(HAPTIC.tick);
      return;
    }
    const term = side === 'l' ? v : sel.v;
    const formula = side === 'r' ? v : sel.v;
    setSel(null);
    if (pairs.answer[term] === formula) {
      const next = [...locked, term];
      setLocked(next);
      sfx.tick();
      sfx.press();
      haptics.fire(HAPTIC.press);
      if (next.length === pairs.left.length) window.setTimeout(() => onDone(slips), 280);
    } else {
      setSlips((n) => n + 1);
      setMiss([term, formula]);
      sfx.wrong();
      haptics.fire(HAPTIC.wrong);
      const els = scope.current?.querySelectorAll('.pm-cell.is-miss');
      if (els?.length) animate(els, { x: [-5, 5, -3, 3, 0] }, { duration: 0.22 });
      window.setTimeout(() => setMiss([]), 360);
    }
  };

  const cell = (side: Side, v: string) => {
    const isLocked = side === 'l' ? locked.includes(v) : matchedRight.has(v);
    const isSel = sel?.side === side && sel.v === v;
    const isMiss = miss.includes(v);
    return (
      <motion.button
        key={v}
        type="button"
        className={`pm-cell metal ${isLocked ? 'is-locked' : ''} ${isSel ? 'is-sel' : ''} ${isMiss ? 'is-miss' : ''} ${side === 'r' ? 'fig-mono' : ''}`}
        aria-pressed={isSel}
        aria-disabled={isLocked || done}
        onClick={() => tap(side, v)}
        animate={{ scale: isSel ? 0.97 : 1 }}
        transition={springs.snappy}
        whileTap={isLocked ? undefined : { scale: 0.95 }}
      >
        {isLocked && <i className="pm-flash" aria-hidden="true" />}
        <span>{v}</span>
      </motion.button>
    );
  };

  return (
    <div className="pm" ref={scope} aria-label="Match the pairs">
      <div className="pm-col" role="group" aria-label="Terms">{pairs.left.map((v) => cell('l', v))}</div>
      <div className="pm-col" role="group" aria-label="What they equal">{pairs.right.map((v) => cell('r', v))}</div>
      <p className="pm-count fig-mono" aria-live="polite">{locked.length}/{pairs.left.length} LOCKED{slips ? ` · ${slips} SLIP${slips > 1 ? 'S' : ''}` : ''}</p>
    </div>
  );
}
