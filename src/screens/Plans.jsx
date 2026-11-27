import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Lock, Minus, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { openCheckout } from '../lib/razorpay';
import { useApp } from '../app/AppContext';
import { usePlans } from '../app/usePlans';
import { haptic } from '../app/prefs';
import { Item, NavBar, Page, Sheet } from '../components/chrome';
import { Skeleton, TIER_LABEL, Spinner } from '../components/bits';
import PlanCard, { BillingToggle, DrawCheck, yearlySaving } from '../components/PlanCard';
import Mascot from '../components/Mascot';
import { group } from '../design/motion';
import { spring, stagger } from '../design/tokens';
import { shower } from '../lib/celebrate';
import { money } from '../lib/format';
import { IS_DEMO, BRAND } from '../lib/config';
import './Plans.css';
import { track } from '../lib/analytics';
import ThermalReceipt from '../components/receipt/ThermalReceipt';
import '../components/fx/glass.css';
import SaveDesk from '../onboarding/SaveDesk';
import { useMeta } from '../app/useMeta';

const LEVEL_SCOPE = { Analyst: 'Analyst', Associate: 'Up to Associate', VP: 'Up to VP', MD: 'All four, up to MD' };

// Comparison rows come from the tier rows in the database, so they never drift from what's enforced.
const ROWS = [
  ['Deals per week', (t) => (t.weekly_problem_limit == null ? 'Unlimited' : String(t.weekly_problem_limit))],
  ['Career modules', (t) => LEVEL_SCOPE[t.max_level] ?? t.max_level],
  ['Full step-by-step solutions', (t) => t.full_walkthroughs],
  ['Vale, AI tutor', (t) => (t.tutor_daily_limit >= 300 ? 'Unlimited' : t.tutor_daily_limit > 0 ? `${t.tutor_daily_limit} / day` : false)],
  ['Leaderboard and streaks', () => true],
  ['Elite member card', (t) => t.id === 'elite'],
];

