import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Logo from '../components/Logo';
import PlanCard from '../components/PlanCard';
import LegalLinks from '../components/LegalLinks';
import BillingSwitch from '../components/pricing/BillingSwitch';
import { money } from '../lib/format';
import { usePlans } from '../app/usePlans';
import { usePrefs } from '../app/prefs';
import { useMeta } from '../app/useMeta';
import { BRAND } from '../lib/config';
import { track } from '../lib/analytics';
import { ACTS } from '../content/landing';
import { duration } from '../design/tokens';
import { fieldBus } from '../fx/field/fieldBus';
import { actBus, createStage } from '../landing/stage';
import { hasWebGL, isLowPower } from '../vale/lowPower';
import { siteSound } from '../vale/siteSound';
import { valeMidas } from '../vale/valeMidas';
import { valeRig } from '../vale/ValeModel';
import ValePoster from '../vale/ValePoster';
import SoundPill from '../vale/SoundPill';
import { DESKS, DESK_LABEL, DESK_WIDTH, preloadOutfits, valeOutfit } from '../vale/outfits/outfitRegistry';
import FirstDealCard, { PENDING_KEY } from '../onboarding/FirstDealCard';
import { saveState } from '../onboarding/machine';
import './Landing.css';

// The canvas, the camera rig and the post-processing: one chunk, after the first paint.
const LandingStage = lazy(() => import('../landing/LandingStage'));

const YEAR = new Date().getFullYear();
const SHORT = { analyst: 'Analyst', associate: 'Associate', vp: 'VP', md: 'MD' };

/**
 * The landing as a pitch in eight acts, over one fixed 3D stage: awakening,
 * hook, promise, the first deal, the dress code, the app, membership, the
 * call. Every act is real text in the DOM; without WebGL, Vale's poster
 * stands in for the canvas and nothing else changes.
 */
export default function Landing() {
  const prefs = usePrefs();
  const reduce = Boolean(useReducedMotion() || prefs.reduceMotion);
  const root = useRef(null);
  const [can3d] = useState(() => hasWebGL());
  const [lowPower] = useState(() => isLowPower());
  useMeta({ path: '/' });

  useEffect(() => {
    fieldBus.setScene('landing');
    // On the site, Vale's sounds go through the SOUND pill (off on every visit).
    const play = valeMidas.play;
    valeMidas.play = (fn) => siteSound.play(fn);
    return () => {
      fieldBus.setScene('app');
      valeMidas.play = play;
      valeOutfit.set(null);
      actBus.set(0);
    };
  }, []);

  // Lenis + ScrollTrigger + SplitText, landing only.
  useEffect(() => {
    if (!root.current) return undefined;
    const stage = createStage(root.current);
    return () => stage.destroy();
  }, []);

  // The act under the viewport's centre drives the canvas (ring, sound, tap).
  useEffect(() => {
    const acts = [...(root.current?.querySelectorAll('[data-act]') ?? [])];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting && actBus.set(Number(e.target.dataset.act)));
    }, { rootMargin: '-50% 0px -50% 0px' });
    acts.forEach((a) => io.observe(a));
    return () => io.disconnect();
  }, []);

  return (
    <motion.div ref={root} className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: duration.slow }}>
      {can3d ? (
        <Suspense fallback={<div className="lstage" aria-hidden="true"><ValePoster /></div>}>
          <LandingStage lowPower={lowPower} reduced={reduce} />
        </Suspense>
      ) : (
        <div className="lstage lstage--still" aria-hidden="true"><ValePoster /></div>
      )}
      <LandingNav />
      <main id="main" tabIndex={-1}>
        <Awaken />
        <Hook />
        <PromiseAct />
        <DealAct reduce={reduce} />
        <DressCode reduce={reduce} can3d={can3d} />
        <AppAct />
        <Membership />
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
    <header className={`lnav ${solid ? 'is-solid' : ''}`}>
      <div className="lnav-inner">
        <Link to="/" className="lnav-brand" aria-label={`${BRAND.name}, home`}><Logo size={26} /></Link>
        <nav className="lnav-links" aria-label="Website">
          <a href="#membership">Membership</a>
          <Link to="/signin">Sign in</Link>
          <SoundPill className="lnav-sound" />
        </nav>
      </div>
    </header>
  );
}

function PlayCta({ source, label }) {
  return (
    <Link to="/start" className="btn btn--primary btn--lg btn--auto" onClick={() => track('upgrade_click', { source: `landing-${source}` })}>
      {label} <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}

/* ---------- Act 0 · Awakening: no text, Vale in the dark ---------- */
function Awaken() {
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setHint(true), 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="act act--awaken" data-act="0" aria-label="Vale wakes up">
      <p className={`act-scroll kicker ${hint ? 'is-on' : ''}`} aria-hidden={!hint}>Scroll</p>
    </section>
  );
}

/* ---------- Act 1 · Hook ---------- */
function Hook() {
  return (
    <section className="act act--hook" data-act="1" aria-labelledby="hook-title">
      <h1 id="hook-title" className="act-title act-title--hero" data-split>
        {ACTS.hook.title[0]} <span className="act-title-strong">{ACTS.hook.title[1]}</span>
      </h1>
      <div className="act-ctas">
        <PlayCta source="hook" label={ACTS.hook.cta} />
        <Link to="/signin" className="btn btn--ghost btn--lg btn--auto">{ACTS.hook.secondary}</Link>
      </div>
    </section>
  );
}

