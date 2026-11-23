import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Infinity as InfinityIcon, Lightbulb, Repeat2, Star, Vault, X } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { haptic } from '../app/prefs';
import { api } from '../lib/api';
import { sound } from '../lib/sound';
import { fieldBus } from '../fx/field/fieldBus';
import { burst, feverBurst, originOf } from '../lib/celebrate';
import { CHAPTERS, VAULT_STARS, chapterOf, chapterOfConcept, starsFor } from '../content/path';
import { LESSONS, TEMPLATES, answerText, grade, makeQuestion } from '../content/lessons';
import { NumberTicker, SoundToggle } from '../components/Momentum';
import { isLocked } from '../lib/modules';
import { Spinner } from '../components/bits';
import { spring } from '../design/tokens';
import { useMeta } from '../app/useMeta';
import { IS_DEMO } from '../lib/config';
import './Learn.css';

const seed = () => Math.floor(Math.random() * 2 ** 31);
let uid = 0;
const item = (tid, original) => ({ key: `q${(uid += 1)}`, tid, seed: seed(), original });

/**
 * The questions for a chapter, for today's review of fragile notions, or for
 * an infinite drill: six fresh questions drawn from every chapter you have
 * opened, still ordered intuition → structure → deal case.
 */
function plan(node, me) {
  if (node === 'review') {
    const due = (me?.review?.due ?? []).filter((id) => TEMPLATES[id]);
    return due.slice(0, 6).map((id) => item(id, true));
  }
  if (node === 'drill') {
    const stars = me?.path?.stars ?? {};
    const levelOf = Object.fromEntries((me?.skills ?? []).map((m) => [m.module_id, m.level]));
    const open = CHAPTERS.filter((c, i) => (i === 0 || (stars[CHAPTERS[i - 1].id] ?? 0) >= 1) && !isLocked(levelOf[c.id] ?? c.level, me?.tier?.max_level ?? 'Analyst'));
    const pool = open.flatMap((c) => (LESSONS[c.id] ?? []).map((t, pos) => ({ id: t.id, pos })));
    const picks = [];
    while (picks.length < 6 && pool.length) picks.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
    return picks.sort((a, b) => a.pos - b.pos).map((t) => item(t.id, true));
  }
  return (LESSONS[node] ?? []).map((t) => item(t.id, true));
}

/** Platinum Surge: answers in a row lift the multiplier to x2, x3, then x5. */
const surgeOf = (run) => (run >= 6 ? 5 : run >= 4 ? 3 : run >= 2 ? 2 : 1);
const inertia = { type: 'spring', stiffness: 110, damping: 17, mass: 1.1 };

/** A fresh session every time the route is entered, even from the same URL. */
export default function LearnRoute() {
  const location = useLocation();
  return <Learn key={location.key} />;
}

/**
 * A Deal Path session: six questions on a flow curve (intuition → structure →
 * a real deal case). A miss shows the golden rule at once and comes back as a
 * fresh variant before the end, until it lands.
 */
