import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Trophy, Zap } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { haptic } from '../app/prefs';
import { api } from '../lib/api';
import { sound } from '../lib/sound';
import { feverBurst } from '../lib/celebrate';
import { multiplierFor } from '../lib/momentum';
import { rng } from '../content/lessons';
import { BLITZ_SECONDS, nextBlitz, windowFor } from '../content/blitz';
import { Page } from '../components/chrome';
import { NumberTicker, SoundToggle } from '../components/Momentum';
import { spring } from '../design/tokens';
import { useMeta } from '../app/useMeta';
import './Blitz.css';

/**
 * Market Blitz: sixty seconds of binary calls. Each one has its own shrinking
 * window; a streak of right calls multiplies the points (×2 at 3, ×3 at 5,
 * ×5 at 10).
 */
export default function Blitz() {
  useMeta({ title: 'Market Blitz' });
  const { me, setMe, showToast } = useApp();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState('intro'); // intro | count | play | over
  const [count, setCount] = useState(3);
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);
  const gen = useRef(null);
  const raf = useRef(0);
  const clock = useRef({ end: 0, itemEnd: 0, itemStart: 0, flashUntil: 0 });
  const [hud, setHud] = useState({ left: BLITZ_SECONDS, win: 1 });
  const live = useRef(null);
  const commit = (s) => { live.current = s; setState(s); };

  const best = me?.blitz_best ?? 0;

  const deal = useCallback((s) => {
    const now = performance.now();
    const w = windowFor(s.run) * 1000;
    clock.current.itemStart = now;
    clock.current.itemEnd = now + w;
    return { ...s, q: nextBlitz(gen.current), k: s.k + 1, flash: null };
  }, []);

  const start = () => {
    sound.tap();
    setPhase('count');
    setCount(3);
  };

  // Countdown 3-2-1
  useEffect(() => {
    if (phase !== 'count') return undefined;
    if (count === 0) {
      gen.current = rng(Math.floor(Math.random() * 2 ** 31));
      clock.current.end = performance.now() + BLITZ_SECONDS * 1000;
      commit(deal({ score: 0, run: 0, bestRun: 0, right: 0, total: 0, k: 0 }));
      setPhase('play');
      return undefined;
    }
    sound.tap();
    haptic(8);
    const t = setTimeout(() => setCount((c) => c - 1), reduce ? 400 : 700);
    return () => clearTimeout(t);
  }, [phase, count, deal, reduce]);

  const answer = useCallback((choice) => {
    const s = live.current;
    if (!s || s.flash) return;
    const ok = choice === s.q.answer;
    const run = ok ? s.run + 1 : 0;
    const mult = multiplierFor(run);
    const gained = ok ? 10 * mult : 0;
    if (ok) {
      sound.correct(run);
      const threshold = [3, 5, 10].includes(run);
      haptic(threshold ? [10, 30, 16] : 8);
      if (threshold) sound.fever(mult);
    } else {
      sound.wrong();
      haptic([24, 40, 24]);
    }
    clock.current.flashUntil = performance.now() + (ok ? 260 : 650);
    commit({ ...s, score: s.score + gained, run, bestRun: Math.max(s.bestRun, run), right: s.right + (ok ? 1 : 0), total: s.total + 1, flash: { ok, choice, gained, timeout: false } });
  }, []);

  // Game loop: overall clock, per-call window, and the flash between calls
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const loop = () => {
      const now = performance.now();
      if (now >= clock.current.end) {
        setPhase('over');
        return;
      }
      const s = live.current;
      if (s?.flash && now >= clock.current.flashUntil) commit(deal(s));
      else if (s && !s.flash && now >= clock.current.itemEnd) {
        sound.wrong();
        haptic([24, 40, 24]);
        clock.current.flashUntil = now + 650;
        commit({ ...s, run: 0, total: s.total + 1, flash: { ok: false, choice: null, gained: 0, timeout: true } });
      }
      const cur = live.current;
      const span = clock.current.itemEnd - clock.current.itemStart;
      setHud({ left: Math.max(0, (clock.current.end - now) / 1000), win: cur?.flash ? 0 : Math.max(0, (clock.current.itemEnd - now) / span) });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, deal]);

  // Keyboard: ← / → or 1 / 2
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === '1') answer(0);
      if (e.key === 'ArrowRight' || e.key === '2') answer(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, answer]);

  // Save the run
  useEffect(() => {
    if (phase !== 'over' || !state) return;
    let live = true;
    const score = state.score;
    setResult({ score, saving: true });
    api.saveBlitz(score)
      .then((r) => {
        if (!live) return;
        setResult({ score, saving: false, record: r.record, previous: r.previous });
        setMe((m) => (m ? { ...m, blitz_best: r.best } : m));
        if (r.record && score > 0) {
          sound.rankUp();
          feverBurst(5);
          haptic([14, 40, 14, 40, 30]);
        }
      })
      .catch((err) => {
        if (!live) return;
        setResult({ score, saving: false, error: err.message });
        showToast(err.message, 'error');
      });
    return () => { live = false; };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'play' && state) {
    const { left, win } = hud;
    const mult = multiplierFor(state.run);
    return (
      <main className={`blitz blitz--play ${mult > 1 ? 'is-surge' : ''}`} data-surge={mult} aria-label="Market Blitz in progress">
        <header className="blitz-hud">
          <span className={`blitz-time fig-mono ${left < 10 ? 'is-low' : ''}`} aria-label={`${Math.ceil(left)} seconds left`}>{Math.ceil(left)}s</span>
          <span className="blitz-score fig-mono" aria-live="polite">{state.score}</span>
          <AnimatePresence mode="popLayout">
            <motion.span key={mult} className={`blitz-mult fig-mono ${mult > 1 ? 'is-on' : ''}`} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
              ×{mult}
            </motion.span>
          </AnimatePresence>
          <SoundToggle className="blitz-mute" />
        </header>
        <div className="blitz-clock bar bar--sm" aria-hidden="true"><i style={{ transform: `scaleX(${left / BLITZ_SECONDS})` }} /></div>

        <div className="blitz-card-wrap">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={state.k}
              className={`blitz-card metal ${state.flash ? (state.flash.ok ? 'is-ok' : 'is-miss') : ''}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -30, scale: 0.96 }}
              transition={spring.snappy}
            >
              <span className="t-eyebrow">{state.q.kind === 'tf' ? 'True or false' : 'Mental maths'}</span>
              <p className="blitz-q">{state.q.prompt}</p>
              <span className="blitz-window" aria-hidden="true"><i style={{ transform: `scaleX(${win})` }} /></span>
              <AnimatePresence>
                {state.flash && (
                  <motion.span className="blitz-flash fig-mono" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {state.flash.ok ? `+${state.flash.gained}` : state.flash.timeout ? 'Too slow' : `It was ${state.q.options[state.q.answer]}`}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="blitz-pads">
          {state.q.options.map((o, i) => {
            const st = !state.flash ? '' : i === state.q.answer ? 'is-answer' : i === state.flash.choice ? 'is-wrong' : 'is-dim';
            return (
              <motion.button key={`${state.k}-${o}`} type="button" className={`blitz-pad ${st}`} onClick={() => answer(i)} whileTap={{ scale: 0.96 }} disabled={Boolean(state.flash)}>
                <span className="blitz-pad-key fig-mono" aria-hidden="true">{i === 0 ? '←' : '→'}</span>
                <span className="fig-mono">{o}</span>
              </motion.button>
            );
          })}
        </div>
      </main>
    );
  }

  if (phase === 'over' && state) {
    const acc = state.total ? Math.round((state.right / state.total) * 100) : 0;
    return (
      <Page className="screen blitz blitz--over">
        <div className="blitz-over">
          <p className="t-eyebrow">Time</p>
          <p className="blitz-final fig-mono"><NumberTicker value={state.score} /></p>
          {result?.record && state.score > 0 ? (
            <motion.p className="blitz-record" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring.bouncy, delay: 0.3 }}>
              <Trophy size={16} aria-hidden="true" /> New personal record
            </motion.p>
          ) : (
            <p className="t-cap">Personal record: <span className="fig-mono c-fg">{Math.max(best, state.score)}</span></p>
          )}
          <dl className="finish-stats blitz-stats">
            <div><dt>Calls</dt><dd className="fig-mono">{state.right}/{state.total}</dd></div>
            <div><dt>Accuracy</dt><dd className="fig-mono">{acc}%</dd></div>
            <div><dt>Best run</dt><dd className="fig-mono">{state.bestRun}</dd></div>
          </dl>
          <div className="finish-actions">
            <motion.button type="button" className="btn btn--primary btn--lg" whileTap={{ scale: 0.96 }} onClick={start} disabled={result?.saving}>
              <Zap size={18} aria-hidden="true" /> Run it again
            </motion.button>
            <motion.button type="button" className="btn btn--ghost" whileTap={{ scale: 0.96 }} onClick={() => navigate('/')}>
              Back to the path <ArrowRight size={18} aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page className="screen blitz">
      <div className="blitz-intro">
        <span className="blitz-bolt" aria-hidden="true"><Zap size={34} strokeWidth={1.6} /></span>
        <h1 className="t-h1">Market Blitz</h1>
        <p className="t-body c-2">Sixty seconds. Two buttons. Technical calls and mental multiples, faster and faster.</p>
        <ul className="blitz-rules">
          <li><b className="fig-mono">10</b> points a call, multiplied by your run: <b className="fig-mono">×2</b> at 3, <b className="fig-mono">×3</b> at 5, <b className="fig-mono">×5</b> at 10.</li>
          <li>Each call has its own clock, from <span className="fig-mono">5.0s</span> down to <span className="fig-mono">2.2s</span>.</li>
          <li>A miss or a timeout resets the run.</li>
        </ul>
        <p className="t-cap">Personal record: <span className="fig-mono c-fg">{best}</span></p>
        <AnimatePresence mode="wait">
          {phase === 'count' ? (
            <motion.span key={count} className="blitz-count fig-mono" initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={spring.snappy} aria-live="assertive">
              {count || 'Go'}
            </motion.span>
          ) : (
            <motion.button key="go" type="button" className="btn btn--primary btn--lg blitz-go" whileTap={{ scale: 0.96 }} onClick={start}>
              <Zap size={18} aria-hidden="true" /> Start the clock
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </Page>
  );
}