/* ---------- Act 2 · Promise (the fly-over) ---------- */
function PromiseAct() {
  return (
    <section className="act act--promise" data-act="2" aria-labelledby="promise-title">
      <h2 id="promise-title" className="act-title act-title--sm" data-split>{ACTS.promise.title}</h2>
      <p className="act-line">{ACTS.promise.line}</p>
    </section>
  );
}

/* ---------- Act 3 · The first deal, playable ---------- */
function DealAct({ reduce }) {
  const navigate = useNavigate();
  return (
    <section className="act act--deal" data-act="3" aria-labelledby="deal-title">
      <div className="act-side">
        <h2 id="deal-title" className="act-title act-title--sm" data-split>{ACTS.deal.title}</h2>
        <FirstDealCard
          reduced={reduce}
          guest={false}
          sound={(fn) => siteSound.play(fn)}
          onClosed={(_xp, choice) => {
            // /start picks up from here: no second awakening, and the answer is closed on the server there.
            try {
              sessionStorage.setItem(PENDING_KEY, choice);
            } catch {
              /* private mode: /start replays the deal */
            }
            saveState({ step: 'deal', startedAt: Date.now() });
            navigate('/start');
          }}
        />
      </div>
    </section>
  );
}

/* ---------- Act 4 · Dress code: four desks, pinned and scrubbed ---------- */
function DressCode({ reduce, can3d }) {
  const sec = useRef(null);
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(0);
  const act = useSyncExternalStore(actBus.subscribe, () => actBus.current, () => 0);

  // The outfits load while the visitor reads act 3.
  useEffect(() => {
    if (act >= 3) preloadOutfits();
  }, [act]);

  useEffect(() => {
    const el = sec.current;
    if (!el) return undefined;
    let cur = -1;
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top center',
      end: 'bottom center',
      onUpdate: (self) => {
        const k = Math.min(3, Math.floor(self.progress * 4));
        if (k === cur) return;
        cur = k;
        setIdx(k);
        valeOutfit.set(DESKS[k]);
        if (!reduce) setFlash((f) => f + 1);
        siteSound.play((s) => s.panned(valeRig.pan, (p) => p.promotion()));
      },
      onLeave: () => {
        cur = -1;
        valeOutfit.set(null);
      },
      onLeaveBack: () => {
        cur = -1;
        valeOutfit.set(null);
      },
    });
    return () => st.kill();
  }, [reduce]);

  const desk = DESKS[idx];
  return (
    <section ref={sec} className="act act--dress" data-act="4" aria-labelledby="dress-title">
      <div className="dress-pin">
        <h2 id="dress-title" className="act-title act-title--sm">{ACTS.dress.title}</h2>
        <p className="dress-desk" style={{ fontStretch: DESK_WIDTH[desk] }} aria-live="polite">{DESK_LABEL[desk].toUpperCase()}</p>
        <ol className="dress-steps" aria-label="The four desks">
          {DESKS.map((d, i) => <li key={d} className={i === idx ? 'is-on' : ''}>{SHORT[d]}</li>)}
        </ol>
        {can3d && <p className="dress-hint kicker">{ACTS.dress.hint}</p>}
      </div>
      {flash > 0 && <span key={flash} className="dress-flash" aria-hidden="true" />}
    </section>
  );
}

/* ---------- Act 5 · The app: the real Path, in a phone ---------- */
function AppAct() {
  return (
    <section className="act act--app" data-act="5" aria-labelledby="app-title">
      <div className="app-copy">
        <h2 id="app-title" className="act-title act-title--sm" data-split>{ACTS.app.title}</h2>
        <p className="act-line">{ACTS.app.line}</p>
      </div>
      <figure className="phone">
        <img src="/landing/app-path.webp" alt="The Vantaris Path on a phone: the next chapter and its Start button." width={300} height={626} loading="lazy" decoding="async" />
      </figure>
    </section>
  );
}

/* ---------- Act 6 · Membership (plans from the configuration) ---------- */
function Membership() {
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
  const best = savings.reduce((a, b) => (b.saving > (a?.saving ?? 0) ? b : a), null);
  const savingsLabel = best && best.saving > 0 ? `Save up to ${money(best.saving, best.currency)} a year` : undefined;
  return (
    <section id="membership" className="act act--membership" data-act="6" aria-labelledby="membership-title">
      <h2 id="membership-title" className="act-title act-title--sm" data-split>{ACTS.membership.title}</h2>
      {savings.length > 0 && (
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
                onSelect={() => { track('upgrade_click', { plan: t.id, interval: cycle, source: 'landing' }); navigate('/start'); }}
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

/* ---------- Act 7 · The call (back to the opening shot) ---------- */
function Final() {
  return (
    <section className="act act--final" data-act="7" aria-labelledby="final-title">
      <h2 id="final-title" className="act-title" data-split>{ACTS.final.title}</h2>
      <PlayCta source="final" label={ACTS.final.cta} />
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
