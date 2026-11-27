import { forwardRef } from 'react';
import type { ExercisePublic } from '../../lib/exercises/schema';

type Mcq = Extract<ExercisePublic, { kind: 'mcq' }>;
type Props = {
  ex: Mcq;
  value: string | null;
  onChange: (id: string) => void;
  /** After the server's verdict: was it right, and which option was (revealId). */
  verdict?: { correct: boolean; revealId?: string } | null;
};

/** Multiple choice, 2–4 options, keys 1–4. Each option is a Midas surface. */
const McqCard = forwardRef<HTMLDivElement, Props>(function McqCard({ ex, value, onChange, verdict }, ref) {
  return (
    <div className="xq" ref={ref}>
      <p className="xq-prompt">{ex.prompt}</p>
      <div className="xq-choices" role="radiogroup" aria-label="Answers">
        {ex.choices.map((c, i) => {
          const chosen = value === c.id;
          const right = verdict && verdict.revealId === c.id;
          const wrong = verdict && chosen && !verdict.correct;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={chosen}
              data-choice-id={c.id}
              disabled={Boolean(verdict)}
              className={`xq-choice midas-surface ${chosen ? 'is-chosen' : ''} ${right ? 'is-right' : ''} ${wrong ? 'is-wrong' : ''}`}
              onClick={() => onChange(c.id)}
            >
              <span className="xq-key" aria-hidden="true">{i + 1}</span>
              <span className="xq-label">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
export default McqCard;
