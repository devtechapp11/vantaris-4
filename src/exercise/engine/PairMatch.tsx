import { forwardRef, useEffect, useRef, useState } from 'react';
import type { ExercisePublic } from '../../lib/exercises/schema';
import { sfx } from '../../lib/sfx/engine';
import { haptic } from '../../lib/haptics';

type Pairs = Extract<ExercisePublic, { kind: 'pairs' }>;
type Props = { ex: Pairs; onDone: (r: { mistakes: number; ms: number }) => void; locked: boolean };

/** Tap a term, then its match: instant feedback per pair (the key ships with this format only). */
const PairMatch = forwardRef<HTMLDivElement, Props>(function PairMatch({ ex, onDone, locked }, ref) {
  const [left, setLeft] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [miss, setMiss] = useState<string | null>(null);
  const mistakes = useRef(0);
  const t0 = useRef(0);
  const match = new Map(ex.key.map(([l, r]) => [l, r]));

  useEffect(() => {
    t0.current = performance.now();
  }, []);
  useEffect(() => {
    if (done.size === ex.key.length * 2) onDone({ mistakes: mistakes.current, ms: Math.round(performance.now() - t0.current) });
  }, [done, ex.key.length, onDone]);

  const pickRight = (r: string) => {
    if (!left || locked) return;
    if (match.get(left) === r) {
      setDone((d) => new Set([...d, left, r]));
      sfx.tick();
      haptic('tap');
    } else {
      mistakes.current += 1;
      setMiss(r);
      sfx.wrong();
      window.setTimeout(() => setMiss(null), 360);
    }
    setLeft(null);
  };

  return (
    <div className="xq" ref={ref}>
      <p className="xq-prompt">{ex.prompt}</p>
      <div className="xp-grid">
        <div className="xp-col" role="group" aria-label="Terms">
          {ex.left.map((i) => (
            <button key={i.id} type="button" disabled={locked || done.has(i.id)} aria-pressed={left === i.id} className={`xp-item midas-surface ${done.has(i.id) ? 'is-done' : ''}`} onClick={() => setLeft(i.id)}>{i.label}</button>
          ))}
        </div>
        <div className="xp-col" role="group" aria-label="Matches">
          {ex.right.map((i) => (
            <button key={i.id} type="button" disabled={locked || done.has(i.id) || !left} className={`xp-item midas-surface ${done.has(i.id) ? 'is-done' : ''} ${miss === i.id ? 'is-miss' : ''}`} onClick={() => pickRight(i.id)}>{i.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
});
export default PairMatch;
