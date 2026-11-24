import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Lightbulb, Repeat2, X } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { api } from '../lib/api';
import { sfx, comboOf } from '../lib/sfx/engine';
import { haptics, HAPTIC } from '../lib/haptics';
import { fieldBus } from '../fx/field/fieldBus';
import { metalBurst } from '../fx/MetalBurst';
import { CHAPTERS, chapterOf, chapterOfConcept, starsFor } from '../content/path';
import { LESSONS, TEMPLATES, answerText, grade, makeQuestion } from '../content/lessons';
import { drawPairs } from '../content/pairs';
import { finQuestion } from '../lib/finance/toQuestion';
import { templatesFor } from '../lib/finance/templates';
import DealBriefCard from '../pedagogy/DealBriefCard';
import { SoundToggle } from '../components/Momentum';
import SoundBars from '../landing/hud/SoundBars';
import MetalPlate from '../components/fx/MetalPlate';
import Vale from '../components/vale/Vale';
import { valeBus } from '../components/vale/valeBus';
import { isLocked } from '../lib/modules';
import { springs } from '../motion/springs';
import { useMeta } from '../app/useMeta';
import { IS_DEMO } from '../lib/config';
import { clearSession, markSession } from '../path/store';
import { XP_SESSION_CAP, XP_STREAK_BONUS, xpForAnswer } from '../exercise/xp';
import Results from '../exercise/Results';
import PairsQ from '../exercise/PairsQ';
import './Learn.css';
import '../exercise/exercise.css';

const seed = () => Math.floor(Math.random() * 2 ** 31);
let uid = 0;
const item = (tid, original, extra = {}) => ({ key: `q${(uid += 1)}`, tid, seed: seed(), original, ...extra });
const finItem = (template, difficulty = 2) => ({ key: `q${(uid += 1)}`, tid: template, seed: seed(), original: true, fin: template, difficulty });
const pairsItem = (chapter) => ({ key: `q${(uid += 1)}`, tid: `${chapter}.pairs`, seed: seed(), original: false, pairs: chapter, warmup: true });

/**
 * The questions for a chapter, for today's review of fragile notions, for a
 * retry of this session's mistakes, or for an infinite drill. Chapters and
 * drills open with a Rapid Pair Match warm-up (not counted for stars), then
 * six questions ordered intuition → structure → deal case.
 */
function plan(node, me, state) {
  if (node === 'review') {
    const due = (me?.review?.due ?? []).filter((id) => TEMPLATES[id]);
    return due.slice(0, 6).map((id) => item(id, true));
  }
  if (node === 'mistakes') {
    return (state?.tids ?? []).filter((id) => TEMPLATES[id]).slice(0, 6).map((id) => item(id, true));
  }
  if (node === 'drill') {
    const stars = me?.path?.stars ?? {};
    const levelOf = Object.fromEntries((me?.skills ?? []).map((m) => [m.module_id, m.level]));
    const open = CHAPTERS.filter((c, i) => (i === 0 || (stars[CHAPTERS[i - 1].id] ?? 0) >= 1) && !isLocked(levelOf[c.id] ?? c.level, me?.tier?.max_level ?? 'Analyst'));
    const pool = open.flatMap((c) => (LESSONS[c.id] ?? []).map((t, pos) => ({ id: t.id, pos })));
    const picks = [];
    while (picks.length < 6 && pool.length) picks.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
    const warm = open[Math.floor(Math.random() * open.length)]?.id ?? 'statements';
    // Two deal cases built by the finance engine, on skills already open.
    const fins = open.flatMap((c) => templatesFor(c.id));
    const cases = [];
    while (cases.length < 2 && fins.length) cases.push(fins.splice(Math.floor(Math.random() * fins.length), 1)[0]);
    return [pairsItem(warm), ...picks.slice(0, 6 - cases.length).sort((a, b) => a.pos - b.pos).map((t) => item(t.id, true)), ...cases.map((t) => finItem(t))];
  }
  if (!LESSONS[node]) return [];
  return [pairsItem(node), ...LESSONS[node].map((t) => item(t.id, true))];
}

