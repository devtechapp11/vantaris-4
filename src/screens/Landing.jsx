import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import { Magnetic } from '../components/effects';
import PlanCard from '../components/PlanCard';
import Vale from '../components/vale/Vale';
import { money } from '../lib/format';
import { usePlans } from '../app/usePlans';
import { usePrefs } from '../app/prefs';
import { PITCH } from '../content/landing';
import { duration } from '../design/tokens';
import { BRAND } from '../lib/config';
import { track } from '../lib/analytics';
import LegalLinks from '../components/LegalLinks';
import DemoDeals from '../landing/demo/DemoDeals';
import './Landing.css';
import { fieldBus } from '../fx/field/fieldBus';
import BillingSwitch from '../components/pricing/BillingSwitch';
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

/**
 * The landing as a pitch: hook → promise → the deal → membership → the call.
 * One idea per screen. Vale is the hero; nothing else competes with it.
 */
export default function Landing() {
  const prefs = usePrefs();
  const reduce = useReducedMotion() || prefs.reduceMotion;
  useLenis(!reduce);
  useEffect(() => {
    fieldBus.setScene('landing');
    return () => fieldBus.setScene('app');
  }, []);
  useMeta({ path: '/' });
  return (
    <motion.div className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: duration.slow }}>
      <LandingNav />
      <main id="main" tabIndex={-1}>
        <Hook />
        <PromiseAct />
        <Deal />
        <Pricing />
        <Final />
      </main>
      <Footer />
    </motion.div>
  );
}

/* ---------- Top bar ---------- */
function LandingNav() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 24));
  return (
    <header className={`lnav ${solid ? 'lnav--solid glass' : ''}`}>
      <div className="lnav-inner">
        <Link to="/" className="lnav-brand" aria-label={`${BRAND.name}, home`}><Logo size={26} /></Link>
        <nav className="lnav-links" aria-label="Website">
          <a href="#pricing">Membership</a>
          <Link to="/signin">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}

/* ---------- Act 1 · Hook: Vale, alive. No title. ---------- */
function Hook() {
  return (
    <section className="act act--hook" aria-label="Vale, the Vantaris mentor">
      <div className="hook-vale">
        <Vale size={220} label="Vale, the Vantaris mentor" />
      </div>
      <p className="hook-cue kicker">{PITCH.hook}</p>
    </section>
  );
}

/* ---------- Act 2 · The promise ---------- */
function PromiseAct() {
  return (
    <section className="act act--promise" aria-labelledby="promise-title">
      <h1 id="promise-title" className="act-title">
        {PITCH.promise[0]} <span className="act-title-strong">{PITCH.promise[1]}</span>
      </h1>
      <p className="act-line">{PITCH.promiseLine}</p>
    </section>
  );
}

/* ---------- Act 3 · The live deal ---------- */
function Deal() {
  return (
    <section className="act act--deal" aria-labelledby="deal-title">
      <h2 id="deal-title" className="act-title act-title--sm">{PITCH.deal.title}</h2>
      <p className="act-line">{PITCH.deal.line}</p>
      <DemoDeals />
    </section>
  );
}

/* ---------- Act 7 · The call ---------- */
function Final() {
  return (
    <section className="act act--final" aria-labelledby="final-title">
      <h2 id="final-title" className="act-title">{PITCH.final.title}</h2>
      <StartCta source="final" label={PITCH.final.cta} />
    </section>
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
  // Savings come from the configured prices only: 12 × monthly − annual.
  const savings = tiers.map((t) => {
    const m = data?.plans.find((x) => x.tier === t.id && x.interval === 'monthly');
    const y = data?.plans.find((x) => x.tier === t.id && x.interval === 'yearly');
    return m && y ? { saving: m.amount * 12 - y.amount, currency: y.currency } : null;
  }).filter(Boolean);
  const hasAnnual = savings.length > 0;
  const best = savings.reduce((a, b) => (b.saving > (a?.saving ?? 0) ? b : a), null);
  const savingsLabel = best && best.saving > 0 ? `Save up to ${money(best.saving, best.currency)} a year` : undefined;
  return (
    <section id="pricing" className="lsec" aria-labelledby="pricing-title">
      <header className="lsec-head">
        <h2 id="pricing-title" className="act-title act-title--sm">{PITCH.membership.title}</h2>
        <p className="act-line">{PITCH.membership.line}</p>
      </header>
      {hasAnnual && (
        <div className="billing-row">
          <BillingSwitch annual={cycle === 'yearly'} onChange={(on) => setCycle(on ? 'yearly' : 'monthly')} savingsLabel={savingsLabel} />
        </div>
      )}
      {data ? (
        <div className="plans-grid">
          {tiers.map((t) => {
            const plan = data.plans.find((x) => x.tier === t.id && x.interval === cycle);
            const monthly = data.plans.find((x) => x.tier === t.id && x.interval === 'monthly');
            if (!plan) return null;
            return (
              <PlanCard
                key={t.id} tier={t} plan={plan} monthly={monthly} featured={t.id === 'pro'} glass
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