function Learn() {
  const { node } = useParams();
  const review = node === 'review';
  const drill = node === 'drill';
  const free = review || drill;
  const chapter = free ? null : chapterOf(node);
  useMeta({ title: review ? 'Review' : drill ? 'Infinite drill' : chapter?.title ?? 'Session' });
  const { me, setMe, showToast, openPaywall } = useApp();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(() => plan(node, me));
  const [at, setAt] = useState(0);
  const [tally, setTally] = useState({ firstTry: 0, missed: [], cleared: [], run: 0, bestRun: 0 });
  const [finished, setFinished] = useState(null); // { stars, before, saving, error }
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

  // The background breathes with the run: brighter filaments at x2, x3, x5.
  useEffect(() => {
    fieldBus.setMultiplier(surgeOf(tally.run));
  }, [tally.run]);
  useEffect(() => () => fieldBus.setMultiplier(1), []);

  if ((!chapter && !free) || locked) return <Missing />;
  if (!queue.length) return <Missing review />;

  const current = queue[at];
  const originals = queue.filter((q) => q.original).length;

  const onGraded = (correct, tid, original) => {
    setTally((t) => {
      const missed = t.missed.includes(tid);
      const run = correct ? t.run + 1 : 0;
      return {
        firstTry: t.firstTry + (correct && original && !missed ? 1 : 0),
        missed: correct || missed ? t.missed : [...t.missed, tid],
        cleared: correct && !missed && !t.cleared.includes(tid) ? [...t.cleared, tid] : t.cleared,
        run,
        bestRun: Math.max(t.bestRun, run),
      };
    });
    if (correct) {
      sound.correct(tally.run + 1);
      fieldBus.pulse([...document.querySelectorAll('.learn-step')].pop());
      haptic([10, 30, 14]);
      const up = surgeOf(tally.run + 1);
      if (up > surgeOf(tally.run)) {
        sound.fever(up);
        setTimeout(() => haptic([8, 24, 8, 24, 30]), 420);
        if (up >= 3) setTimeout(() => feverBurst(up, originOf(document.querySelector('.learn-surge')) ?? undefined), 380);
      }
    } else {
      sound.wrong();
      haptic([22, 40, 22]);
      // Spaced repetition inside the session: a fresh variant goes to the back of the line.
      setQueue((q) => [...q, item(tid, false)]);
    }
  };

  const finish = async (final) => {
    const stars = free ? null : starsFor(final.firstTry);
    setFinished({ stars, saving: true, error: null, ...final, seconds: Math.round((Date.now() - started.current) / 1000) });
    try {
      const updated = await api.saveLesson({ node: free ? 'review' : node, stars, firstTry: final.firstTry, missed: final.missed, cleared: final.cleared });
      setMe(updated);
      setFinished((f) => ({ ...f, saving: false }));
    } catch (err) {
      setFinished((f) => ({ ...f, saving: false, error: err.message }));
      showToast(err.message, 'error');
    }
  };

  const next = () => {
    if (at + 1 < queue.length) setAt(at + 1);
    else finish(tally);
  };

  if (finished) return <Finish mode={review ? 'review' : drill ? 'drill' : 'chapter'} chapter={chapter} result={finished} before={before} total={originals} />;

  const ch = chapter ?? chapterOfConcept(current.tid);
  const surge = surgeOf(tally.run);
  return (
    <main className={`learn ${surge > 1 ? 'is-surge' : ''}`} data-surge={surge}>
      <header className="learn-head">
        <motion.button type="button" className="learn-close" onClick={() => navigate(free ? '/practice' : '/')} aria-label="Leave the session" whileTap={{ scale: 0.96 }}>
          <X size={22} aria-hidden="true" />
        </motion.button>
        <div className="learn-bar" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={at} aria-label={`Question ${at + 1} of ${queue.length}`}>
          <motion.i initial={false} animate={{ scaleX: Math.max(0.04, at / queue.length) }} transition={inertia} />
        </div>
        <AnimatePresence mode="popLayout">
          {surge > 1 && (
            <motion.span
              key={surge}
              className="learn-surge fig-mono"
              initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 16 }}
              aria-label={`Platinum Surge, times ${surge}`}
            >
              ×{surge}
            </motion.span>
          )}
        </AnimatePresence>
        <SoundToggle className="learn-mute" />
      </header>
      <AnimatePresence>
        {surge > 1 && (
          <motion.p key="surge-line" className="learn-surge-line" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.gentle}>
            Platinum Surge · <span className="fig-mono">{tally.run}</span> in a row
          </motion.p>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <Step key={current.key} entry={current} chapter={ch} retry={!current.original} onGraded={onGraded} onNext={next} />
      </AnimatePresence>
    </main>
  );
}

