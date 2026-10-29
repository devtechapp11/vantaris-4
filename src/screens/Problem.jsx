import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Clock, Lock, Sigma, Sparkles, Lightbulb, X, ArrowRight, Trophy } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { CountUp, NavBar, Page } from '../components/chrome';
import { Dots, LevelBadge, Skeleton, Spinner, TIER_LABEL } from '../components/bits';
import Mascot from '../components/Mascot';
import Tutor from './Tutor';
import { clock, isFigure, weekday } from '../lib/format';
import { LEVEL_TIER } from '../app/usePlans';

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function Problem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me, setMe, openPaywall, showToast } = useApp();
  const [data, setData] = useState(null);
  const [lock, setLock] = useState(null);
  const [error, setError] = useState(null);
  const [choice, setChoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState(null); // { result, level_up, fresh }
  const [tutorOpen, setTutorOpen] = useState(false);

  const load = useCallback(async () => {
    setData(null);
    setLock(null);
    setError(null);
    setOutcome(null);
    setChoice(null);
    try {
      const res = await api.openProblem(id);
      // Clock offset so the timer follows the server's start time, not the phone's clock.
      setData({ ...res, offset: Date.now() - Date.parse(res.server_now) });
      if (res.result) setOutcome({ result: res.result, fresh: false });
      api.getMe().then(setMe, () => {});
    } catch (err) {
      if (err.code === 'QUOTA_REACHED' || err.code === 'LEVEL_LOCKED') setLock(err);
      else setError(err);
    }
  }, [id, setMe]);

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [load]);

  const submit = async () => {
    if (!choice || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.submitAnswer(id, choice);
      setMe(res.me);
      setOutcome({ result: res.result, level_up: res.level_up, fresh: !res.already_submitted });
      navigator.vibrate?.(res.result.correct ? 18 : [24, 40, 24]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.code === 'LEVEL_LOCKED') setLock(err);
      else showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const nextId = useMemo(() => me?.continue?.find((c) => c.id !== id)?.id ?? null, [me, id]);
  const tutorAllowed = (me?.tier?.tutor_daily_limit ?? 0) > 0;
  const openTutor = () => (tutorAllowed ? setTutorOpen(true) : openPaywall('tutor'));

  if (lock) return <Locked lock={lock} />;
  if (error) {
    return (
      <>
        <NavBar back="Practice" to="/practice" />
        <Page className="screen screen--bare" pushed>
          <div className="card stack-12">
            <h1 className="t-title-2">We couldn’t open this problem</h1>
            <p className="t-callout">{error.message}</p>
            <button type="button" className="btn btn--accent btn--md" onClick={load}>Try again</button>
          </div>
        </Page>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <NavBar back="Practice" to="/practice" />
        <Page className="screen screen--bare" pushed>
          <Skeleton height={30} style={{ width: 180 }} /><Skeleton height={44} /><Skeleton height={90} /><Skeleton height={220} /><Skeleton height={260} />
        </Page>
      </>
    );
  }

  const p = data.problem;
  const answered = Boolean(outcome);

  return (
    <>
      <NavBar
        back="Practice"
        to="/practice"
        title={answered ? null : <Timer openedAt={data.opened_at} minutes={p.minutes} offset={data.offset} />}
        right={
          <button type="button" className="icon-btn icon-btn--plain" onClick={openTutor} aria-label={tutorAllowed ? 'Ask the tutor' : 'AI tutor, available with Pro'}>
            <Sparkles size={22} aria-hidden="true" />
            {!tutorAllowed && <Lock size={11} style={{ position: 'absolute', right: 6, bottom: 8 }} aria-hidden="true" />}
          </button>
        }
      />
      <Page className={`screen ${answered ? 'screen--bare' : 'screen--sticky-cta'}`} pushed>
        <AnimatePresence mode="wait" initial={false}>
          {answered && (
            <Result key="result" outcome={outcome} onSteps={() => openPaywall('steps')} />
          )}
        </AnimatePresence>

        <header className="stack-8" style={{ paddingTop: 4 }}>
          <div className="row-8 wrap">
            <span className="chip">{p.module_name}</span>
            <LevelBadge level={p.level} />
            <span className="row-8 t-foot" style={{ marginLeft: 'auto' }}><Dots value={p.difficulty} /> <span className="fig">{p.minutes} min</span></span>
          </div>
          <h1 className="t-title">{p.title}</h1>
          <p className="t-foot" style={{ marginTop: -2 }}>{p.kind}</p>
          <p className="t-body c-fg" style={{ marginTop: 4 }}>{p.scenario}</p>
        </header>

        <section className="terms" aria-label="Deal terms">
          <div className="terms-head">
            <span className="t-label">Deal terms</span>
            <span className="t-cap">{p.data.length} inputs</span>
          </div>
          <dl style={{ margin: 0 }}>
            {p.data.map(([label, value]) => (
              <div key={label} className="terms-row"><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </section>

        <section className="stack-12" aria-labelledby="q">
          <h2 id="q" className="t-headline" style={{ fontSize: 19 }}>{p.question}</h2>
          <div className="stack-8" role={answered ? undefined : 'radiogroup'} aria-labelledby="q">
            {p.options.map((o, i) => {
              const r = outcome?.result;
              const isAnswer = r && o.id === r.answer;
              const isWrongPick = r && o.id === r.choice && !r.correct;
              return (
                <button
                  key={o.id}
                  type="button"
                  role={answered ? undefined : 'radio'}
                  aria-checked={answered ? undefined : choice === o.id}
                  aria-pressed={!answered && choice === o.id}
                  disabled={answered}
                  className="option"
                  onClick={() => setChoice(o.id)}
                  style={answered ? {
                    cursor: 'default',
                    borderColor: isAnswer ? 'var(--pos)' : isWrongPick ? 'var(--neg)' : 'transparent',
                    background: isAnswer ? 'var(--pos-soft)' : isWrongPick ? 'var(--neg-soft)' : undefined,
                    opacity: isAnswer || isWrongPick ? 1 : 0.6,
                  } : undefined}
                >
                  <span className="option-key" style={answered && (isAnswer || isWrongPick) ? {
                    background: isAnswer ? 'var(--pos)' : 'var(--neg)', borderColor: 'transparent', color: 'var(--on-accent)',
                  } : undefined}>
                    {answered && isAnswer ? <Check size={15} strokeWidth={3} /> : answered && isWrongPick ? <X size={15} strokeWidth={3} /> : KEYS[i]}
                  </span>
                  <span className={`option-label ${isFigure(o.label) ? '' : 'option-label--text'}`}>{o.label}</span>
                  {answered && isAnswer && <span className="chip chip--pos" style={{ marginLeft: 'auto' }}>Answer</span>}
                  {answered && isWrongPick && <span className="chip chip--neg" style={{ marginLeft: 'auto' }}>Your pick</span>}
                </button>
              );
            })}
          </div>
        </section>

        {answered ? (
          <div className="stack-8">
            {nextId && (
              <button type="button" className="btn btn--accent" onClick={() => navigate(`/practice/${nextId}`)}>
                Next problem <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
            <button type="button" className="btn btn--tonal" onClick={openTutor}>
              <Sparkles size={18} aria-hidden="true" /> Talk it through with the tutor
            </button>
            <Link to="/practice" className="btn btn--plain">Back to practice</Link>
          </div>
        ) : (
          <div className="dock">
            <div className="dock-inner">
              <button type="button" className="btn btn--gray" style={{ width: 56, flex: 'none' }} onClick={openTutor} aria-label="Get a hint from the tutor">
                <Lightbulb size={20} aria-hidden="true" />
              </button>
              <button type="button" className="btn btn--accent" disabled={!choice || submitting} onClick={submit}>
                {submitting ? <Spinner /> : 'Submit answer'}
              </button>
            </div>
          </div>
        )}
      </Page>
      {tutorAllowed && (
        <Tutor open={tutorOpen} onClose={() => setTutorOpen(false)} problem={p} submitted={answered} />
      )}
    </>
  );
}

function Timer({ openedAt, minutes, offset }) {
  const total = minutes * 60;
  const calc = () => total - ((Date.now() - offset) - Date.parse(openedAt)) / 1000;
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setLeft(calc()), 500);
    return () => clearInterval(t);
  });
  const over = left <= 0;
  const low = !over && left < 60;
  return (
    <span className={`timer ${over ? 'timer--over' : low ? 'timer--low' : ''}`} role="timer" aria-label={over ? 'Speed bonus ended' : `${clock(left)} left for the speed bonus`}>
      <Clock size={14} aria-hidden="true" />
      {over ? 'No bonus' : clock(left)}
    </span>
  );
}

function Result({ outcome, onSteps }) {
  const reduce = useReducedMotion();
  const r = outcome.result;
  const mood = !outcome.fresh ? 'idle' : r.correct ? 'cheer' : 'sad';
  return (
    <motion.section
      className="stack-16"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-live="polite"
    >
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, background: r.correct ? 'var(--pos-soft)' : 'var(--neg-soft)', boxShadow: 'none' }}>
        <Mascot mood={mood} size={84} />
        <div className="grow stack-4">
          <h2 className="t-title" style={{ color: r.correct ? 'var(--pos)' : 'var(--neg)' }}>
            {r.correct ? 'Correct' : 'Not quite'}
          </h2>
          {r.correct ? (
            <p className="t-headline">
              {r.points > 0 ? (
                <>+<CountUp to={r.points} /> points{r.time_ratio > 0 ? <span className="t-foot"> · {Math.round(r.time_ratio * 50)}% speed bonus</span> : null}</>
              ) : 'Already solved, no new points'}
            </p>
          ) : (
            <p className="t-headline">The answer is <span className="fig">{r.answer_label}</span></p>
          )}
        </div>
      </div>

      {outcome.level_up && (
        <motion.div
          className="card row" style={{ background: 'var(--brass-soft)', boxShadow: 'none' }}
          initial={reduce ? false : { scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.3 }}
        >
          <Trophy size={26} className="c-brass" aria-hidden="true" />
          <div className="grow">
            <div className="t-headline" style={{ color: 'var(--brass-ink)' }}>You reached {outcome.level_up}</div>
            <div className="t-foot">Your new level shows on the leaderboard.</div>
          </div>
        </motion.div>
      )}

      <section className="card stack-12" aria-labelledby="how">
        <h3 id="how" className="t-headline row-8"><Sigma size={18} className="c-accent" aria-hidden="true" /> How to solve it</h3>
        <ol className="stack-12" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {r.steps.map(([label, text], i) => (
            <li key={label} className="row" style={{ alignItems: 'flex-start' }}>
              <span className="fig" style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{i + 1}</span>
              <span className="grow">
                <span className="t-label c-fg" style={{ display: 'block' }}>{label}</span>
                <span className="fig" style={{ fontSize: 14.5, color: 'var(--fg-2)', lineHeight: 1.5 }}>{text}</span>
              </span>
            </li>
          ))}
        </ol>
        {r.steps_locked && (
          <div className="stack-12">
            <div aria-hidden="true" className="stack-8" style={{ filter: 'blur(5px)', opacity: 0.7, userSelect: 'none' }}>
              {Array.from({ length: Math.min(3, r.steps_total - r.steps.length) }, (_, i) => (
                <div key={i} className="row"><span className="pstat pstat--new" /><span className="grow skeleton" style={{ height: 34, animation: 'none' }} /></div>
              ))}
            </div>
            <button type="button" className="btn btn--tonal btn--md" onClick={onSteps}>
              <Lock size={16} aria-hidden="true" /> See all {r.steps_total} steps with Core
            </button>
          </div>
        )}
      </section>

      <section className="card stack-8" aria-labelledby="why">
        <h3 id="why" className="t-headline">Why it matters</h3>
        <p className="t-callout">{r.concept}</p>
        <div className="fig" style={{ marginTop: 6, padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', fontSize: 14, lineHeight: 1.5, overflowX: 'auto' }}>
          {r.formula}
        </div>
      </section>
    </motion.section>
  );
}

function Locked({ lock }) {
  const { me } = useApp();
  const navigate = useNavigate();
  const isQuota = lock.code === 'QUOTA_REACHED';
  const tier = TIER_LABEL[LEVEL_TIER[lock.detail]] ?? 'a paid plan';
  return (
    <>
      <NavBar back="Practice" to="/practice" />
      <Page className="screen screen--bare" pushed>
        <div className="stack-16 center" style={{ alignItems: 'center', paddingTop: 40 }}>
          <Mascot mood="think" size={120} />
          <h1 className="t-title">{isQuota ? "You've used this week's free problems" : `This module is part of ${tier}`}</h1>
          <p className="t-body" style={{ maxWidth: 380 }}>
            {isQuota
              ? `Your free problems come back on ${me?.quota?.resets_at ? weekday(me.quota.resets_at) : 'Monday'}. Go unlimited to keep your streak going today.`
              : 'Unlock harder modules and the deals interviewers actually ask about.'}
          </p>
          <div className="stack-8" style={{ width: '100%' }}>
            <button type="button" className="btn btn--accent" onClick={() => navigate('/plans', { state: { highlight: isQuota ? 'core' : LEVEL_TIER[lock.detail] } })}>
              See plans
            </button>
            <Link to="/practice" className="btn btn--plain">Back to practice</Link>
          </div>
        </div>
      </Page>
    </>
  );
}
