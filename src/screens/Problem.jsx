import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, ChevronDown, Lightbulb, Lock, Share2, Sigma, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { haptic } from '../app/prefs';
import { useMedia, BREAKPOINT } from '../app/useDevice';
import { LEVEL_TIER } from '../app/usePlans';
import { CountUp, NavBar, Page } from '../components/chrome';
import { DifficultyBadge, LoadBar, Skeleton, Spinner, TIER_LABEL, TierBadge } from '../components/bits';
import { ProgressBar } from '../components/ui';
import Calculator from '../components/Calculator';
import { FormulaBlock, highlight } from '../components/Formula';
import Mascot from '../components/Mascot';
import Tutor, { TutorFab } from './Tutor';
import { burst, originOf, shower } from '../lib/celebrate';
import { shareCard } from '../lib/shareCard';
import { termToToken } from '../lib/calc';
import { clock, isFigure, weekday } from '../lib/format';
import { shake } from '../design/motion';
import { duration, ease, spring } from '../design/tokens';
import { useSharedEnter } from '../app/fluid';
import './Problem.css';
import { track } from '../lib/analytics';
import { useMeta } from '../app/useMeta';

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
const STEPS = ['Brief', 'Terms', 'Answer', 'Review'];
const THINK_MS = 1100;

export default function Problem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me, setMe, openPaywall, showToast } = useApp();
  const desktop = useMedia(BREAKPOINT.desktop);
  const [data, setData] = useState(null);
  const [lock, setLock] = useState(null);
  const [error, setError] = useState(null);
  const [choice, setChoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState(null); // { result, level_up, fresh, before, after }
  const [termsSeen, setTermsSeen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorPrompt, setTutorPrompt] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [promotion, setPromotion] = useState(null);
  const calc = useRef(null);
  const titleRef = useRef(null);
  useMeta({ title: data?.problem?.title ?? 'Deal' });
  useSharedEnter(titleRef, `deal-${id}`, Boolean(data));
  const termsRef = useRef(null);
  const resultRef = useRef(null);

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
      else track('start_deal', { module: res.problem?.module_id ?? res.problem?.module });
      api.getMe().then(setMe, () => {});
    } catch (err) {
      if (err.code === 'QUOTA_REACHED' || err.code === 'LEVEL_LOCKED') setLock(err);
      else setError(err);
    }
  }, [id, setMe]);

  useEffect(() => {
    load();
  }, [load]);

  // "Terms" step completes once the deal terms have been on screen.
  useEffect(() => {
    const el = termsRef.current;
    if (!el || termsSeen || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setTermsSeen(true), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [data, termsSeen]);

  const answered = Boolean(outcome);
  const tutorAllowed = (me?.tier?.tutor_daily_limit ?? 0) > 0;
  const nextId = useMemo(() => me?.continue?.find((c) => c.id !== id)?.id ?? null, [me, id]);

  const submit = useCallback(async () => {
    if (!choice || submitting || answered) return;
    setSubmitting(true);
    const before = me?.profile?.points ?? 0;
    try {
      const res = await api.submitAnswer(id, choice);
      setMe(res.me);
      const fresh = !res.already_submitted;
      setOutcome({ result: res.result, level_up: res.level_up, fresh, before, after: res.me.profile.points });
      track('complete_deal', { correct: Boolean(res.result.correct) });
      haptic(res.result.correct ? [12, 40, 18] : [24, 50, 24]);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      if (fresh && res.result.correct) setTimeout(() => burst(originOf(resultRef.current?.querySelector('.score')) ?? undefined), 350);
      if (fresh && res.level_up) setTimeout(() => setPromotion(res.level_up), 1600);
    } catch (err) {
      if (err.code === 'LEVEL_LOCKED') setLock(err);
      else showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [choice, submitting, answered, me, id, setMe, showToast]);

  const pick = (optionId) => {
    if (answered) return;
    setChoice(optionId);
    haptic(6);
  };

  const openTutor = () => (tutorAllowed ? setTutorOpen(true) : openPaywall('tutor'));
  const askHint = () => {
    if (!tutorAllowed) return openPaywall('tutor');
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setTutorPrompt(answered ? 'Walk me through the trap in this one' : 'Give me a hint');
      setTutorOpen(true);
    }, THINK_MS);
    return undefined;
  };

  // Keyboard: A–F or 1–6 picks an answer, Enter submits.
  useEffect(() => {
    if (!data || answered) return undefined;
    const onKey = (e) => {
      if (e.target.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const opts = data.problem.options;
      const k = e.key.toUpperCase();
      const idx = KEYS.indexOf(k) >= 0 ? KEYS.indexOf(k) : /^[1-6]$/.test(k) ? Number(k) - 1 : -1;
      if (idx >= 0 && idx < opts.length) pick(opts[idx].id);
      else if (e.key === 'Enter' && choice) submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const share = async (kind = 'deal') => {
    const p = data.problem;
    const r = outcome?.result;
    try {
      const how = await shareCard({
        kind,
        title: kind === 'promotion' ? `${promotion ?? me.profile.level}` : p.title,
        subtitle: kind === 'promotion' ? 'New tier on Vantaris' : p.kind,
        points: kind === 'promotion' ? null : r?.points,
        level: me?.profile?.level,
        streak: me?.profile?.streak,
        name: me?.profile?.display_name,
        valeSvg: document.querySelector('.share-vale svg'),
      });
      if (how === 'downloaded') showToast('Share card saved. Post it to your story.', 'success');
    } catch {
      showToast('Couldn’t create the share card on this device.', 'error');
    }
  };

  if (lock) return <Locked lock={lock} />;
  if (error) {
    return (
      <>
        <NavBar back="Deals" to="/practice" />
        <Page className="screen screen--bare">
          <div className="card stack-12 center-x center">
            <Mascot mood="wrong" size={110} />
            <h1 className="t-h3">We couldn’t open this deal</h1>
            <p className="t-callout">{error.message}</p>
            <button type="button" className="btn btn--primary btn--md btn--auto" onClick={load}>Try again</button>
          </div>
        </Page>
      </>
    );
  }
  if (!data) return <ProblemSkeleton />;

  const p = data.problem;
  const step = answered ? 3 : choice ? 2 : termsSeen ? 1 : 0;

  return (
    <>
      <NavBar
        back="Deals"
        to="/practice"
        title={<Stepper step={step} />}
        right={answered ? <span className="chip chip--pos"><Check size={12} aria-hidden="true" /> Submitted</span> : <Timer openedAt={data.opened_at} minutes={p.minutes} offset={data.offset} />}
      />
      <Page wide className={`screen problem ${answered ? 'screen--bare' : 'screen--dock'}`}>
        <div className="prob-layout">
          <motion.section className="prob-brief stack-24" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out } } }}>
            <header className="stack-12">
              <div className="stack-8">
                <p className="t-eyebrow">{p.kind}</p>
                <h1 ref={titleRef} className="t-h1">{p.title}</h1>
                <p className="t-foot prob-meta">{p.module_name} · <DifficultyBadge value={p.difficulty} /> · <span className="fig">{p.minutes}</span> min</p>
              </div>
              <p className="t-lead c-fg prob-scenario">{p.scenario}</p>
            </header>

            <section ref={termsRef} className="terms" aria-label="Deal terms">
              <div className="terms-head">
                <span className="t-label c-fg">Deal terms</span>
                <span className="t-cap">{p.data.length} inputs · tap a figure to calculate</span>
              </div>
              <dl>
                {p.data.map(([label, value]) => {
                  const token = termToToken(value);
                  return (
                    <div key={label} className="terms-row">
                      <dt>{label}</dt>
                      <dd>
                        {token && !answered ? (
                          <button type="button" className="term-val fig" onClick={() => calc.current?.insert(token)} aria-label={`${label}: ${value}. Add to calculator`}>
                            {value}
                          </button>
                        ) : (
                          <span className="fig">{value}</span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            {desktop && !answered && <Calculator ref={calc} defaultOpen={false} />}
          </motion.section>

          <motion.section
            className={`prob-work ${answered ? '' : 'is-sticky'}`}
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out, delay: 0.08 } } }}
          >
            <div ref={resultRef} className="prob-anchor" />
            <AnimatePresence initial={false}>
              {answered && (
                <Result key="result" outcome={outcome} me={me} nextId={nextId} onNext={() => navigate(`/practice/${nextId}`)} onShare={() => share('deal')} onTutor={openTutor} />
              )}
            </AnimatePresence>

            <section className="question" aria-labelledby="q">
              <h2 id="q" className="t-title">{p.question}</h2>
              <div className="options" role={answered ? undefined : 'radiogroup'} aria-labelledby="q">
                {p.options.map((o, i) => (
                  <Option key={o.id} o={o} index={i} choice={choice} outcome={outcome} onPick={() => pick(o.id)} />
                ))}
              </div>
              {!answered && desktop && (
                <div className="question-actions">
                  <button type="button" className="btn btn--secondary btn--auto" onClick={askHint} disabled={thinking}>
                    <Lightbulb size={18} aria-hidden="true" /> Hint
                    {!tutorAllowed && <Lock size={12} aria-hidden="true" />}
                  </button>
                  <button type="button" className="btn btn--primary" disabled={!choice || submitting} onClick={submit}>
                    {submitting ? <Spinner /> : <>Submit answer <span className="kbd kbd--dark">↵</span></>}
                  </button>
                </div>
              )}
              {!answered && desktop && <p className="t-cap">Shortcuts: press A–{KEYS[p.options.length - 1]} to pick, Enter to submit.</p>}
            </section>

            {!desktop && !answered && <Calculator ref={calc} defaultOpen={false} />}
            {answered && <Breakdown result={outcome.result} onSteps={() => openPaywall('steps')} />}
            {answered && <Link to="/practice" className="btn btn--ghost">Back to deals</Link>}
          </motion.section>
        </div>
      </Page>

      {!answered && !desktop && (
        <div className="dock glass">
          <div className="dock-inner">
            <button type="button" className="btn btn--secondary btn--icon" onClick={askHint} disabled={thinking} aria-label={tutorAllowed ? 'Get a hint from Vale' : 'Hints from Vale come with Pro'}>
              <Lightbulb size={20} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn--primary" disabled={!choice || submitting} onClick={submit}>
              {submitting ? <Spinner /> : 'Submit answer'}
            </button>
          </div>
        </div>
      )}

      <ValeThinking show={thinking} />
      <TutorFab onClick={openTutor} locked={!tutorAllowed} hidden={tutorOpen || thinking || (!answered && !desktop)} />
      {tutorAllowed && (
        <Tutor open={tutorOpen} onClose={() => setTutorOpen(false)} problem={p} submitted={answered} prompt={tutorPrompt} onPromptUsed={() => setTutorPrompt(null)} />
      )}
      <Promotion level={promotion} onClose={() => setPromotion(null)} onShare={() => share('promotion')} />
    </>
  );
}

/* ---------- Pieces ---------- */
function Stepper({ step }) {
  return (
    <ol className="stepper" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
      {STEPS.map((s, i) => (
        <li key={s} className={i < step ? 'is-done' : i === step ? 'is-now' : ''}>
          <span className="stepper-dot">
            {i < step ? <Check size={11} strokeWidth={3.4} aria-hidden="true" /> : null}
            {i === step && <motion.span layoutId="step-now" className="stepper-now" transition={spring.snappy} />}
          </span>
          <span className="stepper-label">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Timer({ openedAt, minutes, offset }) {
  const total = minutes * 60;
  const calc = () => total - (Date.now() - offset - Date.parse(openedAt)) / 1000;
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setLeft(calc()), 250);
    return () => clearInterval(t);
  });
  const over = left <= 0;
  const low = !over && left < 60;
  const r = 13;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, left / total));
  return (
    <span className={`timer ${over ? 'timer--over' : low ? 'timer--low' : ''}`} role="timer" aria-label={over ? 'Speed bonus ended' : `${clock(left)} left for the speed bonus`}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r={r} className="timer-track" />
        <circle cx="16" cy="16" r={r} className="timer-fill" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span className="fig">{over ? 'No bonus' : clock(left)}</span>
    </span>
  );
}

function Option({ o, index, choice, outcome, onPick }) {
  const reduce = useReducedMotion();
  const r = outcome?.result;
  const answered = Boolean(r);
  const isAnswer = r && o.id === r.answer;
  const isWrongPick = r && o.id === r.choice && !r.correct;
  const selected = !answered && choice === o.id;
  const state = isAnswer ? 'answer' : isWrongPick ? 'wrong' : answered ? 'dim' : selected ? 'selected' : 'idle';
  return (
    <motion.button
      type="button"
      role={answered ? undefined : 'radio'}
      aria-checked={answered ? undefined : selected}
      disabled={answered}
      className="option"
      data-state={state}
      onClick={onPick}
      animate={outcome?.fresh && isWrongPick && !reduce ? shake : undefined}
      whileTap={answered ? undefined : { scale: 0.985 }}
    >
      <span className="option-key">
        {isAnswer ? <Check size={15} strokeWidth={3} /> : isWrongPick ? <X size={15} strokeWidth={3} /> : KEYS[index]}
      </span>
      <span className={`option-label ${isFigure(o.label) ? 'fig' : ''}`}>{o.label}</span>
      {isAnswer && <span className="chip chip--pos option-tag">Answer</span>}
      {isWrongPick && <span className="chip chip--neg option-tag">Your pick</span>}
    </motion.button>
  );
}

function ValeThinking({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="vale-thinking glass"
          role="status"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={spring.bouncy}
        >
          <Mascot mood="think" size={88} label="Vale is thinking" />
          <div className="stack-4">
            <span className="t-headline">Vale is thinking…</span>
            <span className="typing typing--inline" aria-hidden="true">
              {[0, 1, 2].map((i) => <motion.i key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14 }} />)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Result ---------- */
function Result({ outcome, me, nextId, onNext, onShare, onTutor }) {
  const r = outcome.result;
  const fresh = outcome.fresh;
  const reduce = useReducedMotion();
  const profile = me?.profile;
  const span = profile?.next_level_at != null ? profile.next_level_at - profile.level_floor : null;
  const from = span && outcome.before != null ? Math.max(0, (outcome.before - profile.level_floor) / span) : 0;
  const to = span ? (profile.points - profile.level_floor) / span : 1;
  return (
    <motion.section
      className={`result ${r.correct ? 'result--win' : 'result--miss'}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring.gentle }}
      aria-live="polite"
    >
      <div className="result-top">
        <div className="result-vale share-vale"><Mascot mood={r.correct ? 'correct' : 'wrong'} size={124} label={r.correct ? 'Vale nods approvingly' : 'Vale, encouraging you to try again'} /></div>
        <div className="stack-8 grow">
          <span className="t-eyebrow">{r.correct ? 'Deal closed' : 'Not quite'}</span>
          {r.correct ? (
            r.points > 0 ? (
              <motion.div className="score" initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring.bouncy, delay: 0.15 }}>
                <span className="score-plus">+</span>
                <CountUp to={r.points} duration={fresh ? 1.4 : 0} delay={0.25} className="fig score-num" />
                <span className="score-unit">pts</span>
              </motion.div>
            ) : (
              <p className="t-h3">Already solved, no new points</p>
            )
          ) : (
            <p className="t-h3">The answer is <span className="fig c-pos">{r.answer_label}</span></p>
          )}
          {r.correct && r.points > 0 && r.time_ratio > 0 && <span className="chip chip--strong">Speed bonus +{Math.round(r.time_ratio * 50)}%</span>}
          {!r.correct && <p className="t-callout">Even senior analysts miss this one. Here’s how it works, step by step.</p>}
        </div>
      </div>

      {r.correct && fresh && r.points > 0 && profile && (
        <div className="stack-8 result-xp">
          <div className="between">
            <span className="t-label"><TierBadge level={profile.level} /></span>
            <span className="t-cap fig">{profile.points} / {profile.next_level_at ?? '—'} pts{profile.next_level ? ` to ${profile.next_level}` : ''}</span>
          </div>
          <ProgressBar value={to} from={from} size="sm" delay={0.6} label="Progress to the next tier" />
        </div>
      )}

      <div className="result-actions">
        {nextId && (
          <button type="button" className="btn btn--primary" onClick={onNext}>
            Next deal <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
        {r.correct && r.points > 0 && (
          <button type="button" className="btn btn--secondary btn--auto" onClick={onShare}><Share2 size={17} aria-hidden="true" /> Share</button>
        )}
        <button type="button" className="btn btn--secondary btn--auto" onClick={onTutor}><Sparkles size={17} aria-hidden="true" /> Ask Vale</button>
      </div>
    </motion.section>
  );
}

function Breakdown({ result: r, onSteps }) {
  return (
    <section className="breakdown stack-8" aria-label="Solution">
      <Accordion title="Step-by-step solution" icon={<Sigma size={17} aria-hidden="true" />} meta={`${r.steps_total} steps`}>
        <ol className="steps">
          {r.steps.map(([label, text], i) => (
            <motion.li key={label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08, duration: duration.base }}>
              <span className="step-n fig">{i + 1}</span>
              <span className="stack-4 grow">
                <span className="t-label c-fg">{label}</span>
                <span className="fig step-text">{highlight(text)}</span>
              </span>
            </motion.li>
          ))}
        </ol>
        {r.steps_locked && (
          <div className="stack-12">
            <div aria-hidden="true" className="steps-locked">
              {Array.from({ length: Math.min(3, r.steps_total - r.steps.length) }, (_, i) => (
                <div key={i} className="row"><span className="step-n">·</span><span className="grow skeleton" style={{ height: 34 }} /></div>
              ))}
            </div>
            <button type="button" className="btn btn--secondary btn--md" onClick={onSteps}>
              <Lock size={16} aria-hidden="true" /> See all {r.steps_total} steps with Core
            </button>
          </div>
        )}
      </Accordion>
      <Accordion title="Why it matters" icon={<Lightbulb size={17} aria-hidden="true" />}>
        <p className="t-callout">{r.concept}</p>
      </Accordion>
      <Accordion title="The formula" icon={<span className="tk-op fig" aria-hidden="true">ƒ</span>}>
        <FormulaBlock text={r.formula} />
      </Accordion>
    </section>
  );
}

function Accordion({ title, icon, meta, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`acc ${open ? 'is-open' : ''}`}>
      <button type="button" className="acc-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {icon}
        <span className="t-headline grow">{title}</span>
        {meta && <span className="t-cap">{meta}</span>}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy}><ChevronDown size={18} aria-hidden="true" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring.snappy} style={{ overflow: 'hidden' }}>
            <div className="acc-body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Promotion ---------- */
function Promotion({ level, onClose, onShare }) {
  useEffect(() => {
    if (!level) return undefined;
    shower();
    haptic([20, 60, 20, 60, 40]);
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [level, onClose]);
  return (
    <AnimatePresence>
      {level && (
        <motion.div className="promo" role="dialog" aria-modal="true" aria-labelledby="promo-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="promo-card glass" data-tier={level} initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={spring.gentle}>
            <div className="promo-mascot share-vale"><Mascot mood="levelup" size={200} decorative /></div>
            <p className="t-eyebrow">Promoted</p>
            <h2 id="promo-title" className="t-h1">You’re now {level === 'Associate' ? 'an' : 'a'} {level}.</h2>
            <p className="t-body">New modules are open to you on the right plan, and your tier shows on the leaderboard.</p>
            <div className="row-8 wrap" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn--secondary btn--auto" onClick={onShare}><Share2 size={17} aria-hidden="true" /> Share</button>
              <button type="button" className="btn btn--primary btn--auto" onClick={onClose} autoFocus>Keep climbing <ArrowRight size={17} aria-hidden="true" /></button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Locked & loading ---------- */
function Locked({ lock }) {
  const { me } = useApp();
  const navigate = useNavigate();
  const isQuota = lock.code === 'QUOTA_REACHED';
  const tier = TIER_LABEL[LEVEL_TIER[lock.detail]] ?? 'a paid plan';
  return (
    <>
      <NavBar back="Deals" to="/practice" />
      <Page className="screen screen--bare">
        <div className="card stack-16 center center-x locked-card">
          <Mascot mood="think" size={150} />
          <span className="pstat pstat--locked" style={{ width: 44, height: 44 }}><Lock size={20} /></span>
          <h1 className="t-h2">{isQuota ? 'You’ve used this week’s free deals' : `This module is part of ${tier}`}</h1>
          <p className="t-body" style={{ maxWidth: 400 }}>
            {isQuota
              ? `Your free deals come back on ${me?.quota?.resets_at ? weekday(me.quota.resets_at) : 'Monday'}. Go unlimited to keep your streak alive today.`
              : 'Unlock harder modules and the deals interviewers actually ask about.'}
          </p>
          <button type="button" className="btn btn--primary" onClick={() => navigate('/plans', { state: { highlight: isQuota ? 'core' : LEVEL_TIER[lock.detail] } })}>
            See plans
          </button>
          <Link to="/practice" className="btn btn--ghost">Back to practice</Link>
        </div>
      </Page>
    </>
  );
}

function ProblemSkeleton() {
  return (
    <>
      <LoadBar />
      <NavBar back="Deals" to="/practice" />
      <Page wide className="screen problem">
        <div className="prob-layout">
          <div className="stack-16">
            <Skeleton height={26} width={260} /><Skeleton height={44} width="70%" /><Skeleton height={90} /><Skeleton height={260} />
          </div>
          <div className="stack-16"><Skeleton height={340} /></div>
        </div>
      </Page>
    </>
  );
}