export default function Plans() {
  useMeta({ title: 'Plans' });
  const navigate = useNavigate();
  const location = useLocation();
  const { me, refreshMe, showToast } = useApp();
  const { data, error } = usePlans();
  const [cycle, setCycle] = useState('monthly');
  const [stage, setStage] = useState(null); // { planId, step: 'starting' | 'paying' | 'confirming' }
  const [demoCheckout, setDemoCheckout] = useState(null);
  const [success, setSuccess] = useState(null);
  const highlight = location.state?.highlight ?? 'pro';
  const current = me?.tier?.id ?? 'free';
  const hasPlan = current !== 'free';

  // A guest desk links an account before paying: the receipt and the plan need a reachable owner.
  const [linkFirst, setLinkFirst] = useState(false);
  const start = async (plan) => {
    if (stage) return;
    if (await api.isAnonymous?.().catch(() => false)) {
      setLinkFirst(true);
      return;
    }
    setStage({ planId: plan.id, step: 'starting' });
    track('upgrade_click', { plan: plan.tier, interval: plan.interval, source: 'plans' });
    try {
      const checkout = await api.startCheckout(plan.id);
      if (checkout.demo) {
        setDemoCheckout(checkout);
        setStage({ planId: plan.id, step: 'paying' });
        return;
      }
      setStage({ planId: plan.id, step: 'paying' });
      const response = await openCheckout(checkout);
      await confirm(response, plan);
    } catch (err) {
      setStage(null);
      showToast(err.message, err.code === 'DISMISSED' ? 'info' : 'error');
    }
  };

  const confirm = async (response, plan) => {
    setStage({ planId: plan.id, step: 'confirming' });
    try {
      const res = await api.confirmPayment(response);
      await refreshMe();
      setSuccess({ plan, receipt: res?.receipt ?? null });
    } catch (err) {
      // If only the confirmation call failed (network), the webhook still
      // activates a real payment, so tell the player what to expect.
      const transient = ['NETWORK', 'UNKNOWN', 'INTERNAL', 'PAYMENT_PROVIDER_UNAVAILABLE'].includes(err.code);
      showToast(transient ? 'Payment received. Your plan will appear within a minute; reopen the app if it doesn’t.' : `${err.message} Need help? Write to ${BRAND.support}.`, transient ? 'info' : 'error');
      refreshMe().catch(() => {});
    } finally {
      setStage(null);
    }
  };

  const tiers = data?.tiers.filter((t) => t.id !== 'free') ?? [];
  const allTiers = data?.tiers ?? [];

  return (
    <>
      <NavBar back="Back" />
      <Page wide className="screen screen--bare plans-page">
        <Item className="plans-hero">
          <div className="stack-12">
            <p className="t-eyebrow">Plans</p>
            <h1 className="t-h1 plans-title">Invest in your career.<br /><span className="c-3">Cancel anytime.</span></h1>
            <p className="t-body">You keep access until the end of the period you paid for. Your progress always stays.</p>
          </div>
          <Mascot mood="levelup" size={150} className="plans-vale" label="Vale adjusting a tie, ready for the next level" />
        </Item>
        <Item className="center"><BillingToggle cycle={cycle} onChange={setCycle} saving={yearlySaving(data?.plans)} /></Item>

        {linkFirst && (
          <Item className="plans-link">
            <p className="t-body"><b>Save your desk first.</b> Plans attach to an account, so your progress and your receipt stay yours.</p>
            <SaveDesk onSaved={() => {}} onContinue={() => setLinkFirst(false)} />
          </Item>
        )}
        {error && <div className="alert" role="alert">{error.message}</div>}
        {!data ? (
          <div className="plans-grid">{[0, 1, 2].map((i) => <Skeleton key={i} height={480} />)}</div>
        ) : (
          <Item className="plans-grid">
            {tiers.map((t) => {
              const plan = data.plans.find((p) => p.tier === t.id && p.interval === cycle);
              const monthly = data.plans.find((p) => p.tier === t.id && p.interval === 'monthly');
              if (!plan) return null;
              const busy = stage?.planId === plan.id;
              return (
                <PlanCard
                  key={t.id}
                  tier={t}
                  plan={plan}
                  monthly={monthly}
                  featured={t.id === highlight}
                  current={current === t.id}
                  busy={busy}
                  busyLabel={stage?.step === 'confirming' ? 'Confirming payment' : 'Opening checkout'}
                  disabled={hasPlan || Boolean(stage)}
                  onSelect={() => start(plan)}
                  note={hasPlan && current !== t.id ? `To switch, cancel your ${TIER_LABEL[current]} plan in Profile first.` : null}
                />
              );
            })}
          </Item>
        )}

        {data && (
          <Item as="section" className="stack-16" aria-labelledby="compare">
            <div className="section-head"><h2 id="compare">Compare plans</h2></div>
            <div className="compare card card--flush" role="table" aria-label="Plan comparison" style={{ '--cols': allTiers.length }}>
              <div className="compare-row compare-head" role="row">
                <span role="columnheader" />
                {allTiers.map((t) => (
                  <span key={t.id} role="columnheader" className={`compare-tier ${t.id === highlight ? 'is-hl' : ''}`}>
                    {t.name}
                    {current === t.id && <span className="t-cap">Current</span>}
                  </span>
                ))}
              </div>
              {ROWS.map(([label, get], ri) => (
                <motion.div key={label} className="compare-row" role="row" variants={group(stagger.list, ri * 0.06)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }}>
                  <span role="rowheader" className="t-callout c-fg">{label}</span>
                  {allTiers.map((t) => {
                    const v = get(t);
                    return (
                      <span key={t.id} role="cell" className={`compare-cell ${t.id === highlight ? 'is-hl' : ''}`}>
                        {v === true ? <DrawCheck size={20} /> : v === false ? <Minus size={16} className="c-3" aria-label="Not included" /> : <span className="t-label c-fg">{v}</span>}
                      </span>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </Item>
        )}

        <Item className="stack-8 center">
          <p className="t-foot row-8" style={{ justifyContent: 'center' }}>
            <ShieldCheck size={15} aria-hidden="true" /> Payments are processed securely by Razorpay. We never see your card or UPI details.
          </p>
          <p className="t-cap">Prices in Indian rupees. Renews automatically until you cancel. Unlimited tutor messages are subject to a fair-use limit of 300 a day.</p>
        </Item>
      </Page>

      {IS_DEMO && <DemoCheckout
        checkout={demoCheckout}
        onClose={() => {
          setDemoCheckout(null);
          setStage(null);
          showToast('Checkout closed. You weren’t charged.');
        }}
        onPay={async () => {
          const plan = demoCheckout.plan;
          setDemoCheckout(null);
          await confirm({ demo: true, plan }, plan);
        }}
      />}
      <AnimatePresence>
        {stage?.step === 'confirming' && (
          <motion.div className="paid paid--confirming" role="status" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass-stat paid-confirming">
              <Spinner />
              <p className="glass__eyebrow">Confirming payment…</p>
              <p className="t-cap">Checking the payment with Razorpay on our server. Don’t close this page.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Success success={success} tiers={data?.tiers} onDone={() => { setSuccess(null); navigate('/', { replace: true }); }} />
    </>
  );
}

// Preview build only: stands in for Razorpay, clearly labelled, no payment form.
function DemoCheckout({ checkout, onClose, onPay }) {
  return (
    <Sheet open={Boolean(checkout)} onClose={onClose}>
      {(titleId) => checkout && (
        <div className="sheet-body">
          <span className="chip chip--strong" style={{ alignSelf: 'flex-start' }}><Lock size={12} aria-hidden="true" /> Preview checkout</span>
          <h2 id={titleId} className="t-h3">{TIER_LABEL[checkout.plan.tier]}, billed {checkout.plan.interval}</h2>
          <div className="group">
            <div className="cell"><span className="grow cell-title">Due today</span><span className="fig t-headline">{money(checkout.plan.amount, checkout.plan.currency)}</span></div>
          </div>
          <p className="t-callout">
            This preview has no payment system. In the live app, Razorpay’s secure checkout opens here for card, UPI or net banking, and the payment is verified on the server before the plan unlocks.
          </p>
          <button type="button" className="btn btn--primary" onClick={onPay}>Simulate a successful payment</button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
        </div>
      )}
    </Sheet>
  );
}

function Success({ success, tiers, onDone }) {
  const plan = success?.plan ?? null;
  const receipt = success?.receipt ?? null;
  const tier = plan && tiers?.find((t) => t.id === (receipt?.tier ?? plan.tier));
  useEffect(() => {
    if (!plan) return;
    shower();
    haptic([20, 60, 30]);
  }, [plan]);
  return (
    <AnimatePresence>
      {plan && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paid-title"
          className="paid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="paid-card stack-16 center-x center" initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} transition={spring.gentle}>
            {receipt ? (
              <ThermalReceipt
                className="paid-receipt"
                heading="Payment receipt"
                meta={receipt.preview ? 'Vantaris · preview' : 'Vantaris · Razorpay'}
                lines={[
                  { label: 'Plan', value: `${tier?.name ?? receipt.tier ?? plan.tier} · ${receipt.interval ?? plan.interval}` },
                  ...(receipt.paid_at ? [{ label: 'Date', value: new Date(receipt.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }] : []),
                  ...(receipt.method ? [{ label: 'Method', value: String(receipt.method).toUpperCase() }] : []),
                  { label: 'Payment', value: receipt.payment_id },
                  { label: 'Amount', value: money(receipt.amount, receipt.currency), strong: true },
                ]}
                stamp={receipt.preview ? 'Preview · not charged' : 'Paid'}
                footnote={receipt.invoice_emailed ? 'A copy was sent to your email.' : undefined}
              />
            ) : (
              <Mascot mood="levelup" size={170} />
            )}
            <p className="t-eyebrow">Payment confirmed</p>
            <h1 id="paid-title" className="t-h1">Welcome to {tier?.name ?? 'your new plan'}</h1>
            <motion.ul className="paid-feats" variants={group(stagger.list, 0.3)} initial="hidden" animate="show">
              {tier?.features.map((f) => (
                <motion.li key={f} className="feat" variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}>
                  <Check size={17} strokeWidth={2.6} className="c-fg" aria-hidden="true" />{f}
                </motion.li>
              ))}
            </motion.ul>
            <button type="button" className="btn btn--primary" onClick={onDone} autoFocus>Start practicing</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
