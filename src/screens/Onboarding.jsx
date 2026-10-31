import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, Briefcase, ChartLine, Check, Landmark } from 'lucide-react';
import { api } from '../lib/api';
import { timeZone } from '../lib/format';
import { useApp } from '../app/AppContext';
import { haptic } from '../app/prefs';
import { Spinner, TierBadge } from '../components/bits';
import { FloatingField } from '../components/ui';
import Logo from '../components/Logo';
import Mascot from '../components/Mascot';
import { step as stepVariants } from '../design/motion';
import { duration, ease, spring } from '../design/tokens';
import './Onboarding.css';
import { useMeta } from '../app/useMeta';

const GOALS = [
  { id: 'ib', label: 'Investment banking', detail: 'M&A, valuation, pitch work', Icon: Landmark, tier: 'Analyst' },
  { id: 'pe', label: 'Private equity', detail: 'LBOs, returns, deal structuring', Icon: Briefcase, tier: 'VP' },
  { id: 'consulting', label: 'Consulting or corporate finance', detail: 'Strategy and financial analysis', Icon: ChartLine, tier: 'Associate' },
  { id: 'self', label: 'Learning for myself', detail: 'Understand how deals work', Icon: BookOpen, tier: 'MD' },
];

const STEPS = 3;

export default function Onboarding() {
  useMeta({ title: 'Welcome' });
  const navigate = useNavigate();
  const { me, setMe, showToast } = useApp();
  const [[step, dir], setStep] = useState([0, 1]);
  const [name, setName] = useState(me?.profile?.display_name && me.profile.display_name !== 'Analyst' ? me.profile.display_name : '');
  const [school, setSchool] = useState(me?.profile?.school ?? '');
  const [goal, setGoal] = useState(me?.profile?.goal ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const go = (to) => {
    setError(null);
    setStep([to, to > step ? 1 : -1]);
  };

  // Every answer is optional: skipping keeps the name from sign-up and leaves the rest empty.
  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.saveProfile({ displayName: name.trim() || undefined, school: school.trim() || undefined, goal: goal ?? undefined, timezone: timeZone(), completeOnboarding: true });
      setMe(updated);
      haptic(18);
      showToast(`Welcome to the desk, ${updated.profile.display_name}`, 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const mood = step === 0 ? 'welcome' : step === 1 ? 'idle' : goal ? 'correct' : 'think';
  const line = [
    'I’m Vale. I’ll be on your desk for every deal: hints when you’re stuck, the why behind every step.',
    'Let me start your file. What should the desk call you?',
    goal ? 'Good choice. I’ll start you on the deals that matter most for it.' : 'Where are you headed? I’ll line up the right deals.',
  ][step];

  return (
    <motion.main className="onb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: duration.slow }}>
      <header className="onb-head">
        <Logo size={26} />
        <div className="onb-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS}`}>
          <motion.i animate={{ scaleX: (step + 1) / STEPS }} transition={{ duration: duration.slower, ease: ease.out }} />
        </div>
        <button type="button" className="btn btn--ghost btn--sm btn--auto onb-skip" onClick={finish} disabled={busy}>Skip</button>
      </header>

      <div className="onb-body">
        <aside className="onb-vale">
          <Mascot mood={mood} size={260} label="Vale" />
          <AnimatePresence mode="wait">
            <motion.p key={line} className="onb-bubble" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={spring.snappy}>
              {line}
            </motion.p>
          </AnimatePresence>
        </aside>

        <section className="onb-card">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={step} custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" className="stack-24">
              {step === 0 && (
                <>
                  <header className="stack-8">
                    <p className="t-eyebrow">Welcome to Vantaris</p>
                    <h1 className="t-h1">Your career starts at Analyst.</h1>
                    <p className="t-body">Solve deals, earn points, get promoted. Four tiers stand between you and MD.</p>
                  </header>
                  <ol className="onb-ladder">
                    {['Analyst', 'Associate', 'VP', 'MD'].map((l, i) => (
                      <motion.li key={l} data-tier={l} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08, ...spring.gentle }}>
                        <TierBadge level={l} />
                        <span className="t-cap fig">{[0, 251, 501, 751][i]} pts</span>
                      </motion.li>
                    ))}
                  </ol>
                  <button type="button" className="btn btn--primary" onClick={() => go(1)}>Let’s go <ArrowRight size={18} aria-hidden="true" /></button>
                </>
              )}
              {step === 1 && (
                <form
                  className="stack-24"
                  onSubmit={(e) => {
                    e.preventDefault();
                    go(2);
                  }}
                >
                  <header className="stack-8">
                    <p className="t-eyebrow">Your file</p>
                    <h1 className="t-h1">What should we call you?</h1>
                  </header>
                  <div className="stack-16">
                    <FloatingField label="First name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={40} />
                    <FloatingField label="School (optional)" placeholder="Your school" value={school} onChange={(e) => setSchool(e.target.value)} autoComplete="organization" maxLength={80} hint="Shown next to your name on the leaderboard. Leave it empty to hide it." />
                  </div>
                  {error && <div className="alert" role="alert">{error}</div>}
                  <div className="onb-actions">
                    <button type="button" className="btn btn--secondary btn--icon" onClick={() => go(0)} aria-label="Back"><ArrowLeft size={18} /></button>
                    <button className="btn btn--primary">Continue <ArrowRight size={18} aria-hidden="true" /></button>
                  </div>
                </form>
              )}
              {step === 2 && (
                <>
                  <header className="stack-8">
                    <p className="t-eyebrow">Your goal</p>
                    <h1 className="t-h1">What are you aiming for?</h1>
                  </header>
                  <div className="goal-grid" role="radiogroup" aria-label="Goal">
                    {GOALS.map((g) => (
                      <GoalCard key={g.id} g={g} on={goal === g.id} onPick={() => { setGoal(g.id); haptic(10); }} />
                    ))}
                  </div>
                  {error && <div className="alert" role="alert">{error}</div>}
                  <div className="onb-actions">
                    <button type="button" className="btn btn--secondary btn--icon" onClick={() => go(1)} aria-label="Back"><ArrowLeft size={18} /></button>
                    <button type="button" className="btn btn--primary" disabled={busy} onClick={finish}>
                      {busy ? <Spinner /> : <>Start practicing <ArrowRight size={18} aria-hidden="true" /></>}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </motion.main>
  );
}

function GoalCard({ g, on, onPick }) {
  const { Icon } = g;
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={on}
      className={`goal ${on ? 'goal--on' : ''}`}
      data-tier={g.tier}
      onClick={onPick}
      whileTap={{ scale: 0.98 }}
      transition={spring.bouncy}
    >
      <span className="goal-art" aria-hidden="true"><Icon size={22} /></span>
      <span className="goal-text">
        <span className="t-headline">{g.label}</span>
        <span className="t-foot">{g.detail}</span>
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
