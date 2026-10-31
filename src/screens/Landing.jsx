import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform,
} from 'motion/react';
import {
  ArrowRight, Briefcase, ChevronLeft, ChevronRight, Clock, ListChecks, Quote, Sparkles, Timer, TrendingUp, Trophy,
} from 'lucide-react';
import Logo from '../components/Logo';
import Mascot from '../components/Mascot';
import Scene3D from '../components/three/Scene3D';
import { ConstellationFallback, SculptureFallback } from '../components/three/Fallbacks';
import { Reveal, TiltCard } from '../components/ui';
import { Avatar, TierBadge } from '../components/bits';
import PlanCard, { BillingToggle } from '../components/PlanCard';
import { useCan3D, useMedia, BREAKPOINT } from '../app/useDevice';
import { usePlans } from '../app/usePlans';
import { SOCIAL_PROOF_MIN, usePublicModules, usePublicStats } from '../app/usePublic';
import { FEATURES, LADDER, SAMPLE_DEAL, TESTIMONIALS, TICKER } from '../content/landing';
import { item } from '../design/motion';
import { duration, ease, parallax, spring, stagger } from '../design/tokens';
import { BRAND, IS_DEMO } from '../lib/config';
import './Landing.css';

const ICONS = { briefcase: Briefcase, trending: TrendingUp, sparkles: Sparkles, timer: Timer, trophy: Trophy, steps: ListChecks };
const SECTIONS = [['how', 'How it works'], ['ladder', 'Career path'], ['pricing', 'Pricing'], ['reviews', 'Reviews']];
const SHOW_REVIEWS = IS_DEMO || TESTIMONIALS.every((t) => !t.sample);
const YEAR = new Date().getFullYear();

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export default function Landing() {
  const can3D = useCan3D();
  return (
    <motion.div className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: duration.slow }}>
      <Scene3D scene="hero" variant="landing" className="landing-bg" fallback={<ConstellationFallback />} />
      <ScrollProgress />
      <LandingNav />
      <main id="top">
        <Hero can3D={can3D} />
        <Ticker />
        <Features />
        <Ladder />
        <Peek />
        <Pricing />
        {SHOW_REVIEWS && <Reviews />}
        <FinalCta />
      </main>
      <Footer />
    </motion.div>
  );
}

/* ---------- Chrome ---------- */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}

function LandingNav() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setSolid(y > 24));
  const visible = SECTIONS.filter(([id]) => id !== 'reviews' || SHOW_REVIEWS);
  return (
    <header className={`lnav ${solid ? 'lnav--solid' : ''}`}>
      <div className="lnav-inner">
        <button type="button" className="lnav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Vantaris, back to top">
          <Logo size={28} />
        </button>
        <nav className="lnav-links" aria-label="Sections">
          {visible.map(([id, label]) => (
            <button key={id} type="button" onClick={() => scrollTo(id)}>{label}</button>
          ))}
        </nav>
        <div className="lnav-actions">
          <Link to="/signin" className="btn btn--ghost btn--auto lnav-signin">Sign in</Link>
          <span className="cta-conic"><Link to="/signup" className="btn btn--md btn--auto lnav-cta">Get started</Link></span>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */
const word = {
  hidden: { y: '110%', opacity: 0, rotateX: -40 },
  show: { y: '0%', opacity: 1, rotateX: 0, transition: { duration: duration.reveal, ease: ease.out } },
};

function WordReveal({ text, delay = 0, gold = false }) {
  const words = text.split(' ');
  return (
    <motion.span
      className="words"
      aria-hidden="true"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger.words, delayChildren: delay } } }}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="word-mask">
          <motion.span className={`word ${gold ? 'text-gold' : ''}`} variants={word}>{w}</motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </motion.span>
  );
}

