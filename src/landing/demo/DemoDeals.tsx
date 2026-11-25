import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import SpecularCard from '../../components/fx/SpecularCard';
import AnimatedNumber from '../../components/fx/AnimatedNumber';
import MetalPlate from '../../components/fx/MetalPlate';
import { SoundToggle } from '../../components/Momentum';
import SoundBars from '../../components/sound/SoundBars';
import { springs } from '../../motion/springs';
import { sound } from '../../lib/sound';
import { haptic } from '../../app/prefs';
import { track } from '../../lib/analytics';
import { feverBurst, originOf } from '../../lib/celebrate';
import { fieldBus } from '../../fx/field/fieldBus';
import { DEMO_DEALS, gradeFor, xpFor } from './deals';
import { saveDemoScore, saveDemoTickets } from './demoScore';
import ThermalReceipt from '../../components/receipt/ThermalReceipt';
import './demo.css';

type Result = { right: boolean; xp: number; secs: number };
const KEYS = 'ABCD';

/**
 * « Try a live deal »: three deals before any sign-up (trading multiple → DCF →
 * LBO), answered by tap or with the A/B/C/D keys, each with an instant verdict.
 * Then the calibration screen, which is the only place the sign-up call
 * appears. The XP earned stays on this device (see demoScore.ts).
 */