/* ---------- One question ---------- */
function Step({ entry, chapter, retry, onGraded, onNext }) {
  const reduce = useReducedMotion();
  const q = useMemo(() => makeQuestion(entry.tid, entry.seed), [entry]);
  const initial = q.type === 'slider' ? q.start : q.type === 'build' ? q.answer.map(() => null) : null;
  const [value, setValue] = useState(initial);
  const [verdict, setVerdict] = useState(null);
  const [hint, setHint] = useState(false);
  const cardRef = useRef(null);
  const ready = q.type === 'build' ? value.every((v) => v != null) : q.type === 'slider' ? true : value != null;

  const check = () => {
    if (!ready || verdict != null) return;
    const labels = q.type === 'build' ? value.map((i) => q.tokens[i]) : value;
    const ok = grade(q, labels);
    setVerdict(ok);
    onGraded(ok, entry.tid, entry.original);
    if (ok) setTimeout(() => burst(originOf(cardRef.current) ?? undefined), 60);
  };

  return (
    <motion.section
      className="learn-step"
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40 }}
      transition={spring.snappy}
      aria-live="polite"
      data-key={IS_DEMO ? JSON.stringify(q.type === 'slider' ? Math.round((q.answer - q.min) / q.step) : q.answer) : undefined}
    >
      <div className="learn-body" ref={cardRef}>
        <p className="t-eyebrow learn-stage">
          {retry && <><Repeat2 size={12} aria-hidden="true" /> Second look · </>}
          {q.stage} · {chapter?.title}
        </p>
        {q.data && (
          <dl className="learn-context" aria-label="Key figures">
            {q.data.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="fig-mono">{v}</dd></div>)}
          </dl>
        )}
        <h1 className="learn-prompt">{q.prompt}</h1>

        {q.type === 'choice' && <ChoiceQ q={q} value={value} onChange={setValue} verdict={verdict} />}
        {q.type === 'slider' && <SliderQ q={q} value={value} onChange={setValue} verdict={verdict} />}
        {q.type === 'compare' && <CompareQ q={q} value={value} onChange={setValue} verdict={verdict} />}
        {q.type === 'build' && <BuildQ q={q} value={value} onChange={setValue} verdict={verdict} />}

        <AnimatePresence>
          {hint && verdict == null && (
            <motion.aside className="learn-hint" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.gentle}>
              <Lightbulb size={16} aria-hidden="true" />
              <p><b>Aha.</b> {q.hint}</p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {verdict == null ? (
        <div className="learn-dock glass">
          <div className="learn-dock-inner">
            <motion.button
              type="button"
              className={`learn-aha ${hint ? 'is-on' : ''}`}
              whileTap={{ scale: 0.96 }}
              onClick={() => { setHint((h) => !h); sound.tap(); }}
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
      ) : (
        <Feedback q={q} ok={verdict} chapter={chapter} onNext={onNext} />
      )}
    </motion.section>
  );
}

const PRAISE = ['Exactly.', 'Clean.', 'That’s the call.', 'Desk-ready.', 'Sharp.'];