const inertia = { type: 'spring', stiffness: 110, damping: 17, mass: 1.1 };

/** A fresh session every time the route is entered, even from the same URL. */
export default function LearnRoute() {
  const location = useLocation();
  return <Learn key={location.key} />;
}

/**
 * The exercise loop. Four gestures (pair match, multiple choice, formula
 * builder, valuation slider) and a reaction on four channels for every answer:
 * sound, haptics, metal particles and Vale. Combos follow the server's scale
 * (3 → x2, 5 → x3, 10 → x5).
 */
function Learn() {
  const { node } = useParams();
  const location = useLocation();
  const review = node === 'review';
  const drill = node === 'drill';
  const mistakes = node === 'mistakes';
  const free = review || drill || mistakes;
  const chapter = free ? null : chapterOf(node);
  useMeta({ title: review ? 'Review' : drill ? 'Infinite drill' : mistakes ? 'Mistakes' : chapter?.title ?? 'Session' });
  const { me, setMe, showToast, openPaywall } = useApp();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [queue, setQueue] = useState(() => plan(node, me, location.state));
  const [at, setAt] = useState(0);
  const [tally, setTally] = useState({ firstTry: 0, missed: [], cleared: [], run: 0, bestRun: 0, xp: 0, bonus: false, right: 0, answered: 0 });
  const [finished, setFinished] = useState(null);
  const [flash, setFlash] = useState(null);
  const [gain, setGain] = useState(null);
  const [scope, shake] = useAnimate();
  const badge = useRef(null);
  const started = useRef(0);
  const [before] = useState(() => me?.path?.stars?.[node] ?? 0);
  useEffect(() => {
    started.current = Date.now();
  }, []);

  const level = me?.skills?.find((m) => m.module_id === node)?.level;
  const locked = !free && level && me && ['Analyst', 'Associate', 'VP', 'MD'].indexOf(level) > ['Analyst', 'Associate', 'VP', 'MD'].indexOf(me.tier.max_level);
  useEffect(() => {
    if (locked) {
      openPaywall('level', { level });
      navigate('/', { replace: true });
    }
  }, [locked, level, navigate, openPaywall]);

  // Deal cases: ask the server for a pooled or freshly written variant of the
  // same template (it records the attempt and moves the Elo rating). Without
  // the server the local, deterministic version is used as is.
  useEffect(() => {
    let live = true;
    queue.forEach((e) => {
      if (!e.fin || e.poolId) return;
      api.nextExercise?.(e.fin.split('.')[0]).then((ex) => {
        if (!live || !ex?.id || ex.template !== e.fin) return;
        setQueue((q) => q.map((x) => (x.key === e.key ? { ...x, seed: ex.seed, difficulty: ex.difficulty, narrative: ex.prompt, served: ex.brief, poolId: ex.id } : x)));
      }).catch(() => {});
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The background breathes with the run: brighter filaments at x2, x3, x5.
  useEffect(() => {
    fieldBus.setMultiplier(comboOf(tally.run));
  }, [tally.run]);
  useEffect(() => {
    fieldBus.setScene('exercise');
    return () => {
      fieldBus.setMultiplier(1);
      fieldBus.setScene('app');
    };
  }, []);

  const onGraded = useCallback((correct, entry, el) => {
    const run = correct ? tally.run + 1 : 0;
    const retry = !entry.original && !entry.warmup;
    let xp = 0;
    let bonus = false;
    if (correct) {
      xp = xpForAnswer(run, retry);
      if (run === 5 && !tally.bonus) bonus = true;
    }
    setTally((t) => {
      const missed = t.missed.includes(entry.tid);
      const counts = !entry.warmup;
      return {
        firstTry: t.firstTry + (correct && entry.original && !missed ? 1 : 0),
        missed: correct || missed || !counts ? t.missed : [...t.missed, entry.tid],
        cleared: correct && counts && !missed && !t.cleared.includes(entry.tid) ? [...t.cleared, entry.tid] : t.cleared,
        run,
        bestRun: Math.max(t.bestRun, run),
        xp: Math.min(XP_SESSION_CAP, t.xp + xp + (bonus ? XP_STREAK_BONUS : 0)),
        bonus: t.bonus || bonus,
        right: t.right + (correct ? 1 : 0),
        answered: t.answered + 1,
      };
    });

    if (entry.poolId) api.submitExercise?.(entry.poolId, entry.choice).catch(() => {});
    if (correct) {
      const tier = comboOf(run);
      sfx.correct(tier);
      haptics.fire(HAPTIC.correct);
      fieldBus.pulse(el);
      metalBurst.burst(el, 'correct');
      valeBus.react('delight');
      setGain({ amount: xp, key: Date.now() });
      if (tier > comboOf(tally.run)) {
        window.setTimeout(() => {
          sfx.comboUp(tier);
          haptics.fire(HAPTIC.combo);
          valeBus.react('wow');
          metalBurst.burst(badge.current, tier);
          if (!reduce && scope.current) shake(scope.current, { x: [0, -3, 3, -2, 0] }, { duration: 0.24 });
        }, 260);
      }
      if (bonus) {
        setFlash({ text: `5 IN A ROW · +${XP_STREAK_BONUS} BONUS XP`, key: Date.now() });
        window.setTimeout(() => setFlash(null), 1200);
      }
    } else {
      sfx.wrong();
      haptics.fire(HAPTIC.wrong);
      // Vale looks at the right answer once it is revealed.
      requestAnimationFrame(() => valeBus.react('concern', { gaze: document.querySelector('.learn-body [data-state="answer"]') }));
      if (!reduce && el) shake(el, { x: [-6, 6, -4, 4, 0] }, { duration: 0.22 });
      // A fresh variant comes back in the « Second look » segment at the end.
      // A fresh variant comes back two or three questions later.
      if (!entry.warmup) {
        setQueue((q) => {
          const i = q.findIndex((x) => x.key === entry.key);
          const at = Math.min(q.length, (i < 0 ? q.length : i) + 3);
          const variant = entry.fin ? { ...finItem(entry.fin, entry.difficulty), original: false } : item(entry.tid, false);
          return [...q.slice(0, at), variant, ...q.slice(at)];
        });
      }
    }
  }, [tally.run, tally.bonus, reduce, scope, shake]);

  // Each new question: Vale leans in.
  const currentKey = queue[at]?.key;
  useEffect(() => {
    if (currentKey) valeBus.react('focus');
  }, [currentKey]);

  if ((!chapter && !free) || locked) return <Missing />;
  if (!queue.length) return <Missing review={!mistakes} />;

  const current = queue[at];
  const originals = queue.filter((q) => q.original).length;

  const finish = async (final) => {
    const stars = free ? null : starsFor(final.firstTry);
    if (!free) clearSession();
    const seconds = Math.round((Date.now() - started.current) / 1000);
    setFinished({ stars, saving: true, error: null, ...final, seconds });
    try {
      const updated = await api.saveLesson({ node: free ? 'review' : node, stars, firstTry: final.firstTry, missed: final.missed, cleared: final.cleared });
      setMe(updated);
      // XP is credited by the server, which recomputes and caps it.
      let credit = 'pending';
      try {
        const res = await api.creditLesson?.({ node, correct: final.right, bestRun: final.bestRun });
        if (res?.me) setMe(res.me);
        if (res) credit = 'credited';
      } catch {
        credit = 'pending';
      }
      setFinished((f) => ({ ...f, saving: false, credit }));
    } catch (err) {
      setFinished((f) => ({ ...f, saving: false, error: err.message }));
      showToast(err.message, 'error');
    }
  };

  const next = () => {
    sfx.press();
    if (!free) markSession(node, Math.min(queue.slice(0, at + 1).filter((q) => q.original).length, originals), originals);
    if (at + 1 < queue.length) setAt(at + 1);
    else finish(tally);
  };

  if (finished) {
    return <Results mode={review ? 'review' : drill ? 'drill' : mistakes ? 'mistakes' : 'chapter'} chapter={chapter} result={finished} before={before} total={originals} />;
  }

  const ch = chapter ?? chapterOfConcept(current.pairs ?? current.tid);
  const tier = comboOf(tally.run);
  const firstRetry = queue.findIndex((q) => !q.original && !q.warmup);
  const inSecondLook = firstRetry >= 0 && at >= firstRetry;
  return (
    <main ref={scope} className={`learn ${tier > 1 ? 'is-surge' : ''}`} data-surge={tier}>
      <header className="learn-head">
        <motion.button type="button" className="learn-close" onClick={() => navigate(free ? '/practice' : '/')} aria-label="Leave the session" whileTap={{ scale: 0.96 }}>
          <X size={22} aria-hidden="true" />
        </motion.button>
        <div className="learn-bar" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={at} aria-label={`Question ${at + 1} of ${queue.length}`}>
          <motion.i initial={false} animate={{ scaleX: Math.max(0.04, at / queue.length) }} transition={inertia} />
        </div>
        <AnimatePresence mode="popLayout">
          {tier > 1 && (
            <motion.span
              key={tier}
              ref={badge}
              className="ex-combo"
              initial={reduce ? { opacity: 0 } : { scale: 1.6, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={springs.heavy}
              aria-label={`Combo, times ${tier}`}
            >
              <MetalPlate tone="platinum" size="sm">×{tier}</MetalPlate>
            </motion.span>
          )}
        </AnimatePresence>
        <span className="ex-xp fig-mono" aria-label={`${tally.xp} XP this session`}>
          {tally.xp}<small>XP</small>
          <AnimatePresence>
            {gain && gain.amount > 0 && (
              <motion.b key={gain.key} className="ex-gain" initial={{ y: 6, opacity: 0 }} animate={{ y: -22, opacity: [0, 1, 1, 0] }} transition={{ duration: 1.1, ease: 'easeOut' }} onAnimationComplete={() => setGain(null)}>
                +{gain.amount} XP
              </motion.b>
            )}
          </AnimatePresence>
        </span>
        <span className="ex-sound"><SoundBars /><SoundToggle className="learn-mute" /></span>
      </header>

      <div className="ex-strip">
        <Vale size={40} label="Vale" />
        <p className="ex-strip-line">
          {inSecondLook ? (
            <MetalPlate tone="steel" size="sm"><Repeat2 size={11} aria-hidden="true" /> Second look</MetalPlate>
          ) : tier > 1 ? (
            <>Combo <b className="fig-mono">×{tier}</b> · <span className="fig-mono">{tally.run}</span> in a row</>
          ) : current.warmup ? 'Warm-up: match each term to what it equals.' : `${Math.max(0, originals - tally.firstTry - tally.missed.length)} to go. Clean answers build the multiplier.`}
        </p>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div key={flash.key} className="ex-flash" initial={{ y: -16, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -10, opacity: 0 }} transition={springs.heavy} role="status">
            <MetalPlate tone="platinum" size="md">{flash.text}</MetalPlate>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <Step key={current.key} entry={current} chapter={ch} retry={!current.original && !current.warmup} onGraded={onGraded} onNext={next} />
      </AnimatePresence>
      <div className="vale-dock"><Vale size={56} /></div>
    </main>
  );
}

/* ---------- One question ---------- */
function Step({ entry, chapter, retry, onGraded, onNext }) {
  const reduce = useReducedMotion();
  const pairs = useMemo(() => (entry.pairs ? drawPairs(entry.pairs, entry.seed) : null), [entry]);
  const q = useMemo(() => {
    if (entry.pairs) return null;
    if (entry.fin) return finQuestion(entry.fin, entry.seed, entry.difficulty ?? 2, entry.narrative, entry.served);
    return makeQuestion(entry.tid, entry.seed);
  }, [entry]);
  const initial = !q ? null : q.type === 'slider' ? q.start : q.type === 'build' ? q.answer.map(() => null) : null;
  const [value, setValue] = useState(initial);
  const [verdict, setVerdict] = useState(null);
  const [slips, setSlips] = useState(0);
  const [hint, setHint] = useState(false);
  const cardRef = useRef(null);
  const ready = !q ? false : q.type === 'build' ? value.every((v) => v != null) : q.type === 'slider' ? true : value != null;

  const check = useCallback(() => {
    if (!q || !ready || verdict != null) return;
    sfx.press();
    const labels = q.type === 'build' ? value.map((i) => q.tokens[i]) : value;
    const ok = grade(q, labels);
    setVerdict(ok);
    onGraded(ok, { ...entry, choice: value }, cardRef.current);
  }, [q, ready, verdict, value, entry, onGraded]);

  const pairsDone = (n) => {
    setSlips(n);
    const ok = n === 0;
    setVerdict(ok);
    onGraded(ok, entry, cardRef.current);
  };

  // Keyboard: A–D or 1–4 to pick, Enter to check.
  useEffect(() => {
    if (!q || verdict != null) return undefined;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (q.type === 'choice') {
        const k = e.key.toUpperCase();
        const i = 'ABCD'.indexOf(k) >= 0 ? 'ABCD'.indexOf(k) : ['1', '2', '3', '4'].indexOf(k);
        if (i >= 0 && i < q.options.length) {
          e.preventDefault();
          setValue(i);
          sfx.tick();
          haptics.fire(HAPTIC.tick);
          return;
        }
      }
      if (e.key === 'Enter' && ready && tag !== 'BUTTON') {
        e.preventDefault();
        check();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [q, verdict, ready, check]);

  const keyFor = () => {
    if (pairs) return JSON.stringify(pairs.answer);
    return JSON.stringify(q.type === 'slider' ? Math.round((q.answer - q.min) / q.step) : q.answer);
  };

  return (
    <motion.section
      className="learn-step"
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40 }}
      transition={springs.snappy}
      aria-live="polite"
      {...(IS_DEMO ? { 'data-key': keyFor(), 'data-type': pairs ? 'pairs' : q.type } : {})}
    >
      <div className={`learn-body ${verdict === true ? 'is-sweep' : ''}`} ref={cardRef}>
        <p className="t-eyebrow learn-stage">
          {retry && <><Repeat2 size={12} aria-hidden="true" /> Second look · </>}
          {pairs ? 'Rapid pair match' : q.stage} · {chapter?.title}
        </p>
        {q?.data && (
          <dl className="learn-context" aria-label="Key figures">
            {q.data.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="fig-mono">{v}</dd></div>)}
          </dl>
        )}
        <h1 className="learn-prompt">{pairs ? 'Tap a term, then what it equals.' : q.prompt}</h1>

        {pairs && <PairsQ pairs={pairs} onDone={pairsDone} done={verdict != null} />}
        {q?.type === 'choice' && <ChoiceQ q={q} value={value} onChange={setValue} verdict={verdict} />}
        {q?.type === 'slider' && <SliderQ q={q} value={value} onChange={setValue} verdict={verdict} />}
        {q?.type === 'compare' && <CompareQ q={q} value={value} onChange={setValue} verdict={verdict} />}
        {q?.type === 'build' && <BuildQ q={q} value={value} onChange={setValue} verdict={verdict} />}

        <AnimatePresence>
          {hint && verdict == null && q && (
            <motion.aside className="learn-hint" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={springs.soft}>
              <Lightbulb size={16} aria-hidden="true" />
              <p><b>Aha.</b> {q.hint}</p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {verdict == null ? (
        q && (
          <div className="learn-dock glass">
            <div className="learn-dock-inner">
              <motion.button
                type="button"
                className={`learn-aha ${hint ? 'is-on' : ''}`}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setHint((h) => !h); sfx.tick(); }}
                aria-pressed={hint}
                aria-label="Aha: a memory hook, not the answer"
              >
                <Lightbulb size={20} aria-hidden="true" /> <span>Aha</span>
              </motion.button>
              <motion.button type="button" className="btn btn--primary learn-check" disabled={!ready} onClick={check} whileTap={{ scale: 0.96 }}>
                Check
              </motion.button>
            </div>
          </div>
        )
      ) : (
        <Feedback q={q} pairs={pairs} slips={slips} ok={verdict} chapter={chapter} onNext={onNext} warmup={entry.warmup} />
      )}
    </motion.section>
  );
}

const PRAISE = ['Exactly.', 'Clean.', 'That’s the call.', 'Desk-ready.', 'Sharp.'];

function Feedback({ q, pairs, slips, ok, chapter, onNext, warmup }) {
  const reduce = useReducedMotion();
  const [line] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)]);
  return (
    <motion.div
      className={`learn-feed ${ok ? 'is-ok' : 'is-miss'}`}
      initial={reduce ? { opacity: 0 } : { y: '100%' }}
      animate={reduce ? { opacity: 1 } : { y: 0 }}
      transition={springs.snappy}
      role="status"
    >
      <div className="learn-feed-inner">
        <p className="learn-verdict">
          <span className="learn-verdict-mark" aria-hidden="true">{ok ? <Check size={18} strokeWidth={2.6} /> : <X size={18} strokeWidth={2.6} />}</span>
          {pairs ? (ok ? 'Clean sweep.' : `Matched, with ${slips} ${slips === 1 ? 'slip' : 'slips'}.`) : ok ? line : 'Not quite.'}
        </p>
        {!ok && q && <p className="t-label">Answer: <span className="c-fg fig-mono">{answerText(q)}</span></p>}
        {q && <p className="t-callout c-2">{q.explain}</p>}
        {pairs && <p className="t-callout c-2">{ok ? 'Four for four on the first tap.' : 'Every pair is locked in now. Read them once more before the six questions.'}</p>}
        {q?.brief && <DealBriefCard brief={q.brief} collapsible defaultOpen={!ok} className="learn-brief" />}
        {chapter && !warmup && !q?.brief && (
          <div className="learn-rule">
            <span className="t-eyebrow">Golden rule</span>
            <p className="learn-rule-text">{chapter.vault.rule}</p>
            <p className="t-foot">{chapter.vault.hook}</p>
          </div>
        )}
        {!ok && q && <p className="t-cap">A fresh variant of this one comes back in the second look.</p>}
        <motion.button type="button" className="btn btn--primary" onClick={onNext} autoFocus whileTap={{ scale: 0.96 }}>
          Continue <ArrowRight size={18} aria-hidden="true" />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ---------- Question types ---------- */
const KEYS = 'ABCD';
const pick = () => {
  sfx.tick();
  haptics.fire(HAPTIC.tick);
};

function ChoiceQ({ q, value, onChange, verdict }) {
  const done = verdict != null;
  return (
    <div className="options" role="radiogroup" aria-label="Your answer">
      {q.options.map((o, i) => {
        const state = !done ? (value === i ? 'selected' : 'idle') : i === q.answer ? 'answer' : i === value ? 'wrong' : 'dim';
        return (
          <motion.button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-keyshortcuts={KEYS[i]}
            className={`option metal ${done ? '' : 'metal--live'}`}
            data-state={state}
            disabled={done}
            onClick={() => { onChange(i); pick(); }}
            animate={{ scale: state === 'selected' ? 0.97 : 1 }}
            transition={springs.snappy}
            whileTap={done ? undefined : { scale: 0.96 }}
          >
            <span className="option-key">{state === 'answer' ? <Check size={15} strokeWidth={3} /> : state === 'wrong' ? <X size={15} strokeWidth={3} /> : KEYS[i]}</span>
            <span className="option-label">{o}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Valuation slider: drag a lever (WACC, a multiple, D&A…), read the valuation move live. */
function SliderQ({ q, value, onChange, verdict }) {
  const done = verdict != null;
  const last = useRef(value);
  const pct = ((value - q.min) / (q.max - q.min)) * 100;
  return (
    <div className={`learn-slider ex-slider ${done ? (verdict ? 'is-ok' : 'is-miss') : ''}`}>
      <p className="learn-slider-value fig-mono" aria-live="off">{q.format(value)}</p>
      <dl className="learn-readouts ex-readouts">
        {q.readouts(value).map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="fig-mono">{v}</dd></div>)}
      </dl>
      <input
        type="range"
        min={q.min}
        max={q.max}
        step={q.step}
        value={value}
        disabled={done}
        style={{ '--pct': `${pct}%` }}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v !== last.current) {
            last.current = v;
            sfx.tick();
            haptics.fire(3);
          }
          onChange(v);
        }}
        aria-label={q.format(value)}
      />
      <div className="learn-scale fig-mono" aria-hidden="true"><span>{q.format(q.min).split(' ').pop()}</span><span>{q.format(q.max).split(' ').pop()}</span></div>
    </div>
  );
}

function CompareQ({ q, value, onChange, verdict }) {
  const done = verdict != null;
  return (
    <div className="learn-compare" role="radiogroup" aria-label="Pick one">
      {['a', 'b'].map((k) => {
        const side = q[k];
        const state = !done ? (value === k ? 'selected' : 'idle') : k === q.answer ? 'answer' : k === value ? 'wrong' : 'dim';
        return (
          <motion.button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            className="learn-side metal"
            data-state={state}
            disabled={done}
            onClick={() => { onChange(k); pick(); }}
            animate={{ scale: state === 'selected' ? 0.97 : 1 }}
            transition={springs.snappy}
            whileTap={done ? undefined : { scale: 0.96 }}
          >
            <span className="learn-side-name">{side.name}</span>
            <dl>
              {side.rows.map(([label, v]) => <div key={label}><dt>{label}</dt><dd className="fig-mono">{v}</dd></div>)}
            </dl>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Formula builder: tap metal tokens into the blanks, in order (two of them are traps). */
function BuildQ({ q, value, onChange, verdict }) {
  const done = verdict != null;
  const used = new Set(value.filter((v) => v != null));
  const place = (ti) => {
    const slot = value.findIndex((v) => v == null);
    if (slot < 0 || done) return;
    const next = [...value];
    next[slot] = ti;
    onChange(next);
    pick();
  };
  const clear = (slot) => {
    if (done || value[slot] == null) return;
    const next = [...value];
    next[slot] = null;
    onChange(next);
    sfx.tick();
  };
  const firstEmpty = value.findIndex((v) => v == null);
  return (
    <div className={`learn-build ${done ? (verdict ? 'is-ok' : 'is-miss') : ''}`}>
      <div className="learn-formula" aria-label="Your formula">
        {q.parts.map((p, i) => (typeof p === 'number' ? (
          <motion.button
            key={`s${p}`}
            type="button"
            className={`learn-slot ${value[p] == null ? 'is-empty' : ''} ${p === firstEmpty && !done ? 'is-next' : ''}`}
            onClick={() => clear(p)}
            disabled={done || value[p] == null}
            whileTap={{ scale: 0.96 }}
            aria-label={value[p] == null ? `Blank ${p + 1}` : `${q.tokens[value[p]]}. Tap to remove`}
          >
            {value[p] == null ? ' ' : q.tokens[value[p]]}
          </motion.button>
        ) : (
          <span key={`t${i}`} className="learn-op fig-mono">{p}</span>
        )))}
      </div>
      <div className="learn-bank" aria-label="Pieces">
        {q.tokens.map((t, ti) => (
          <motion.button
            // eslint-disable-next-line react/no-array-index-key
            key={`${t}-${ti}`}
            type="button"
            className="learn-token ex-token"
            disabled={done || used.has(ti)}
            onClick={() => place(ti)}
            whileTap={{ scale: 0.96 }}
            layout
          >
            {t}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Missing({ review = false }) {
  return (
    <main className="learn learn-finish">
      <div className="learn-finish-inner">
        <h1 className="t-h2">{review ? 'Nothing to review right now.' : 'This chapter doesn’t exist.'}</h1>
        <p className="t-body">{review ? 'Fragile notions come back here when they’re due.' : 'Head back to the path.'}</p>
        <Link to="/" className="btn btn--primary">Back to the path</Link>
      </div>
    </main>
  );
}

