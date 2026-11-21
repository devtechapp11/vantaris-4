import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, BookOpen, Briefcase, ChartLine, Check, Landmark, Sprout, FileSpreadsheet, Calculator as CalcIcon, Handshake, X } from 'lucide-react';
import { api } from '../lib/api';
import { timeZone } from '../lib/format';
import { useApp } from '../app/AppContext';
import { haptic } from '../app/prefs';
import { Spinner } from '../components/bits';
import { RankGauge } from '../components/RankGauge';
import { SoundToggle } from '../components/Momentum';
import Logo from '../components/Logo';
import Mascot from '../components/Mascot';
import { sound } from '../lib/sound';
import { burst, originOf } from '../lib/celebrate';
import { step as stepVariants } from '../design/motion';
import { duration, ease, spring } from '../design/tokens';
import './Onboarding.css';
import { useMeta } from '../app/useMeta';

const GOALS = [
  { id: 'ib', label: 'Investment banking', detail: 'M&A, valuation, pitch work', Icon: Landmark },
  { id: 'pe', label: 'Private equity', detail: 'LBOs, returns, deal structuring', Icon: Briefcase },
  { id: 'consulting', label: 'Consulting or corporate finance', detail: 'Strategy and financial analysis', Icon: ChartLine },
  { id: 'self', label: 'Mastering it for myself', detail: 'How deals really get done', Icon: BookOpen },
];

// Calibration picks the first challenge; each question takes seconds and has one clean answer.
const LEVELS = [
  {
    id: 'new', label: 'New to finance', detail: 'I’m starting from zero', Icon: Sprout,
    q: { text: 'Revenue is $200M and total costs are $150M. What is the profit margin?', options: ['25%', '33%', '75%', '$50M'], answer: 0, why: 'Margin = profit ÷ revenue = $50M ÷ $200M = 25%.' },
  },
  {
    id: 'basics', label: 'I know the statements', detail: 'P&L, balance sheet, cash flow', Icon: FileSpreadsheet,
    q: { text: 'EBITDA is $40M and peers trade at 9.0x EV/EBITDA. What is the enterprise value?', options: ['$49M', '$360M', '$400M', '$4.4M'], answer: 1, why: 'EV = EBITDA × multiple = $40M × 9.0 = $360M.' },
  },
  {
    id: 'models', label: 'I’ve built models', detail: 'DCFs, comps, a first LBO', Icon: CalcIcon,
    q: { text: 'Sponsor equity grows from $100M to $250M over five years. What is the IRR?', options: ['15.0%', '20.1%', '25.0%', '30.0%'], answer: 1, why: 'MOIC 2.5x. IRR = 2.5^(1/5) − 1 = 20.1%.' },
  },
  {
    id: 'deals', label: 'I’ve worked on deals', detail: 'Live transactions', Icon: Handshake,
    q: { text: 'An acquirer at 20x P/E buys a target at 15x P/E, all in stock. Accretive or dilutive?', options: ['Accretive', 'Dilutive', 'Neutral', 'Can’t tell'], answer: 0, why: 'Paying with higher-multiple stock for lower-multiple earnings adds EPS: accretive.' },
  },
];

const STEPS = 4;
const LINES = [
  'I’m Vale. Two taps and you’re on the desk.',
  'Be honest. I’ll set your first deal at the right level.',
  'Your first call. The clock isn’t running yet.',
  'You’re in. The desk is open.',
];

