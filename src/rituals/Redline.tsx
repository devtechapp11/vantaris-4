import { useState } from 'react';
import type { ExercisePublic, SubmitResponse } from '../lib/exercises/schema';
import { sfx } from '../lib/sfx/engine';
import { haptic } from '../lib/haptics';
import './rituals.css';

export type Miss = { ex: ExercisePublic; res: SubmitResponse };

const SUB: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', 'ₑ': 'e' };
/** The margin note: the Deal Brief's subject, as a reviewer would write it (the fonts have no subscripts). */
const note = (m: Miss) => `Check: ${m.res.dealBrief.title.replace(/[₀-₉ₑ]/g, (c) => SUB[c] ?? c)}`;

/**
 * Redline: the lesson's misses come back as a marked-up document, the note
 * in the margin (in the existing loss red). Correct a line (multiple choice:
 * pick the right figure; otherwise read the fix and initial it) and it is
 * struck through: « Cleared ». No XP here, nothing is graded twice.
 */
export default function Redline({ misses, onDone }: { misses: Miss[]; onDone: () => void }) {
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState<string | null>(null);
  const clear = (id: string) => {
    setCleared((s) => new Set(s).add(id));
    sfx.stamp();
    haptic('correct');
  };
  const all = cleared.size === misses.length;
  return (
    <main className="xl xl--center" id="main">
      <div className="rl">
        <p className="rl-head kicker">Redline · {misses.length} {misses.length === 1 ? 'mark' : 'marks'}</p>
        <ol className="rl-doc">
          {misses.map((m) => {
            const done = cleared.has(m.ex.id);
            return (
              <li key={m.ex.id} className={`rl-item ${done ? 'is-cleared' : ''}`}>
                <div className="rl-body">
                  <p className="rl-prompt">{m.ex.prompt}</p>
                  {!done && m.ex.kind === 'mcq' && m.res.revealId ? (
                    <div className="rl-choices" role="group" aria-label="Correct it">
                      {m.ex.choices.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`rl-choice ${shake === `${m.ex.id}:${c.id}` ? 'is-miss' : ''}`}
                          onClick={() => {
                            if (c.id === m.res.revealId) clear(m.ex.id);
                            else {
                              setShake(`${m.ex.id}:${c.id}`);
                              sfx.wrong();
                            }
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  ) : !done ? (
                    <div className="rl-fix">
                      <p className="rl-take">{m.res.dealBrief.takeaway}</p>
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => clear(m.ex.id)}>Got it</button>
                    </div>
                  ) : (
                    <p className="rl-cleared">Cleared</p>
                  )}
                </div>
                <aside className="rl-margin">{note(m)}</aside>
              </li>
            );
          })}
        </ol>
        <button type="button" className={`btn ${all ? 'btn--primary' : 'btn--ghost'} btn--lg xl-cta`} onClick={onDone} autoFocus={all}>
          {all ? 'Continue' : 'Skip the redline'}
        </button>
      </div>
    </main>
  );
}
