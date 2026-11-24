import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import Logo from '../components/Logo';
import { Magnetic } from '../components/effects';
import SpecularCard from '../components/fx/SpecularCard';
import { TierBadge } from '../components/bits';
import PlanCard, { BillingToggle } from '../components/PlanCard';
import { useMedia } from '../app/useDevice';
import { usePlans } from '../app/usePlans';
import { usePrefs } from '../app/prefs';
import { CHAPTERS, LADDER, SAMPLE_DEAL } from '../content/landing';
import { duration, ease } from '../design/tokens';
import { BRAND } from '../lib/config';
import { track } from '../lib/analytics';
import LegalLinks from '../components/LegalLinks';
import DemoDeals from '../landing/demo/DemoDeals';
import MonolithStage from '../landing/hero/MonolithStage';
import Shutter from '../landing/hud/Shutter';
import HudOverlay from '../landing/hud/HudOverlay';
import './Landing.css';
import { fieldBus } from '../fx/field/fieldBus';
import { useMeta } from '../app/useMeta';

const YEAR = new Date().getFullYear();

/** Lenis smooth scrolling, on the public website only, loaded on demand. */
function useLenis(enabled) {
  useEffect(() => {
    // Touch scrolling is already native and smooth; Lenis only helps wheels.
    if (!enabled || window.matchMedia?.('(pointer: coarse)').matches) return undefined;
    let lenis = null;
    let raf = 0;
    let alive = true;
    import('lenis').then(({ default: Lenis }) => {
      if (!alive) return;
      lenis = new Lenis({ lerp: 0.12, smoothWheel: true, anchors: true });
      const loop = (t) => {
        lenis.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, [enabled]);
}

export default function Landing() {
  const prefs = usePrefs();
  const reduce = useReducedMotion() || prefs.reduceMotion;
  // Side-by-side film from 900px; phones and small tablets get a stacked film
  // where every panel sits in the flow under its chapter (nothing pinned, nothing overlaid).
  const wide = useMedia('(min-width: 900px)');
  useLenis(!reduce);
  useEffect(() => {
    fieldBus.setScene('landing');
    return () => fieldBus.setScene('app');
  }, []);
  useMeta({ path: '/' });
  return (
    <motion.div className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: duration.slow }}>
      <Shutter />
      <HudOverlay />
      {wide && !reduce && <MonolithStage variant="fixed" />}
      <LandingNav />
      <main id="main" tabIndex={-1}>
        {reduce ? <StillFilm /> : wide ? <Film /> : <MobileFilm />}
        <Pricing />
      </main>
      <Footer />
    </motion.div>
  );
}

/* ---------- Top bar (glass) ---------- */
function LandingNav() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 24));
  return (
    <header className={`lnav ${solid ? 'lnav--solid glass' : ''}`}>
      <div className="lnav-inner">
        <Link to="/" className="lnav-brand" aria-label={`${BRAND.name}, home`}><Logo size={26} /></Link>
        <nav className="lnav-links" aria-label="Website">
          <a href="#film">The method</a>
          <a href="#pricing">Membership</a>
          <Link to="/signin">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}

/* ---------- The scroll film ---------- */

/**
 * Chapters scroll natively (nothing is pinned or hijacked). A sticky stage
 * behind them shows the mascot and one visual per chapter; `t` is the
 * fractional chapter under the reading line, so visuals scrub with the scroll.
 */
