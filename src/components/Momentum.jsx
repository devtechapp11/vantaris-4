import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Volume2, VolumeX, Zap } from 'lucide-react';
import { ProgressBar } from './ui';
import { haptic, setPref, usePrefs } from '../app/prefs';
import { closedToday, dailyGoal, isFever, multiplierFor, nextMultiplier, sessionStats } from '../lib/momentum';
import { sound } from '../lib/sound';
import { CAREER, careerName } from '../lib/career';
import { spring } from '../design/tokens';
import { todayLine } from '../lib/format';

/* ---------- Number ticker: a mechanical odometer, one reel per digit ---------- */
const DIGITS = '0123456789';

/**
 * Rolls each digit like a counter wheel (transform only, tabular figures).
 * `from` sets where the reels start, so a gain rolls from the old score.
 */
export function NumberTicker({ value = 0, from, prefix = '', suffix = '', className = '', delay = 0 }) {
  const reduce = useReducedMotion();
  const text = Math.round(value).toLocaleString('en-US');
  const start = Math.round(from ?? 0).toLocaleString('en-US').padStart(text.length, ' ');
  let d = 0;
  return (
    <span className={`ticker ${className}`} aria-label={`${prefix}${text}${suffix}`} role="text">
      {prefix && <span aria-hidden="true">{prefix}</span>}
      {[...text].map((ch, i) => {
        if (!DIGITS.includes(ch)) return <span key={`s${i}`} aria-hidden="true">{ch}</span>;
        const digit = Number(ch);
        const initial = DIGITS.includes(start[i]) ? Number(start[i]) : 0;
        const k = d++;
        return (
          <span key={`d${text.length - i}`} className="ticker-col" aria-hidden="true">
            <motion.span
              className="ticker-reel"
              initial={reduce ? false : { y: `${-initial * 10}%` }}
              animate={{ y: `${-digit * 10}%` }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 16, mass: 0.9, delay: delay + (text.length - k) * 0.06 }}
            >
              {DIGITS.split('').map((n) => <span key={n}>{n}</span>)}
            </motion.span>
          </span>
        );
      })}
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </span>
  );
}

/* ---------- Border beam: a silver light running round a card's 1px edge ---------- */
export function BorderBeam({ duration = 7, className = '' }) {
  return <span className={`beam ${className}`} style={{ '--beam-dur': `${duration}s` }} aria-hidden="true" />;
}

/* ---------- Session ---------- */
/** Today's session: deals closed against the day's target, as a glowing platinum bar. */
export function SessionBar({ me, delay = 0.3 }) {
  if (!me) return null;
  const done = closedToday(me.recent);
  const goal = dailyGoal(me);
  const hit = done >= goal;
  return (
    <div className={`session ${hit ? 'is-hit' : ''}`}>
      <div className="session-head">
        <span className="t-eyebrow">Today’s session</span>
        <span className="session-count fig-mono">
          {hit && <Check size={13} strokeWidth={2.5} aria-hidden="true" />}
          {Math.min(done, goal)}/{goal}
        </span>
      </div>
      <ProgressBar value={done / goal} from={Math.max(0, (done - 1) / goal)} size="sm" delay={delay} label={`Today: ${done} of ${goal} deals`} />
      <span className="t-cap">{hit ? 'Session complete. Anything more is extra credit.' : `${goal - done} more ${goal - done === 1 ? 'deal' : 'deals'} to close today’s session.`}</span>
    </div>
  );
}

/** Deal streak and the XP multiplier it pays (the server applies it to the points). */
export function ComboBadge({ n, pop = false }) {
  const reduce = useReducedMotion();
  const x = multiplierFor(n);
  const next = nextMultiplier(n);
  useEffect(() => {
    if (!pop || x === 1) return;
    // Crossing a threshold (3, 5, 10) gets the crystal chord; inside a run, the quick pair.
    if (n === 3 || n === 5 || n === 10) {
      sound.fever(x);
      haptic(x >= 5 ? [20, 40, 20, 40, 40] : [16, 40, 28]);
    } else sound.combo(x === 5 ? 3 : x - 1);
  }, [pop, x, n]);
  if (n < 1) return null;
  const fever = isFever(n);
  return (
    <motion.span
      className={`combo ${fever ? 'is-fever' : ''} combo--x${x}`}
      initial={pop && !reduce ? { scale: 0.4, opacity: 0, rotate: -8 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ ...spring.bouncy, delay: pop ? 0.45 : 0 }}
      aria-label={x > 1 ? `Bull run: ${n} correct in a row, ${x} times XP` : `${n} correct in a row`}
    >
      {x > 1 ? <b className="fig-mono combo-x">×{x} XP</b> : <b className="fig-mono combo-x"><Zap size={13} aria-hidden="true" /></b>}
      <span>
        {fever ? 'Bull run' : 'Deal streak'} · <span className="fig">{n}</span> in a row
        {next && <span className="combo-next"> · ×{next.x} in {next.in}</span>}
      </span>
    </motion.span>
  );
}