function Hero({ can3D }) {
  const ref = useRef(null);
  const desktop = useMedia(BREAKPOINT.desktop);
  const tablet = useMedia(BREAKPOINT.tablet);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', `${parallax.subtle * 100}%`]);
  const visualY = useTransform(scrollYProgress, [0, 1], ['0%', `${parallax.deep * 100}%`]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const valeSize = desktop ? 360 : tablet ? 300 : 230;

  return (
    <section ref={ref} className="hero" aria-labelledby="hero-title">
      <motion.div className="hero-copy" style={{ y: copyY, opacity: fade }}>
        <motion.span className="chip chip--strong hero-chip" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: duration.slow, delay: 0.05 }}>
          <Sparkles size={13} aria-hidden="true" /> The LeetCode of investment banking
        </motion.span>
        <h1 id="hero-title" className="t-display hero-title">
          <span className="sr-only">{BRAND.tagline}</span>
          <WordReveal text="Don't study finance." delay={0.05} />
          <br aria-hidden="true" />
          <WordReveal text="Do finance." delay={0.28} gold />
        </h1>
        <motion.p className="t-lead hero-lead" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: duration.reveal, delay: 0.4, ease: ease.out }}>
          Solve real M&amp;A, LBO and DCF deal simulations in minutes. Climb from Analyst to MD with Vale, your AI tutor, in your corner.
        </motion.p>
        <motion.div className="hero-ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: duration.reveal, delay: 0.5, ease: ease.out }}>
          <span className="cta-conic"><Link to="/signup" className="btn btn--lg btn--auto">Start free <ArrowRight size={18} aria-hidden="true" /></Link></span>
          <button type="button" className="btn btn--secondary btn--lg btn--auto" onClick={() => scrollTo('peek')}>See a deal</button>
        </motion.div>
        <motion.p className="t-foot hero-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          Free plan, no card needed. Three deals a week, forever.
        </motion.p>
        <HeroStats />
      </motion.div>

      <motion.div className="hero-visual" style={{ y: visualY }}>
        {!can3D && <SculptureFallback className="hero-sculpt" />}
        <motion.div
          className="hero-vale"
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...spring.gentle, delay: 0.35 }}
        >
          <div className="hero-vale-glow" aria-hidden="true" />
          <Mascot mood="welcome" size={valeSize} label="Vale, the Vantaris fox, in a navy suit with a gold V tie pin" />
          <motion.div
            className="hero-bubble"
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spring.bouncy, delay: 1 }}
          >
            Let’s close this deal.
          </motion.div>
        </motion.div>
      </motion.div>

      <button type="button" className="scroll-cue" onClick={() => scrollTo('how')} aria-label="Scroll to how it works">
        <span /><i />
      </button>
    </section>
  );
}

function SpringNumber({ value }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const mv = useSpring(0, { stiffness: 38, damping: 18, mass: 1 });
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString('en-US'));
  useEffect(() => {
    if (!inView) return;
    if (reduce) mv.jump(value);
    else mv.set(value);
  }, [inView, value, reduce, mv]);
  return <motion.span ref={ref} className="fig">{text}</motion.span>;
}

function HeroStats() {
  const stats = usePublicStats();
  const items = [
    stats?.deals_solved >= SOCIAL_PROOF_MIN && { value: stats.deals_solved, label: 'deals solved' },
    stats?.players >= SOCIAL_PROOF_MIN && { value: stats.players, label: 'future analysts' },
    stats?.problems && { value: stats.problems, label: 'real deal problems' },
    { value: 4, label: 'career tiers' },
  ].filter(Boolean).slice(0, 3);
  return (
    <AnimatePresence>
      {stats !== undefined && (
        <motion.dl className="hero-stats" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: duration.slow }}>
          {items.map((s) => (
            <div key={s.label} className="hero-stat">
              <dt className="t-foot">{s.label}</dt>
              <dd><SpringNumber value={s.value} /></dd>
            </div>
          ))}
        </motion.dl>
      )}
    </AnimatePresence>
  );
}