function Film() {
  const ref = useRef(null);
  const chapters = useRef([]);
  const t = useMotionValue(0);
  const [index, setIndex] = useState(0);
  const mobile = !useMedia('(min-width: 900px)');
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', () => {
    const line = window.innerHeight * (mobile ? 0.72 : 0.5);
    const els = chapters.current;
    let next = 0;
    for (let i = 0; i < els.length; i++) {
      const r = els[i]?.getBoundingClientRect();
      if (!r) continue;
      if (r.top <= line) next = i + Math.min(1, (line - r.top) / r.height) - 0.5;
    }
    t.set(Math.max(0, next));
    const i = Math.max(0, Math.min(CHAPTERS.length - 1, Math.round(next)));
    if (i !== index) setIndex(i);
  });

  return (
    <section ref={ref} id="film" className="film" aria-label="How Vantaris works">
      <Stage index={index} t={t} />
      <div className="film-chapters">
        {CHAPTERS.map((c, i) => (
          <article key={c.id} ref={(el) => { chapters.current[i] = el; }} data-ledger={i === 1 ? 'method' : undefined} className={`chapter chapter--${c.id} ${i === index ? 'is-active' : ''}`} aria-labelledby={`ch-${c.id}`}>
            <div className="chapter-copy">
              <p className="t-eyebrow">{c.eyebrow}</p>
              {i === 0 ? (
                <HeroTitle c={c} />
              ) : (
                <h2 id={`ch-${c.id}`} className="chapter-title">{c.title}</h2>
              )}
              <p className="t-lead">{c.body}</p>
              {i === 0 && <HeroDemo />}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Stage({ index, t }) {
  const c = CHAPTERS[index];
  const hero = c.visual === 'hero';
  const local = useTransform(t, (v) => Math.max(0, Math.min(1, v - index + 0.5)));

  return (
    <div className="film-stage" aria-hidden="true">
      <div className="stage-scrim" />
      <AnimatePresence mode="wait">
        {!hero && (
          <motion.div
            key={c.visual}
            className="stage-panel"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out } }}
            exit={{ opacity: 0, y: -16, transition: { duration: duration.fast } }}
          >
            <Visual kind={c.visual} p={local} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Visual({ kind, p, metal = false }) {
  if (kind === 'deal') return <DealSheet p={p} />;
  if (kind === 'answer') return <AnswerSheet p={p} metal={metal} />;
  if (kind === 'chart') return <ReturnsChart p={p} metal={metal} />;
  if (kind === 'ladder') return <RankLadder p={p} metal={metal} />;
  if (kind === 'tutor') return <TutorBubble p={p} metal={metal} />;
  return null;
}
const sheet = (metal) => `sheet-panel${metal ? ' sheet-panel--inline' : ''}`;

/** A motion value as React state, rounded to a few steps (keeps re-renders rare). */
function useStep(mv, steps) {
  const [v, setV] = useState(() => Math.round(mv.get() * steps));
  useMotionValueEvent(mv, 'change', (x) => {
    const n = Math.round(x * steps);
    if (n !== v) setV(n);
  });
  return v;
}

function DealSheet({ p }) {
  const shown = useStep(p, SAMPLE_DEAL.terms.length + 1);
  return (
    <SpecularCard className="sheet-panel" pad={false}>
      <p className="t-eyebrow">{SAMPLE_DEAL.kind}</p>
      <p className="panel-title">{SAMPLE_DEAL.title}</p>
      <dl className="ledger">
        {SAMPLE_DEAL.terms.map(([k, v], i) => (
          <div key={k} className={`ledger-row ${i < Math.max(2, shown) ? 'is-in' : ''}`}>
            <dt>{k}</dt><dd className="fig-mono">{v}</dd>
          </div>
        ))}
      </dl>
    </SpecularCard>
  );
}

function AnswerSheet({ p, metal }) {
  const step = useStep(p, 10);
  const picked = step >= 4;
  const scored = step >= 7;
  const ring = useTransform(p, [0, 1], [0, 1]);
  return (
    <SpecularCard className={sheet(metal)} pad={false}>
      <div className="between">
        <p className="t-eyebrow">Question</p>
        <svg width="28" height="28" viewBox="0 0 28 28" className="mini-timer" aria-hidden="true">
          <circle cx="14" cy="14" r="12" className="mini-timer-track" />
          <motion.circle cx="14" cy="14" r="12" className="mini-timer-fill" style={{ pathLength: useTransform(ring, (v) => 1 - v * 0.8) }} />
        </svg>
      </div>
      <p className="panel-q">{SAMPLE_DEAL.question}</p>
      <ul className="opts">
        {SAMPLE_DEAL.options.map((o, i) => (
          <li key={o} className={`opt ${picked && i === SAMPLE_DEAL.pick ? (scored ? 'is-right' : 'is-picked') : ''}`}>
            <span className="opt-key">{'ABCD'[i]}</span><span className="fig-mono">{o}</span>
            {scored && i === SAMPLE_DEAL.pick && <Check size={16} className="c-pos opt-check" aria-hidden="true" />}
          </li>
        ))}
      </ul>
      <p className={`panel-score ${scored ? 'is-in' : ''}`}><span className="c-pos fig-mono">+18</span> <span className="c-3">pts · ahead of the clock</span></p>
    </SpecularCard>
  );
}

// Sponsor equity compounding at the sample deal's IRR (23.0%), year 0 → 5.
const EQUITY = [160, 197, 242, 298, 366, 450];

function ReturnsChart({ p, metal }) {
  const W = 420, H = 220, L = 40, R = 16, T = 18, B = 30;
  const x = (i) => L + (i * (W - L - R)) / (EQUITY.length - 1);
  const y = (v) => T + (H - T - B) * (1 - (v - 100) / 400);
  const d = EQUITY.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const draw = useTransform(p, [0.1, 0.85], [0, 1]);
  const done = useStep(p, 10) >= 8;
  const steps = ['Exit EV  8.0x × $70M = $560M', 'Exit equity  $560M − $110M = $450M', 'MOIC  $450M ÷ $160M = 2.81x', 'IRR  2.81^(1/5) − 1 = 23.0%'];
  const shown = useStep(p, steps.length + 1);
  return (
    <SpecularCard className={sheet(metal)} pad={false}>
      <div className="between">
        <p className="t-eyebrow">Sponsor equity, $M</p>
        <p className={`fig panel-irr ${done ? 'is-in' : ''}`}><span className="c-pos">+23.0%</span> <span className="c-3">IRR</span></p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="returns" role="img" aria-label="Sponsor equity grows from $160M to $450M over five years, a 23% IRR.">
        {[100, 300, 500].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={L - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="chart-tick">{v}</text>
          </g>
        ))}
        {EQUITY.map((_, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="chart-tick">Y{i}</text>)}
        <motion.path d={d} fill="none" stroke="var(--platinum)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" style={{ pathLength: draw }} />
      </svg>
      <ol className="mini-steps">
        {steps.map((s, i) => <li key={s} className={`fig ${i < shown ? 'is-in' : ''}`}>{s}</li>)}
      </ol>
    </SpecularCard>
  );
}

function RankLadder({ p, metal }) {
  const lit = Math.min(LADDER.length, 1 + useStep(p, LADDER.length));
  return (
    <SpecularCard className={sheet(metal)} pad={false}>
      <p className="t-eyebrow">Your career track</p>
      <ol className="rungs">
        {[...LADDER].reverse().map((l) => {
          const n = LADDER.findIndex((x) => x.level === l.level);
          return (
            <li key={l.level} className={`rung ${n < lit ? 'is-lit' : ''} ${n === lit - 1 ? 'is-now' : ''}`}>
              <TierBadge level={l.level} />
              <span className="grow t-foot">{l.line}</span>
              <span className="fig t-cap">{l.points}+ pts</span>
            </li>
          );
        })}
      </ol>
    </SpecularCard>
  );
}

function TutorBubble({ p, metal }) {
  const step = useStep(p, 6);
  return (
    <SpecularCard className={sheet(metal)} pad={false}>
      <p className="t-eyebrow">Vale · your coach</p>
      <div className="bubbles">
        <p className={`bub bub--me ${step >= 1 ? 'is-in' : ''}`}>Where do I start with the IRR?</p>
        <div className={`bub bub--ai ${step >= 2 ? 'is-in' : ''}`}>
          <p>{SAMPLE_DEAL.hint}</p>
          <p className="c-3">Want the formula for exit equity?</p>
        </div>
      </div>
    </SpecularCard>
  );
}

/**
 * Phones and small tablets: the same chapters, stacked. Each chapter's copy is
 * followed by its panel in the normal flow, and the panel scrubs as it scrolls
 * into view, so nothing is pinned behind or on top of the text.
 */
function MobileFilm() {
  const hero = CHAPTERS[0];
  return (
    <section id="film" className="mfilm" aria-label="How Vantaris works">
      <article className="mch mch--hero" aria-labelledby={`ch-${hero.id}`}>
        <MonolithStage variant="inline" />
        <div className="chapter-copy">
          <p className="t-eyebrow">{hero.eyebrow}</p>
          <HeroTitle c={hero} />
          <p className="t-lead">{hero.body}</p>
          <HeroDemo />
        </div>
      </article>
      {CHAPTERS.slice(1).map((c, i) => <MobileChapter key={c.id} c={c} method={i === 0} />)}
    </section>
  );
}

function MobileChapter({ c, method }) {
  const ref = useRef(null);
  // 0 when the panel's top enters the screen, 1 once its middle reaches the upper half
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center 0.5'] });
  return (
    <article className="mch" data-ledger={method ? 'method' : undefined} aria-labelledby={`ch-${c.id}`}>
      <div className="chapter-copy">
        <p className="t-eyebrow">{c.eyebrow}</p>
        <h2 id={`ch-${c.id}`} className="chapter-title">{c.title}</h2>
        <p className="t-lead">{c.body}</p>
      </div>
      <motion.div
        ref={ref}
        className="mch-visual"
        aria-hidden="true"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: duration.slow, ease: ease.out }}
      >
        <Visual kind={c.visual} p={scrollYProgress} metal />
      </motion.div>
    </article>
  );
}

/** Reduced motion: the same story as plain sections, nothing scrubbed. */
function StillFilm() {
  const still = useMotionValue(1);
  return (
    <section id="film" className="still" aria-label="How Vantaris works">
      {CHAPTERS.map((c, i) => (
        <article key={c.id} className={`still-ch ${i === 0 ? 'still-ch--hero' : ''}`} aria-labelledby={`ch-${c.id}`}>
          <div className="chapter-copy">
            <p className="t-eyebrow">{c.eyebrow}</p>
            {i === 0 ? <HeroTitle c={c} still /> : <h2 id={`ch-${c.id}`} className="chapter-title">{c.title}</h2>}
            <p className="t-lead">{c.body}</p>
            {i === 0 && <HeroDemo />}
          </div>
          {i === 0 ? null : <div className="still-visual"><Visual kind={c.visual} p={still} /></div>}
        </article>
      ))}
    </section>
  );
}

/* ---------- Three demo deals, playable before any sign-up ---------- */
/** « Don’t study finance. Command the floor. »: chrome display face, one editorial italic line. */
function HeroTitle({ c, still = false }) {
  return (
    <h1 id={`ch-${c.id}`} className={`t-display hero-title hero-title--dc ${still ? '' : 'text-chrome--live'}`}>
      {c.title}{c.titleEditorial && <> <span className="editorial">{c.titleEditorial}</span></>}
    </h1>
  );
}

function HeroDemo() {
  return (
    <div className="hero-demo">
      <DemoDeals />
      <Link to="/signup" className="dd-skip link" onClick={() => track('upgrade_click', { source: 'landing-skip' })}>Skip the demo, start free</Link>
    </div>
  );
}

/* ---------- Pricing + the one call to action ---------- */
function StartCta({ source, label = 'Start free' }) {
  return (
    <Magnetic className="cta-wrap">
      <Link to="/signup" className="btn btn--primary btn--lg btn--auto" onClick={() => track('upgrade_click', { source: `landing-${source}` })}>
        {label} <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </Magnetic>
  );
}

function Pricing() {
  const navigate = useNavigate();
  const { data } = usePlans();
  const [cycle, setCycle] = useState('monthly');
  const tiers = data?.tiers.filter((t) => t.id !== 'free') ?? [];
  return (
    <section id="pricing" className="lsec" aria-labelledby="pricing-title">
      <header className="lsec-head" data-ledger="membership">
        <p className="t-eyebrow">Membership</p>
        <h2 id="pricing-title" className="chapter-title">Start free. Scale when you’re ready.</h2>
        <p className="t-lead">Three deals a week, free for as long as you like. Paid plans open every desk, the full debriefs and Vale. Cancel anytime.</p>
      </header>
      <BillingToggle cycle={cycle} onChange={setCycle} />
      {data ? (
        <div className="plans-grid">
          {tiers.map((t) => {
            const plan = data.plans.find((x) => x.tier === t.id && x.interval === cycle);
            const monthly = data.plans.find((x) => x.tier === t.id && x.interval === 'monthly');
            if (!plan) return null;
            return (
              <PlanCard
                key={t.id} tier={t} plan={plan} monthly={monthly} featured={t.id === 'pro'}
                onSelect={() => { track('upgrade_click', { plan: t.id, interval: cycle, source: 'landing' }); navigate('/signup'); }}
                cta={`Start with ${t.name}`}
              />
            );
          })}
        </div>
      ) : (
        <div className="plans-grid">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 460 }} />)}</div>
      )}
      <p className="t-foot">Prices in Indian rupees, taxes as applicable. Payments by Razorpay. See the <Link className="link" to="/subscription-terms">subscription terms</Link> and <Link className="link" to="/refund">refund policy</Link>.</p>
      <SpecularCard className="final">
        <p className="final-line">Five minutes. One deal. Your first rung.</p>
        <StartCta source="final" label="Take your first deal" />
      </SpecularCard>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lfoot">
      <div className="lfoot-inner">
        <div className="stack-12">
          <Logo size={24} />
          <p className="t-cap">© {YEAR} {BRAND.name}. Practice problems for education; not investment advice.</p>
        </div>
        <LegalLinks />
      </div>
    </footer>
  );
}