/** "Bull run": the frame of the app catches a platinum light while the run lasts. */
export function FeverFrame({ run }) {
  const reduce = useReducedMotion();
  const on = isFever(run);
  return (
    <AnimatePresence>
      {on && (
        <motion.div
          className={`fever fever--x${multiplierFor(run)}`}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.8 }}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Liquid metal ambience: three soft platinum pools drifting very slowly behind
 * the app. Transform and opacity only, compositor-driven; still under reduced motion.
 */
export function AmbientMetal() {
  return (
    <div className="ambient" aria-hidden="true">
      <i className="ambient-a" />
      <i className="ambient-b" />
      <i className="ambient-c" />
    </div>
  );
}

/** Discreet sound switch. */
export function SoundToggle({ className = '' }) {
  const { sound: on } = usePrefs();
  return (
    <button
      type="button"
      className={`sound-toggle ${className}`}
      aria-pressed={on}
      aria-label={on ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}
      title={on ? 'Sound on' : 'Sound off'}
      onClick={() => {
        setPref('sound', !on);
        if (!on) requestAnimationFrame(() => sound.tap());
      }}
    >
      {on ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
    </button>
  );
}

/** Promotion: the four titles, the light travelling from the old seat to the new one. */
export function RankClimb({ level }) {
  const reduce = useReducedMotion();
  const to = Math.max(0, CAREER.findIndex((c) => c.level === level));
  useEffect(() => {
    sound.rankUp();
  }, []);
  return (
    <ol className="climb" aria-label={`Promoted to ${CAREER[to]?.name}`}>
      {CAREER.map((c, i) => {
        const state = i < to ? 'done' : i === to ? 'now' : 'future';
        return (
          <li key={c.level} className={`climb-step is-${state}`}>
            <motion.span
              className="climb-node"
              initial={state === 'now' && !reduce ? { scale: 0.5, opacity: 0.3 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring.bouncy, delay: 0.55 }}
            />
            {i < CAREER.length - 1 && (
              <span className="climb-link" aria-hidden="true">
                <motion.i
                  initial={{ scaleX: i < to - 1 ? 1 : 0 }}
                  animate={{ scaleX: i < to ? 1 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            )}
            <span className="climb-label">{c.level}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Closing memo: the end-of-session summary ---------- */
export function SessionClose({ me, open, onClose, onHome }) {
  const reduce = useReducedMotion();
  const s = useMemo(() => sessionStats(me), [me]);
  const p = me?.profile;
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return undefined;
    sound.rankUp();
    haptic([18, 50, 18, 50, 30]);
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const span = p?.next_level_at != null ? p.next_level_at - p.level_floor : null;
  const toNext = span ? (p.points - p.level_floor) / span : 1;
  const rows = [
    { k: 'XP earned today', v: <NumberTicker value={s.xp} prefix="+" delay={0.5} className="fig-mono" /> },
    { k: 'Accuracy', v: <NumberTicker value={s.accuracy} suffix="%" delay={0.7} className="fig-mono" /> },
    { k: 'Decision speed', v: s.speed == null ? <span className="c-3">—</span> : <><NumberTicker value={s.speed} suffix="%" delay={0.9} className="fig-mono" /><small> of the clock left</small></> },
    { k: 'Deals answered', v: <NumberTicker value={s.deals} delay={1.1} className="fig-mono" /> },
  ];
  return (
    <AnimatePresence>
      {open && p && (
        <motion.div className="closing" role="dialog" aria-modal="true" aria-labelledby="closing-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="closing-card metal"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={spring.gentle}
          >
            <BorderBeam duration={5} />
            <p className="t-eyebrow">Closing memo · {todayLine()}</p>
            <h2 id="closing-title" className="t-h1">Session closed.</h2>
            <dl className="closing-rows">
              {rows.map((r, i) => (
                <motion.div key={r.k} className="closing-row" initial={reduce ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15, ...spring.gentle }}>
                  <dt>{r.k}</dt>
                  <dd>{r.v}</dd>
                </motion.div>
              ))}
            </dl>
            <div className="stack-8">
              <div className="between t-cap">
                <span><b className="c-fg">{careerName(p.level)}</b> · <span className="fig">{p.points}</span> pts</span>
                <span>{p.next_level ? `${p.next_level_at - p.points} to ${careerName(p.next_level)}` : 'Top of the ladder'}</span>
              </div>
              <ProgressBar value={toNext} size="sm" delay={1.3} label="Progress to the next title" />
            </div>
            <div className="closing-actions">
              <button type="button" className="btn btn--secondary" onClick={onHome}>Back to the terminal</button>
              <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>Keep going <ArrowRight size={17} aria-hidden="true" /></button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
