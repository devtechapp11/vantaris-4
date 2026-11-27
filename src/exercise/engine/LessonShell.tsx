import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, X } from 'lucide-react';
import type { Answer, ExercisePublic, SubmitResponse } from '../../lib/exercises/schema';
import { finish, newAttemptId, startLesson, submit, type LessonStart } from '../../lib/exercises/client';
import { sfx } from '../../lib/sfx/engine';
import { haptic } from '../../lib/haptics';
import { valeBus } from '../../components/vale/valeBus';
import { midasTouch } from '../../lib/midas/midasTouch';
import { valeMidas } from '../../vale/valeMidas';
import { metalBurst } from '../../fx/MetalBurst';
import HoldToConfirmButton from '../../components/fx/HoldToConfirmButton';
import ThermalReceipt from '../../components/receipt/ThermalReceipt';
import McqCard from './McqCard';
import FormulaBuilder from './FormulaBuilder';
import PairMatch from './PairMatch';
import ValuationSlider from './ValuationSlider';
import './engine.css';

type Props = {
  skill: string;
  /** Shown in the header, e.g. « DCF · Free cash flow ». */
  title: string;
  onExit: () => void;
  /** After the results: the XP really credited. */
  onDone: (xp: number) => void;
};

type Value = string | null | (string | null)[] | number | { mistakes: number; ms: number };

const initial = (ex: ExercisePublic): Value =>
  ex.kind === 'formula' ? Array.from({ length: ex.slots }, () => null) : ex.kind === 'slider' ? ex.min : null;

function toAnswer(ex: ExercisePublic, v: Value): Answer | null {
  if (ex.kind === 'mcq') return typeof v === 'string' ? { kind: 'mcq', choiceId: v } : null;
  if (ex.kind === 'formula') return Array.isArray(v) && v.every(Boolean) ? { kind: 'formula', sequence: v as string[] } : null;
  if (ex.kind === 'slider') return typeof v === 'number' ? { kind: 'slider', value: v } : null;
  return v && typeof v === 'object' && 'ms' in v ? { kind: 'pairs', ...v } : null;
}

const starsFor = (right: number, total: number) => (right === total ? 3 : right >= total - 1 ? 2 : right >= Math.ceil(total / 2) ? 1 : 0);

/**
 * The lesson loop: one exercise at a time, one CHECK button, a verdict from
 * the server, then the feedback sheet (Deal Brief in one line + Continue).
 * Feedback matrix: visual + sound + haptics + Vale, in sync.
 * Keys: 1–4 pick, Enter checks / continues, Escape leaves.
 */