function Feedback({ q, ok, chapter, onNext }) {
  const reduce = useReducedMotion();
  const [line] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)]);
  return (
    <motion.div
      className={`learn-feed ${ok ? 'is-ok' : 'is-miss'}`}
      initial={reduce ? { opacity: 0 } : { y: '100%' }}
      animate={reduce ? { opacity: 1 } : { y: 0 }}
      transition={spring.snappy}
      role="status"
    >
      <div className="learn-feed-inner">
        <p className="learn-verdict">
          <span className="learn-verdict-mark" aria-hidden="true">{ok ? <Check size={18} strokeWidth={2.6} /> : <X size={18} strokeWidth={2.6} />}</span>
          {ok ? line : 'Not quite.'}
        </p>
        {!ok && <p className="t-label">Answer: <span className="c-fg fig-mono">{answerText(q)}</span></p>}
        <p className="t-callout c-2">{q.explain}</p>
        {chapter && (
          <div className="learn-rule">
            <span className="t-eyebrow">Golden rule</span>
            <p className="learn-rule-text">{chapter.vault.rule}</p>
            <p className="t-foot">{chapter.vault.hook}</p>
          </div>
        )}
        {!ok && <p className="t-cap">A fresh variant of this one comes back before the end.</p>}
        <motion.button type="button" className="btn btn--primary" onClick={onNext} autoFocus whileTap={{ scale: 0.96 }}>
          Continue <ArrowRight size={18} aria-hidden="true" />
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ---------- Question types ---------- */
const KEYS = 'ABCD';

function ChoiceQ({ q, value, onChange, verdict }) {
  const done = verdict != null;
  return (
    <>
      <div className="options" role="radiogroup" aria-label="Your answer">
        {q.options.map((o, i) => {
          const state = !done ? (value === i ? 'selected' : 'idle') : i === q.answer ? 'answer' : i === value ? 'wrong' : 'dim';
          return (
            <motion.button
              key={o}
              type="button"
              role="radio"
              aria-checked={value === i}
              className={`option metal ${done ? '' : 'metal--live'}`}
              data-state={state}
              disabled={done}
              onClick={() => { onChange(i); haptic(6); }}
              whileTap={done ? undefined : { scale: 0.96 }}
            >
              <span className="option-key">{state === 'answer' ? <Check size={15} strokeWidth={3} /> : state === 'wrong' ? <X size={15} strokeWidth={3} /> : KEYS[i]}</span>
              <span className="option-label">{o}</span>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

function SliderQ({ q, value, onChange, verdict }) {
  const done = verdict != null;
  const last = useRef(value);
  const pct = ((value - q.min) / (q.max - q.min)) * 100;
  return (
    <div className={`learn-slider ${done ? (verdict ? 'is-ok' : 'is-miss') : ''}`}>
      <p className="learn-slider-value fig-mono">{q.format(value)}</p>
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
            sound.hover();
            haptic(3);
          }
          onChange(v);
        }}
        aria-label={q.format(value)}
      />
      <div className="learn-scale fig-mono" aria-hidden="true"><span>{q.format(q.min).split(' ').pop()}</span><span>{q.format(q.max).split(' ').pop()}</span></div>
      <dl className="learn-readouts">
        {q.readouts(value).map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="fig-mono">{v}</dd></div>)}
      </dl>
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
            onClick={() => { onChange(k); haptic(6); }}
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

function BuildQ({ q, value, onChange, verdict }) {
  const done = verdict != null;
  const used = new Set(value.filter((v) => v != null));
  const place = (ti) => {
    const slot = value.findIndex((v) => v == null);
    if (slot < 0 || done) return;
    const next = [...value];
    next[slot] = ti;
    onChange(next);
    sound.tap();
    haptic(6);
  };
  const clear = (slot) => {
    if (done || value[slot] == null) return;
    const next = [...value];
    next[slot] = null;
    onChange(next);
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
            {value[p] == null ? ' ' : q.tokens[value[p]]}
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
            className="learn-token"
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

/* ---------- The end of a session ---------- */
const DROP = 0.45; // first star leaves the top
const GAP = 0.42; // between stars
const FALL = 0.34; // time to land

function Finish({ mode, chapter, result, before, total }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [starsRef, animateStars] = useAnimate();
  const review = mode !== 'chapter';
  const { stars, firstTry, missed, seconds, saving, error, bestRun } = result;
  const unlocked = !review && stars >= VAULT_STARS && before < VAULT_STARS;
  const nextChapter = !review ? CHAPTERS[CHAPTERS.findIndex((c) => c.id === chapter.id) + 1] : null;

  // Each earned star falls into its socket: a struck-metal impact, a jolt, a buzz.
  useEffect(() => {
    if (review) {
      sound.rankUp();
      return undefined;
    }
    const timers = [1, 2, 3].map((k) => setTimeout(() => {
      if (k <= stars) {
        sound.impact(k);
        haptic(k === 3 ? [26, 40, 40] : 20);
        if (!reduce && starsRef.current) animateStars(starsRef.current, { y: [0, 6, -2, 0] }, { duration: 0.28 });
      }
      if (k === 3 && stars === 3) {
        setTimeout(() => sound.rankUp(), 120);
        feverBurst(5, originOf(starsRef.current) ?? undefined);
      } else if (k === stars && stars < 3) burst(originOf(starsRef.current) ?? undefined);
    }, reduce ? 0 : (DROP + (k - 1) * GAP + FALL) * 1000));
    return () => timers.forEach(clearTimeout);
  }, [review, stars, reduce, starsRef, animateStars]);

  const title = mode === 'drill' ? 'Drill complete.' : review ? 'Fragile notions reinforced.' : stars === 3 ? 'Flawless.' : stars === 2 ? 'Solid session.' : 'Chapter cleared.';
  return (
    <main className="learn learn-finish">
      <div className="learn-finish-inner">
        <p className="t-eyebrow">{mode === 'drill' ? 'Infinite drill' : review ? 'Review complete' : chapter.title}</p>
        {!review && (
          <div className="finish-stars" ref={starsRef} role="img" aria-label={`${stars} of 3 stars`}>
            {[1, 2, 3].map((k) => (
              <span key={k} className={`finish-socket ${k === 2 ? 'is-big' : ''}`}>
                <Star size={k === 2 ? 64 : 48} strokeWidth={1.2} className="finish-socket-mark" aria-hidden="true" />
                {k <= stars && (
                  <motion.span
                    className="finish-star is-on"
                    initial={reduce ? false : { y: -260, rotate: -160, scale: 1.4, opacity: 0 }}
                    animate={{ y: 0, rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ y: { type: 'spring', stiffness: 420, damping: 15, delay: DROP + (k - 1) * GAP }, rotate: { duration: FALL + 0.1, ease: [0.3, 0, 0.2, 1], delay: DROP + (k - 1) * GAP }, scale: { duration: FALL, delay: DROP + (k - 1) * GAP }, opacity: { duration: 0.12, delay: DROP + (k - 1) * GAP } }}
                  >
                    <Star size={k === 2 ? 64 : 48} strokeWidth={1.4} />
                    <motion.i className="finish-flare" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.8, 2.4], opacity: [0, 0.9, 0] }} transition={{ duration: 0.55, delay: DROP + (k - 1) * GAP + FALL - 0.04 }} aria-hidden="true" />
                  </motion.span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 className="t-h1">{title}</h1>
        <dl className="finish-stats">
          {!review && <div><dt>First try</dt><dd className="fig-mono"><NumberTicker value={firstTry} delay={0.4} />/{total}</dd></div>}
          <div><dt>Best run</dt><dd className="fig-mono"><NumberTicker value={bestRun} delay={0.5} /></dd></div>
          <div><dt>Time</dt><dd className="fig-mono">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</dd></div>
        </dl>
        {missed.length > 0 && (
          <p className="t-foot finish-note"><Repeat2 size={14} aria-hidden="true" /> {missed.length} fragile {missed.length === 1 ? 'notion' : 'notions'} saved for review tomorrow.</p>
        )}
        {!review && stars < 3 && <p className="t-cap">Six out of six on the first try earns the third star.</p>}

        {unlocked && (
          <motion.div className="finish-vault" initial={reduce ? false : { opacity: 0, y: 16, rotateX: 30 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ ...spring.gentle, delay: 1.9 }}>
            <Vault size={20} aria-hidden="true" />
            <div className="stack-4">
              <span className="t-eyebrow">Platinum card unlocked</span>
              <span className="t-headline">{chapter.vault.title}</span>
              <span className="t-foot">“{chapter.vault.rule}” is now in your Vault.</span>
            </div>
          </motion.div>
        )}

        {error && <div className="alert" role="alert">{error}</div>}

        <div className="finish-actions">
          {mode === 'drill' ? (
            <>
              <motion.button type="button" className="btn btn--primary btn--lg" whileTap={{ scale: 0.96 }} disabled={saving} onClick={() => navigate('/learn/drill', { replace: true })}>
                {saving ? <Spinner /> : <><InfinityIcon size={18} aria-hidden="true" /> Another round</>}
              </motion.button>
              <Link to="/practice" className="btn btn--secondary">Back to free training</Link>
            </>
          ) : (
            <motion.button type="button" className="btn btn--primary btn--lg" whileTap={{ scale: 0.96 }} disabled={saving} onClick={() => navigate('/')}>
              {saving ? <Spinner /> : <>Continue the path <ArrowRight size={18} aria-hidden="true" /></>}
            </motion.button>
          )}
          {!review && (
            <Link to={`/practice?m=${chapter.id}`} className="btn btn--secondary">Try a full timed deal</Link>
          )}
          {unlocked && <Link to="/profile" className="btn btn--ghost">Open the Vault</Link>}
          {!review && nextChapter && stars >= 1 && <p className="t-cap center">Next on the path: {nextChapter.title}</p>}
        </div>
      </div>
    </main>
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