export default function Onboarding() {
  useMeta({ title: 'Welcome' });
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { me, setMe, showToast } = useApp();
  const [[step, dir], setStep] = useState([0, 1]);
  const [goal, setGoal] = useState(me?.profile?.goal ?? null);
  const [level, setLevel] = useState(null);
  const [pick, setPick] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(0);
  const qRef = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (to) => {
    setError(null);
    setStep([to, to > step ? 1 : -1]);
  };
  // One tap answers and moves on, after a beat to see the selection land.
  const choose = (setter, value, next) => {
    setter(value);
    haptic(10);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next), reduce ? 0 : 380);
  };

  const q = LEVELS.find((l) => l.id === level)?.q;
  const answer = (i) => {
    if (pick != null) return;
    setPick(i);
    const right = i === q.answer;
    if (right) {
      sound.correct(1);
      haptic([12, 40, 18]);
      setTimeout(() => burst(originOf(qRef.current) ?? undefined), 120);
    } else {
      sound.wrong();
      haptic([24, 50, 24]);
    }
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      try { localStorage.setItem('vantaris-calibration', level ?? ''); } catch { /* optional */ }
      const updated = await api.saveProfile({ goal: goal ?? undefined, timezone: timeZone(), completeOnboarding: true });
      setMe(updated);
      haptic(18);
      showToast(`Welcome to the desk, ${updated.profile.display_name}`, 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const right = pick != null && pick === q?.answer;
  const mood = step === 0 ? 'welcome' : step === 1 ? 'idle' : step === 2 ? (pick == null ? 'think' : right ? 'correct' : 'wrong') : 'levelup';

  return (
    <motion.main className="onb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: duration.slow }}>
      <header className="onb-head">
        <Logo size={26} />
        <div className="onb-progress bar" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS}`}>
          <motion.i initial={false} animate={{ scaleX: (step + 1) / STEPS }} transition={{ duration: duration.slower, ease: ease.out }} />
        </div>
        <SoundToggle />
        {step < 3 && <button type="button" className="btn btn--ghost btn--sm btn--auto onb-skip" onClick={finish} disabled={busy}>Skip</button>}
      </header>

      <div className="onb-body">
        <aside className="onb-vale">
          <Mascot mood={mood} size={260} label="Vale" />
          <AnimatePresence mode="wait">
            <motion.p key={step} className="onb-bubble" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={spring.snappy}>
              {LINES[step]}
            </motion.p>
          </AnimatePresence>
        </aside>

        <section className="onb-card">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={step} custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" className="stack-24">
              {step === 0 && (
                <>
                  <header className="stack-8">
                    <p className="t-eyebrow">1 of 4 · Your target</p>
                    <h1 className="t-h1">Where are you headed?</h1>
                  </header>
                  <div className="goal-grid" role="radiogroup" aria-label="Goal">
                    {GOALS.map((g) => <Choice key={g.id} c={g} on={goal === g.id} onPick={() => choose(setGoal, g.id, 1)} />)}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <header className="stack-8">
                    <p className="t-eyebrow">2 of 4 · Calibration</p>
                    <h1 className="t-h1">Where are you today?</h1>
                  </header>
                  <div className="goal-grid" role="radiogroup" aria-label="Your level">
                    {LEVELS.map((l) => <Choice key={l.id} c={l} on={level === l.id} onPick={() => { setPick(null); choose(setLevel, l.id, 2); }} />)}
                  </div>
                  <BackLink onClick={() => go(0)} />
                </>
              )}
              {step === 2 && q && (
                <>
                  <header className="stack-8">
                    <p className="t-eyebrow">3 of 4 · First challenge</p>
                    <h1 className="t-h2">{q.text}</h1>
                  </header>
                  <div ref={qRef} className="onb-q" role="radiogroup" aria-label="Your answer">
                    {q.options.map((o, i) => {
                      const state = pick == null ? 'idle' : i === q.answer ? 'answer' : i === pick ? 'wrong' : 'dim';
                      return (
                        <motion.button
                          key={o} type="button" role="radio" aria-checked={pick === i}
                          className="option metal metal--live" data-state={state}
                          disabled={pick != null} onClick={() => answer(i)}
                          whileTap={{ scale: 0.97 }} transition={spring.snappy}
                        >
                          <span className="option-key">{state === 'answer' ? <Check size={15} strokeWidth={3} /> : state === 'wrong' ? <X size={15} strokeWidth={3} /> : 'ABCD'[i]}</span>
                          <span className="option-label fig-mono">{o}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <AnimatePresence>
                    {pick != null && (
                      <motion.div className={`onb-verdict ${right ? 'is-right' : 'is-miss'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.gentle}>
                        <p className="t-headline">{right ? 'Correct. That’s an analyst’s instinct.' : 'Close. Here’s the logic.'}</p>
                        <p className="t-callout fig">{q.why}</p>
                        <button type="button" className="btn btn--primary" onClick={() => go(3)} autoFocus>See my seat <ArrowRight size={18} aria-hidden="true" /></button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
              {step === 3 && (
                <>
                  <header className="stack-8">
                    <p className="t-eyebrow">4 of 4 · Rank assigned</p>
                    <motion.h1 className="t-h1" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.gentle, delay: 0.1 }}>
                      You start as <span className="text-chrome">Analyst</span>.
                    </motion.h1>
                    <p className="t-body">Every first-time correct answer earns points. 251 makes you Associate.</p>
                  </header>
                  <div className="onb-seat metal metal--pad metal--flash">
                    <RankGauge points={me?.profile?.points ?? 0} level={me?.profile?.level ?? 'Analyst'} />
                  </div>
                  {error && <div className="alert" role="alert">{error}</div>}
                  <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={finish}>
                    {busy ? <Spinner /> : <>Open my desk <ArrowRight size={18} aria-hidden="true" /></>}
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </motion.main>
  );
}

function BackLink({ onClick }) {
  return <button type="button" className="btn btn--ghost btn--auto onb-back" onClick={onClick}>Back</button>;
}

function Choice({ c, on, onPick }) {
  const { Icon } = c;
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={on}
      className={`goal metal metal--live ${on ? 'goal--on is-active' : ''}`}
      onClick={onPick}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
    >
      <span className="goal-art" aria-hidden="true"><Icon size={22} /></span>
      <span className="goal-text">
        <span className="t-headline">{c.label}</span>
        <span className="t-foot">{c.detail}</span>
      </span>
      <AnimatePresence>
        {on && (
          <motion.span className="goal-check" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={spring.bouncy}>
            <Check size={14} aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
