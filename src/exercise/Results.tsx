import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimate, useReducedMotion } from 'motion/react';
import { ArrowRight, Infinity as InfinityIcon, Repeat2, Star, Vault } from 'lucide-react';
import AnimatedNumber from '../components/fx/AnimatedNumber';
import Vale from '../components/vale/Vale';
import { valeBus } from '../components/vale/valeBus';
import DealBriefCard from '../pedagogy/DealBriefCard';
import { CHAPTER_BRIEFS } from '../content/briefs';
import { CHAPTERS, VAULT_STARS, chapterOfConcept } from '../content/path';
import { sfx } from '../lib/sfx/engine';
import { haptics, HAPTIC } from '../lib/haptics';
import { metalBurst } from '../fx/MetalBurst';
import { springs } from '../motion/springs';
import { Spinner } from '../components/bits';
import './exercise.css';

type Chapter = { id: string; title: string; vault: { title: string; rule: string } };
type Result = {
  stars: number | null; firstTry: number; missed: string[]; seconds: number; saving: boolean; error: string | null;
  bestRun: number; xp: number; right: number; answered: number; credit?: 'credited' | 'pending' | null;
};
type Props = { mode: 'chapter' | 'review' | 'drill' | 'mistakes'; chapter: Chapter | null; result: Result; before: number; total: number };

const FIRST = 0.5; // s before the first star
const STAGGER = 0.38;
const FALL = 0.42;

/**
 * The end of a session: three sockets engraved in a brushed plate, each star
 * won drops in and docks with an impact; then the XP rolls, the numbers and
 * the Deal Brief to remember. One main action, one discreet one.
 */
