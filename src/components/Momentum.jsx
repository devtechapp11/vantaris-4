import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Volume2, VolumeX } from 'lucide-react';
import { ProgressBar } from './ui';
import { setPref, usePrefs } from '../app/prefs';
import { closedToday, comboTier, dailyGoal } from '../lib/momentum';
import { sound } from '../lib/sound';
import { CAREER } from '../lib/career';
import { spring } from '../design/tokens';

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

/** "×3 combo": correct answers in a row, read from the server's record. */
export function ComboBadge({ n, pop = false }) {
  const reduce = useReducedMotion();
  const tier = comboTier(n);
  useEffect(() => {
    if (pop && tier) sound.combo(tier === 5 ? 3 : tier - 1);
  }, [pop, tier]);
  if (!tier) return null;
  return (
    <motion.span
      className={`combo combo--x${tier}`}
      initial={pop && !reduce ? { scale: 0.4, opacity: 0, rotate: -8 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ ...spring.bouncy, delay: pop ? 0.45 : 0 }}
      aria-label={`Combo: ${n} correct in a row`}
    >
      <b className="fig-mono">×{tier}</b>
      <span>combo · {n} in a row</span>
    </motion.span>
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