export default function LessonShell({ skill, title, onExit, onDone }: Props) {
  const reduce = useReducedMotion();
  const [start, setStart] = useState<LessonStart | null>(null);
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(0);
  const [value, setValue] = useState<Value>(null);
  const [res, setRes] = useState<SubmitResponse | null>(null);
  const [phase, setPhase] = useState<'answer' | 'locking' | 'waiting' | 'retry' | 'feedback' | 'results'>('answer');
  const [results, setResults] = useState<{ right: number; xp: number; best: number }>({ right: 0, xp: 0, best: 0 });
  const [credited, setCredited] = useState<number | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const attempt = useRef(newAttemptId());
  const startedAt = useRef(0);

  useEffect(() => {
    let live = true;
    startLesson(skill).then((s) => {
      if (!live) return;
      setStart(s);
      setValue(initial(s.items[0]));
      startedAt.current = performance.now();
      if (s.midasDay) valeMidas.state(true);
    }).catch(() => live && setFailed(true));
    return () => {
      live = false;
      valeMidas.state(false);
    };
  }, [skill]);

  const ex = start?.items[i] ?? null;
  const last = start ? i === start.items.length - 1 : false;
  const answer = ex ? toAnswer(ex, value) : null;

  const feedback = useCallback((r: SubmitResponse) => {
    const el = card.current;
    if (r.correct) {
      const target = el?.querySelector<HTMLElement>('.is-chosen, .xs-range, .xf-slots, .xp-grid') ?? el;
      if (target) midasTouch(target, lastPointer.current?.x, lastPointer.current?.y);
      const m = r.multiplier;
      if (m === 1) sfx.plink();
      else sfx.combo(m);
      haptic(m >= 2 ? 'combo' : 'correct');
      if (m >= 3) metalBurst.burst(target, m === 5 ? 5 : 3);
      valeBus.correct(m >= 3 ? 3 : 1);
      if (r.midasState) valeMidas.state(true);
    } else {
      sfx.wrong();
      haptic('wrong');
      const right = r.revealId ? el?.querySelector(`[data-choice-id="${r.revealId}"]`) : null;
      valeBus.wrong(right ?? null);
      if (!reduce) el?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 360, easing: 'ease-out' });
      valeMidas.state(false);
    }
  }, [reduce]);

  const check = useCallback(async () => {
    if (!start || !ex || !answer || (phase !== 'answer' && phase !== 'retry')) return;
    // A 150 ms mechanical lock-in covers the round trip; past 600 ms the button shimmers; at 8 s, Retry (same attemptId).
    setPhase('locking');
    sfx.press();
    const slow = window.setTimeout(() => setPhase((p) => (p === 'locking' ? 'waiting' : p)), 600);
    const timeout = new Promise<null>((r) => window.setTimeout(() => r(null), 8000));
    try {
      const r = await Promise.race([submit(start, ex.id, answer, attempt.current), timeout]);
      window.clearTimeout(slow);
      if (!r) {
        setPhase('retry');
        return;
      }
      setRes(r);
      setResults((s) => ({ right: s.right + (r.correct ? 1 : 0), xp: s.xp + r.xpAwarded, best: Math.max(s.best, r.combo) }));
      setPhase('feedback');
      feedback(r);
    } catch {
      window.clearTimeout(slow);
      setPhase('retry');
    }
  }, [start, ex, answer, phase, feedback]);

  const next = useCallback(async () => {
    if (!start || phase !== 'feedback') return;
    if (!last) {
      attempt.current = newAttemptId();
      setI((n) => n + 1);
      setValue(initial(start.items[i + 1]));
      setRes(null);
      setPhase('answer');
      return;
    }
    valeMidas.state(false);
    setPhase('results');
    const total = start.items.length;
    const xp = await finish(start, skill, starsFor(results.right, total), results.right, results.xp);
    setCredited(xp);
  }, [start, phase, last, i, skill, results]);

  // Keyboard: 1–4, Enter, Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === 'text') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        if (phase === 'feedback') void next();
        else if (!last) void check();
        return;
      }
      if (ex?.kind === 'mcq' && phase === 'answer' && /^[1-4]$/.test(e.key)) {
        const c = ex.choices[Number(e.key) - 1];
        if (c) {
          lastPointer.current = null;
          setValue(c.id);
          sfx.tick();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ex, phase, last, check, next, onExit]);

  const live = useMemo(() => {
    if (!res) return '';
    return res.correct ? `Right. ${res.xpAwarded} XP. ${res.dealBrief.takeaway}` : `Not quite. ${res.dealBrief.takeaway}`;
  }, [res]);

  if (failed) {
    return (
      <main className="xl xl--center" id="main">
        <p className="xl-note">We couldn’t open this lesson. Check your connection and try again.</p>
        <button type="button" className="btn btn--secondary btn--md" onClick={onExit}>Back to the path</button>
      </main>
    );
  }
  if (!start || !ex) {
    return <main className="xl xl--center" id="main" aria-busy="true"><p className="kicker">Opening the deal room</p></main>;
  }

  if (phase === 'results') {
    const total = start.items.length;
    const stars = starsFor(results.right, total);
    return (
      <main className="xl xl--center" id="main">
        <h1 className="xl-title">Lesson closed</h1>
        <div className="xl-stars" aria-label={`${stars} of 3 stars`}>
          {[0, 1, 2].map((k) => (
            <motion.span
              key={k}
              className={`xl-star ${k < stars ? 'is-on' : ''}`}
              initial={reduce ? false : { scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25 + k * 0.32, type: 'spring', stiffness: 420, damping: 18 }}
              onAnimationStart={() => k < stars && window.setTimeout(() => sfx.starImpact(k as 0 | 1 | 2), (250 + k * 320))}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" width="40" height="40"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" /></svg>
            </motion.span>
          ))}
        </div>
        <ThermalReceipt
          heading="DEAL TICKET"
          meta={title}
          lines={[
            { label: 'Right answers', value: `${results.right}/${total}` },
            { label: 'Best run', value: `${results.best}` },
            { label: 'XP credited', value: credited == null ? '…' : `+${credited}`, strong: true },
          ]}
          stamp={credited == null ? null : 'CLOSED'}
          onPrinted={() => credited != null && sfx.stamp()}
        />
        <button type="button" className="btn btn--primary btn--lg" disabled={credited == null} onClick={() => onDone(credited ?? 0)} autoFocus>Continue</button>
      </main>
    );
  }

  const busy = phase === 'locking' || phase === 'waiting';
  return (
    <main className="xl" id="main" onPointerDown={(e) => (lastPointer.current = { x: e.clientX, y: e.clientY })}>
      <header className="xl-top">
        <button type="button" className="xl-close" onClick={onExit} aria-label="Leave the lesson"><X size={20} aria-hidden="true" /></button>
        <ol className="xl-progress" aria-label={`Exercise ${i + 1} of ${start.items.length}`}>
          {start.items.map((it, k) => <li key={it.id} className={k < i || (k === i && res) ? 'is-done' : k === i ? 'is-now' : ''} />)}
        </ol>
        <AnimatePresence>
          {res && res.multiplier >= 2 && (
            <motion.span key={res.multiplier} className={`xl-combo ${res.multiplier >= 3 ? 'is-chrome' : ''}`} initial={reduce ? false : { y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              {res.multiplier}×
            </motion.span>
          )}
        </AnimatePresence>
      </header>

      <section className="xl-stage" aria-label={title}>
        {ex.kind === 'mcq' && <McqCard ref={card} ex={ex} value={value as string | null} onChange={(v) => phase === 'answer' && setValue(v)} verdict={res && { correct: res.correct, revealId: res.revealId }} />}
        {ex.kind === 'formula' && <FormulaBuilder ref={card} ex={ex} value={value as (string | null)[]} onChange={setValue} locked={phase !== 'answer'} />}
        {ex.kind === 'pairs' && <PairMatch ref={card} ex={ex} onDone={setValue} locked={phase !== 'answer'} />}
        {ex.kind === 'slider' && <ValuationSlider ref={card} ex={ex} value={value as number} onChange={setValue} locked={phase !== 'answer'} />}
      </section>

      <p className="sr-only" aria-live="polite">{live}</p>

      <footer className="xl-foot">
        <AnimatePresence mode="wait">
          {phase === 'feedback' && res ? (
            <motion.div key="sheet" className={`xl-sheet ${res.correct ? 'is-right' : 'is-wrong'}`} initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="xl-verdict">
                <span className="xl-verdict-icon" aria-hidden="true">{res.correct ? <Check size={18} /> : <X size={18} />}</span>
                {res.correct ? (res.stars != null ? `Right · ${res.stars}/3 on target` : 'Right') : 'Not quite'}
                {res.xpAwarded > 0 && <span className="xl-xp">+{res.xpAwarded} XP</span>}
              </p>
              <p className="xl-brief"><strong>{res.dealBrief.title}</strong> · {res.dealBrief.takeaway}</p>
              <button type="button" className="btn btn--primary btn--lg xl-cta" onClick={() => void next()} autoFocus>Continue</button>
            </motion.div>
          ) : last && phase === 'answer' ? (
            <motion.div key="sign" className="xl-sign">
              <HoldToConfirmButton className="xl-cta" duration={700} disabled={!answer} onConfirm={() => void check()}>
                Hold to close the deal
              </HoldToConfirmButton>
            </motion.div>
          ) : (
            <motion.div key="check">
              <button
                type="button"
                className={`btn btn--primary btn--lg xl-cta xl-check ${phase === 'locking' ? 'is-locking' : ''} ${phase === 'waiting' ? 'is-waiting' : ''}`}
                disabled={!answer || busy}
                aria-busy={busy}
                onClick={() => void check()}
              >
                {phase === 'retry' ? 'Retry' : 'Check'}
              </button>
              {phase === 'retry' && <p className="xl-note" role="status">The desk didn’t answer. Retry sends the same answer, it can’t count twice.</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </main>
  );
}