export default function Results({ mode, chapter, result, before, total }: Props) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [plate, animate] = useAnimate<HTMLDivElement>();
  const sockets = useRef<(HTMLSpanElement | null)[]>([]);
  const isChapter = mode === 'chapter' && chapter;
  const stars = result.stars ?? 0;
  const unlocked = isChapter && stars >= VAULT_STARS && before < VAULT_STARS;
  const nextChapter = isChapter ? CHAPTERS[CHAPTERS.findIndex((c) => c.id === chapter.id) + 1] : null;
  const accuracy = result.answered ? Math.round((result.right / result.answered) * 100) : 0;
  const briefChapter = chapter?.id ?? chapterOfConcept(result.missed[0] ?? 'statements')?.id ?? 'statements';
  const xpDelay = isChapter ? FIRST + STAGGER * Math.max(stars, 1) + FALL : 0.3;

  useEffect(() => {
    if (!isChapter) {
      sfx.comboUp(3);
      valeBus.react('celebrate');
      return undefined;
    }
    const timers = [0, 1, 2].map((i) => window.setTimeout(() => {
      if (i >= stars) return;
      sfx.starImpact(i as 0 | 1 | 2);
      haptics.fire(HAPTIC.star);
      if (!reduce && plate.current) animate(plate.current, { y: [0, 2, -1, 0], x: [0, -2, 2, 0] }, { duration: 0.22 });
      const el = sockets.current[i];
      if (el) {
        const r = el.getBoundingClientRect();
        metalBurst.at(r.left + r.width / 2, r.top + r.height / 2, 8);
      }
      if (i === stars - 1) valeBus.react(stars === 3 ? 'combo' : 'celebrate');
    }, reduce ? 0 : (FIRST + i * STAGGER + FALL) * 1000));
    return () => timers.forEach(clearTimeout);
  }, [isChapter, stars, reduce, plate, animate]);

  const title = mode === 'drill' ? 'Drill complete.' : mode === 'mistakes' ? 'Mistakes cleared.' : mode === 'review' ? 'Fragile notions reinforced.' : stars === 3 ? 'Flawless.' : stars === 2 ? 'Solid session.' : 'Chapter cleared.';
  const mm = Math.floor(result.seconds / 60);
  const ss = String(result.seconds % 60).padStart(2, '0');

  return (
    <main className="learn learn-finish ex-results">
      <div className="learn-finish-inner">
        <div className="exr-top">
          <Vale size={56} />
          <p className="t-eyebrow">{mode === 'drill' ? 'Infinite drill' : mode === 'review' ? 'Review complete' : mode === 'mistakes' ? 'Second look' : chapter?.title}</p>
        </div>

        {isChapter && (
          <div className="exr-plate" ref={plate} role="img" aria-label={`${stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`exr-socket ${i === 1 ? 'is-mid' : ''}`} ref={(el) => { sockets.current[i] = el; }}>
                <Star className="exr-engraved" strokeWidth={1.2} aria-hidden="true" />
                {i < stars && (
                  <motion.span
                    className="exr-star"
                    initial={reduce ? false : { y: -220, scale: 1.6, rotate: -20, opacity: 0 }}
                    animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ ...springs.heavy, delay: FIRST + i * STAGGER, opacity: { duration: 0.1, delay: FIRST + i * STAGGER } }}
                  >
                    <Star strokeWidth={1.4} aria-hidden="true" />
                  </motion.span>
                )}
              </span>
            ))}
          </div>
        )}

        <h1 className="t-h1">{title}</h1>

        <dl className="exr-stats">
          <div className="exr-xp">
            <dt>XP</dt>
            <dd className="fig-mono"><XpRoll value={result.xp} delay={xpDelay} /></dd>
          </div>
          <div><dt>Accuracy</dt><dd className="fig-mono">{accuracy}%</dd></div>
          <div><dt>Time</dt><dd className="fig-mono">{mm}:{ss}</dd></div>
          <div><dt>Best combo</dt><dd className="fig-mono">{result.bestRun}</dd></div>
        </dl>
        {result.credit === 'pending' && <p className="t-cap exr-note">XP saved on this device; it reaches your account at the next sync.</p>}
        {isChapter && <p className="t-cap exr-note">First try {result.firstTry}/{total}{stars < 3 ? ' · six out of six on the first try earns the third star' : ''}.</p>}

        {unlocked && chapter && (
          <motion.div className="finish-vault" initial={reduce ? false : { opacity: 0, y: 16, rotateX: 30 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ ...springs.soft, delay: 1.9 }}>
            <Vault size={20} aria-hidden="true" />
            <div className="stack-4">
              <span className="t-eyebrow">Platinum card unlocked</span>
              <span className="t-headline">{chapter.vault.title}</span>
              <span className="t-foot">“{chapter.vault.rule}” is now in your Vault.</span>
            </div>
          </motion.div>
        )}

        <DealBriefCard brief={CHAPTER_BRIEFS[briefChapter]} className="exr-brief" />

        {result.error && <div className="alert" role="alert">{result.error}</div>}

        <div className="finish-actions">
          {mode === 'drill' ? (
            <motion.button type="button" className="btn btn--primary btn--lg" whileTap={{ scale: 0.96 }} disabled={result.saving} onClick={() => navigate('/learn/drill', { replace: true })}>
              {result.saving ? <Spinner /> : <><InfinityIcon size={18} aria-hidden="true" /> Another round</>}
            </motion.button>
          ) : (
            <motion.button type="button" className="btn btn--primary btn--lg" whileTap={{ scale: 0.96 }} disabled={result.saving} onClick={() => { sfx.press(); navigate('/'); }} autoFocus>
              {result.saving ? <Spinner /> : <>Continue <ArrowRight size={18} aria-hidden="true" /></>}
            </motion.button>
          )}
          {result.missed.length > 0 && mode !== 'mistakes' && (
            <button type="button" className="exr-secondary" onClick={() => navigate('/learn/mistakes', { state: { tids: result.missed } })}>
              <Repeat2 size={15} aria-hidden="true" /> Review mistakes ({result.missed.length})
            </button>
          )}
          {isChapter && nextChapter && stars >= 1 && <p className="t-cap center">Next on the path: {nextChapter.title}</p>}
        </div>
      </div>
    </main>
  );
}

/** XP rolling up from zero once the stars have landed. */
function XpRoll({ value, delay }: { value: number; delay: number }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? value : 0);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setV(value);
      if (value > 0) sfx.tick();
    }, reduce ? 0 : delay * 1000);
    return () => clearTimeout(t);
  }, [value, delay, reduce]);
  return <AnimatedNumber value={v} />;
}