/* ---------- Terminal ticker ---------- */
function Ticker() {
  const row = [...TICKER, ...TICKER];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {row.map(([k, v], i) => (
          <span key={`${k}-${i}`} className="ticker-item">
            <span className="ticker-k">{k}</span>
            <span className={`ticker-v fig ${i % 3 === 0 ? 'c-fg' : 'c-fg'}`}>{v}</span>
            <span className={i % 4 === 1 ? 'c-neg' : 'c-pos'}>{i % 4 === 1 ? '▼' : '▲'}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Sections ---------- */
function SectionHead({ eyebrow, title, lead, id }) {
  return (
    <Reveal gap={stagger.children} className="lsec-head">
      <motion.p variants={item} className="t-eyebrow">{eyebrow}</motion.p>
      <motion.h2 variants={item} id={id} className="lsec-title">{title}</motion.h2>
      {lead && <motion.p variants={item} className="t-lead lsec-lead">{lead}</motion.p>}
    </Reveal>
  );
}

function Features() {
  return (
    <section id="how" className="lsec" aria-labelledby="how-title">
      <SectionHead id="how-title" eyebrow="How it works" title={<>A deal desk in your pocket.</>} lead="Every problem is a real-world deal: read the brief, work the numbers, beat the clock. Then see exactly how a banker would do it." />
      <Reveal gap={stagger.list} className="feature-grid" amount={0.1}>
        {FEATURES.map((f) => {
          const Icon = ICONS[f.icon] ?? Sparkles;
          return (
            <motion.div key={f.title} variants={item} style={{ height: '100%' }}>
              <TiltCard className="feature-card">
                <span className="feature-icon"><Icon size={22} aria-hidden="true" /></span>
                <h3 className="t-title">{f.title}</h3>
                <p className="t-callout">{f.body}</p>
              </TiltCard>
            </motion.div>
          );
        })}
      </Reveal>
    </section>
  );
}

function Ladder() {
  const modules = usePublicModules();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 80, damping: 24 });
  return (
    <section id="ladder" className="lsec" aria-labelledby="ladder-title" ref={ref}>
      <SectionHead id="ladder-title" eyebrow="Career path" title="From Analyst to MD." lead="Every first-time correct answer earns points. Points move you up the ladder, and each promotion unlocks a harder desk." />
      <div className="ladder">
        <div className="ladder-rail" aria-hidden="true"><motion.i style={{ scaleX: fill }} /></div>
        <Reveal gap={stagger.list} className="ladder-grid" amount={0.15}>
          {LADDER.map((l) => {
            const mods = modules?.filter((m) => m.level === l.level) ?? [];
            return (
              <motion.div key={l.level} variants={item} className="ladder-card" data-tier={l.level}>
                <span className="ladder-node" aria-hidden="true" />
                <TierBadge level={l.level} />
                <div className="fig ladder-pts">{l.points.toLocaleString('en-US')}<span className="t-foot"> pts</span></div>
                <p className="t-callout">{l.line}</p>
                {mods.length > 0 && (
                  <div className="row-8 wrap">
                    {mods.map((m) => <span key={m.id} className="chip">{m.short}</span>)}
                  </div>
                )}
              </motion.div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

function Peek() {
  const d = SAMPLE_DEAL;
  return (
    <section id="peek" className="lsec peek" aria-labelledby="peek-title">
      <div className="peek-copy">
        <SectionHead id="peek-title" eyebrow="Inside a deal" title="Built like a terminal. Plays like a game." lead="Five inputs, one question, a clock. Tap any figure to drop it into the calculator, ask Vale for a nudge, and lock in your answer." />
        <Reveal gap={stagger.list} className="peek-points">
          {[
            [Clock, 'Speed bonus', 'Up to +50% points for answering inside the time.'],
            [Sparkles, 'Hints, not answers', 'Vale nudges you forward without spoiling the solve.'],
            [ListChecks, 'Full walkthrough', 'Every step and formula, the moment you submit.'],
          ].map(([Icon, t, b]) => (
            <motion.div key={t} variants={item} className="row" style={{ alignItems: 'flex-start' }}>
              <span className="feature-icon feature-icon--sm"><Icon size={18} aria-hidden="true" /></span>
              <span className="stack-4"><span className="t-headline">{t}</span><span className="t-callout">{b}</span></span>
            </motion.div>
          ))}
        </Reveal>
      </div>
      <Reveal className="terminal" amount={0.3}>
        <div className="terminal-bar">
          <span className="terminal-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="t-cap fig">VANTARIS · DEAL DESK</span>
          <span className="timer-pill fig"><Clock size={12} aria-hidden="true" /> 04:12</span>
        </div>
        <div className="terminal-body">
          <div className="stack-4">
            <span className="t-eyebrow">{d.kind}</span>
            <h3 className="t-h3">{d.title}</h3>
          </div>
          <dl className="terminal-terms">
            {d.terms.map(([k, v]) => (
              <div key={k} className="between"><dt className="t-callout">{k}</dt><dd className="fig">{v}</dd></div>
            ))}
          </dl>
          <p className="t-headline">{d.question}</p>
          <div className="terminal-options">
            {d.options.map((o, i) => (
              <div key={o} className={`terminal-option ${i === d.pick ? 'is-picked' : ''}`}>
                <span className="terminal-key">{'ABCD'[i]}</span><span className="fig">{o}</span>
              </div>
            ))}
          </div>
        </div>
        <motion.div
          className="terminal-vale"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ ...spring.bouncy, delay: 0.5 }}
        >
          <Mascot mood="think" size={64} variant="face" decorative />
          <p className="t-callout"><b className="c-fg">Vale:</b> {d.hint}</p>
        </motion.div>
      </Reveal>
    </section>
  );
}

function Pricing() {
  const navigate = useNavigate();
  const { data } = usePlans();
  const [cycle, setCycle] = useState('monthly');
  const tiers = data?.tiers.filter((t) => t.id !== 'free') ?? [];
  return (
    <section id="pricing" className="lsec" aria-labelledby="pricing-title">
      <SectionHead id="pricing-title" eyebrow="Pricing" title="Start free. Go pro when you're ready." lead="Every plan includes the leaderboard, streaks and the full Analyst desk. Cancel anytime." />
      <div className="center" style={{ marginBottom: 'var(--sp-10)' }}><BillingToggle cycle={cycle} onChange={setCycle} /></div>
      {data ? (
        <div className="plans-grid">
          {tiers.map((t) => {
            const plan = data.plans.find((p) => p.tier === t.id && p.interval === cycle);
            const monthly = data.plans.find((p) => p.tier === t.id && p.interval === 'monthly');
            if (!plan) return null;
            return <PlanCard key={t.id} tier={t} plan={plan} monthly={monthly} featured={t.id === 'pro'} onSelect={() => navigate('/signup')} cta={`Start with ${t.name}`} />;
          })}
        </div>
      ) : (
        <div className="plans-grid">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 460 }} />)}</div>
      )}
      <p className="t-foot center" style={{ marginTop: 'var(--sp-6)' }}>Prices in Indian rupees. Payments processed securely by Razorpay.</p>
    </section>
  );
}

function Reviews() {
  const track = useRef(null);
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const step = (dir) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector('.review');
    const w = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir > 0 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
    else el.scrollBy({ left: dir * w, behavior: 'smooth' });
  };
  useEffect(() => {
    if (reduce || paused) return undefined;
    const t = setInterval(() => step(1), 5200);
    return () => clearInterval(t);
  }, [reduce, paused]);
  return (
    <section id="reviews" className="lsec" aria-labelledby="reviews-title">
      <div className="between reviews-head">
        <SectionHead id="reviews-title" eyebrow="Reviews" title="Future dealmakers, on Vantaris." />
        <div className="row-8">
          <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label="Previous review"><ChevronLeft size={20} /></button>
          <button type="button" className="icon-btn" onClick={() => step(1)} aria-label="Next review"><ChevronRight size={20} /></button>
        </div>
      </div>
      <div
        ref={track}
        className="reviews"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        tabIndex={0}
        aria-label="Reviews, scroll horizontally"
      >
        {TESTIMONIALS.map((t, i) => (
          <figure key={i} className="review card card--glass">
            <div className="between">
              <Quote size={26} className="c-fg" aria-hidden="true" />
              {t.sample && <span className="chip">Sample quote</span>}
            </div>
            <blockquote className="review-quote">{t.quote}</blockquote>
            <figcaption className="row">
              <Avatar name={t.name} variant="me" />
              <span className="grow stack-4">
                <span className="t-label c-fg">{t.name}</span>
                <span className="t-cap">{t.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="lsec final" aria-labelledby="final-title">
      <Reveal className="final-card">
        <div className="final-glow" aria-hidden="true" />
        <Mascot mood="levelup" size={180} decorative />
        <div className="stack-16 final-copy">
          <h2 id="final-title" className="lsec-title">Your first deal is waiting.</h2>
          <p className="t-lead">Five minutes. One question. A banker’s walkthrough the moment you answer.</p>
          <div className="hero-ctas">
            <span className="cta-conic"><Link to="/signup" className="btn btn--lg btn--auto">Create free account <ArrowRight size={18} aria-hidden="true" /></Link></span>
            <Link to="/signin" className="btn btn--ghost btn--lg btn--auto">I have an account</Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lfoot">
      <div className="lfoot-inner">
        <Logo size={24} />
        <nav className="row-16 wrap" aria-label="Footer">
          <button type="button" onClick={() => scrollTo('pricing')}>Pricing</button>
          <Link to="/signin">Sign in</Link>
          <Link to="/signup">Create account</Link>
          <a href={`mailto:${BRAND.support}`}>{BRAND.support}</a>
        </nav>
        <p className="t-cap">© {YEAR} {BRAND.name}. Built for future dealmakers.</p>
      </div>
    </footer>
  );
}
