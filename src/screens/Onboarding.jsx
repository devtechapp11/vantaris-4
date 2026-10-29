import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Briefcase, ChartLine, Landmark, Check } from 'lucide-react';
import { api } from '../lib/api';
import { timeZone } from '../lib/format';
import { useApp } from '../app/AppContext';
import { Spinner } from '../components/bits';
import Mascot from '../components/Mascot';

const GOALS = [
  { id: 'ib', label: 'Investment banking', detail: 'M&A, valuation, pitch work', Icon: Landmark },
  { id: 'pe', label: 'Private equity', detail: 'LBOs, returns, deal structuring', Icon: Briefcase },
  { id: 'consulting', label: 'Consulting or corporate finance', detail: 'Strategy and financial analysis', Icon: ChartLine },
  { id: 'self', label: 'Learning for myself', detail: 'Understand how deals work', Icon: BookOpen },
];

export default function Onboarding() {
  const id = useId();
  const navigate = useNavigate();
  const { me, setMe, showToast } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(me?.profile?.display_name && me.profile.display_name !== 'Analyst' ? me.profile.display_name : '');
  const [school, setSchool] = useState(me?.profile?.school ?? '');
  const [goal, setGoal] = useState(me?.profile?.goal ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.saveProfile({
        displayName: name.trim(), school: school.trim(), goal, timezone: timeZone(), completeOnboarding: true,
      });
      setMe(updated);
      showToast(`Welcome to the desk, ${updated.profile.display_name}`, 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <main className="screen screen--bare" style={{ minHeight: '100dvh', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}>
      <div className="between">
        <p className="t-foot">Step {step} of 2</p>
        <div className="row-8" aria-hidden="true">
          {[1, 2].map((s) => (
            <span key={s} style={{ width: 28, height: 4, borderRadius: 2, background: s <= step ? 'var(--accent)' : 'var(--surface-3)' }} />
          ))}
        </div>
      </div>

      <motion.div key={step} className="stack-16" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        {step === 1 ? (
          <>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <h1 className="t-large grow">What should we call you?</h1>
              <Mascot mood="idle" size={64} />
            </div>
            <form
              className="stack-16"
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return setError('Enter your first name.');
                setError(null);
                setStep(2);
              }}
            >
              <div className="field">
                <label htmlFor={`${id}-n`}>First name</label>
                <input id={`${id}-n`} className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={40} autoFocus />
              </div>
              <div className="field">
                <label htmlFor={`${id}-s`}>School <span className="c-3" style={{ fontWeight: 500 }}>(optional)</span></label>
                <input id={`${id}-s`} className="input" value={school} onChange={(e) => setSchool(e.target.value)} autoComplete="organization" maxLength={80} placeholder="e.g. LFIM Mumbai" />
                <span className="hint">Shown next to your name on the leaderboard.</span>
              </div>
              {error && <div className="alert" role="alert">{error}</div>}
              <button className="btn btn--accent">Continue</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="t-large">What are you aiming for?</h1>
            <p className="t-body" style={{ marginTop: -8 }}>We’ll start you on the problems that matter most for it.</p>
            <div className="stack-8" role="radiogroup" aria-label="Goal">
              {GOALS.map(({ id: gid, label, detail, Icon }) => {
                const on = goal === gid;
                return (
                  <button
                    key={gid} type="button" role="radio" aria-checked={on} onClick={() => setGoal(gid)}
                    className="option" aria-pressed={on}
                  >
                    <span className="option-key" style={{ border: 0, background: on ? 'var(--accent)' : 'var(--surface-2)', color: on ? 'var(--on-accent)' : 'var(--fg-2)', width: 40, height: 40, borderRadius: 12 }}>
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="grow">
                      <span className="t-headline" style={{ display: 'block' }}>{label}</span>
                      <span className="t-foot">{detail}</span>
                    </span>
                    {on && <Check size={20} className="c-accent" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {error && <div className="alert" role="alert">{error}</div>}
            <div className="stack-4">
              <button type="button" className="btn btn--accent" disabled={!goal || busy} onClick={finish}>
                {busy ? <Spinner /> : 'Start practicing'}
              </button>
              <button type="button" className="btn btn--plain" onClick={() => setStep(1)}>Back</button>
            </div>
          </>
        )}
      </motion.div>
    </main>
  );
}