export default function DemoDeals() {
  const card = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);
  const shownAt = useRef(performance.now());
  const inView = useRef(false);

  const deal = DEMO_DEALS[at];
  const xp = results.reduce((s, r) => s + r.xp, 0);
  const right = results.filter((r) => r.right).length;
  const run = (() => {
    let n = 0;
    for (let i = results.length - 1; i >= 0 && results[i].right; i--) n++;
    return n;
  })();

  const answer = useCallback((i: number) => {
    if (pick != null || done) return;
    const secs = (performance.now() - shownAt.current) / 1000;
    const ok = i === deal.answer;
    const gained = ok ? xpFor(secs) : 0;
    const next = [...results, { right: ok, xp: gained, secs }];
    setPick(i);
    setResults(next);
    saveDemoScore({ xp: next.reduce((s, r) => s + r.xp, 0), right: next.filter((r) => r.right).length, played: next.length, total: DEMO_DEALS.length });
    saveDemoTickets(next.length);
    track('hero_case', { deal: deal.id, correct: ok });
    if (ok) {
      sound.correct(run + 1);
      haptic([12, 40, 18]);
      fieldBus.pulse(card.current);
      window.setTimeout(() => feverBurst(2 + next.filter((r) => r.right).length, originOf(card.current?.querySelector('.dd-xp')) ?? undefined), 40);
    } else {
      sound.wrong();
      haptic([24, 50, 24]);
    }
  }, [pick, done, deal, results, run]);

  const advance = useCallback(() => {
    if (pick == null) return;
    sound.tap();
    if (at + 1 < DEMO_DEALS.length) {
      setAt(at + 1);
      setPick(null);
      shownAt.current = performance.now();
    } else {
      setDone(true);
      // Bring the calibration into view if the card's top has scrolled under the bar.
      requestAnimationFrame(() => {
        const r = card.current?.getBoundingClientRect();
        if (r && r.top < 72) window.scrollBy({ top: r.top - 88, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
      track('hero_case', { calibrated: right });
      if (right === DEMO_DEALS.length) window.setTimeout(() => feverBurst(5, originOf(card.current) ?? undefined), 120);
    }
  }, [pick, at, right]);

  const replay = () => {
    setAt(0);
    setPick(null);
    setResults([]);
    setDone(false);
    saveDemoTickets(0);
    shownAt.current = performance.now();
  };

  // A/B/C/D (or 1–4) answer, Enter moves on, only while the card is on screen.
  useEffect(() => {
    const el = card.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { inView.current = e.isIntersecting; }, { threshold: 0.4 });
    io.observe(el);
    const onKey = (e: KeyboardEvent) => {
      if (!inView.current || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = e.key.toUpperCase();
      const i = KEYS.indexOf(k) >= 0 ? KEYS.indexOf(k) : ['1', '2', '3', '4'].indexOf(k);
      if (i >= 0 && pick == null && !done) {
        e.preventDefault();
        answer(i);
      } else if (e.key === 'Enter' && pick != null && !done && (e.target as HTMLElement | null)?.tagName !== 'BUTTON') {
        e.preventDefault();
        advance();
      }
    };
    addEventListener('keydown', onKey);
    return () => {
      io.disconnect();
      removeEventListener('keydown', onKey);
    };
  }, [answer, advance, pick, done]);

  const ok = pick != null && pick === deal.answer;

  // One ticket only: the last deal closed.
  const lastAt = results.length - 1;
  const lastResult = results[lastAt];
  const ticket = lastResult ? (() => {
    const d = DEMO_DEALS[lastAt];
    return (
      <ThermalReceipt
        key={d.id}
        heading="Deal ticket"
        meta={`Vantaris floor · ${String(lastAt + 1).padStart(2, '0')}/03 · Example`}
        lines={[
          { label: 'Method', value: d.kind },
          ...d.ticket.map(([label, value]) => ({ label, value })),
          { label: 'Time to close', value: `${lastResult.secs.toFixed(1)}s` },
          { label: 'Verdict', value: lastResult.right ? 'CORRECT' : 'REVIEWED', strong: true },
        ]}
        stamp={done ? `Calibrated · ${gradeFor(right)}` : null}
        footnote={done ? 'Save your desk to keep this ticket.' : undefined}
      />
    );
  })() : null;

  return (
    <>
    <SpecularCard className={`dd ${pick == null ? '' : ok ? 'is-right' : 'is-miss'}`} pad={false}>
      <div ref={card} className="dd-inner">
        <header className="dd-head">
          <span className="t-eyebrow">{done ? 'Calibration' : <>Try a live deal<span className="dd-nosign"> · no sign-up</span></>}</span>
          <span className="dd-head-r">
            <span className="dd-step fig-mono">{String(Math.min(results.length + (done ? 0 : pick == null ? 1 : 0), 3)).padStart(2, '0')}/03</span>
            <SoundBars />
            <SoundToggle />
          </span>
        </header>
        <ol className="dd-pips" aria-hidden="true">
          {DEMO_DEALS.map((d, i) => (
            <li key={d.id} className={results[i] ? (results[i].right ? 'is-right' : 'is-miss') : i === at && !done ? 'is-now' : ''} />
          ))}
        </ol>

        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.div key="cal" className="dd-cal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={springs.soft}>
              <div className="dd-cal-top">
                <p className="dd-cal-score fig-mono" aria-label={`${right} out of 3`}>
                  {right}<small>/3</small>
                </p>
                <MetalPlate tone={right === 3 ? 'platinum' : 'steel'} size="lg">{gradeFor(right)}</MetalPlate>
              </div>
              <p className="t-callout">{right === 3 ? 'Three for three. Your desk is ready: keep your score and start the path.' : 'You have the reflex. Save your desk and the path takes it from here.'}</p>
              <Link to="/signup" className="btn btn--primary btn--lg dd-cta" onClick={() => track('upgrade_click', { source: 'landing-calibration' })}>
                Save your desk — Start free <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <button type="button" className="dd-replay" onClick={replay}><RotateCcw size={14} aria-hidden="true" /> Replay the three deals</button>
            </motion.div>
          ) : (
            <motion.div key={deal.id} className="dd-deal" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={springs.snappy}>
              <p className="dd-kind">{deal.kind}</p>
              <p className="dd-q">{deal.q}</p>
              <div className="dd-opts" role="radiogroup" aria-label="Your answer">
                {deal.options.map((o, i) => {
                  const state = pick == null ? 'idle' : i === deal.answer ? 'answer' : i === pick ? 'wrong' : 'dim';
                  return (
                    <motion.button
                      key={o} type="button" role="radio" aria-checked={pick === i} aria-keyshortcuts={KEYS[i]}
                      className="option dd-opt metal metal--live" data-state={state} disabled={pick != null}
                      onClick={() => answer(i)} whileTap={{ scale: 0.97 }} transition={springs.snappy}
                    >
                      <span className="option-key">{state === 'answer' ? <Check size={14} strokeWidth={3} /> : state === 'wrong' ? <X size={14} strokeWidth={3} /> : KEYS[i]}</span>
                      <span className="option-label fig-mono">{o}</span>
                    </motion.button>
                  );
                })}
              </div>
              <AnimatePresence initial={false}>
                {pick != null && (
                  <motion.div className="dd-verdict" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} aria-live="polite">
                    <div className="dd-verdict-row">
                      <span className={`dd-mark ${ok ? 'is-right' : 'is-miss'}`}>{ok ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : <X size={15} strokeWidth={3} aria-hidden="true" />}{ok ? 'Right call' : 'Not this time'}</span>
                      <span className="dd-xp fig-mono">
                        {ok && <motion.b initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.heavy}>+{results[results.length - 1]?.xp}</motion.b>}
                        <span className="dd-xp-total"><AnimatedNumber value={xp} /> XP</span>
                      </span>
                    </div>
                    <p className="dd-why fig">{ok ? deal.why : <>The right call: <b className="fig-mono">{deal.options[deal.answer]}</b>. {deal.why}</>}</p>
                    <button type="button" className="btn btn--primary btn--md dd-next" onClick={advance} autoFocus>
                      {at + 1 < DEMO_DEALS.length ? `Next deal · ${String(at + 2).padStart(2, '0')}/03` : 'See my calibration'} <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SpecularCard>
    {ticket && <section className="dd-tickets" aria-label="Your deal ticket">{ticket}</section>}
    </>
  );
}
