import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ShieldCheck, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { openCheckout } from '../lib/razorpay';
import { useApp } from '../app/AppContext';
import { usePlans } from '../app/usePlans';
import { NavBar, Page, Segmented, Sheet } from '../components/chrome';
import { Skeleton, Spinner, TIER_LABEL } from '../components/bits';
import Mascot from '../components/Mascot';
import { money } from '../lib/format';
import { IS_DEMO } from '../lib/config';

const CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly · 2 months free' },
];

export default function Plans() {
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

  const start = async (plan) => {
    if (stage) return;
    setStage({ planId: plan.id, step: 'starting' });
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
      await api.confirmPayment(response);
      await refreshMe();
      setSuccess(plan);
    } catch (err) {
      // If only the confirmation call failed (network), the webhook still
      // activates a real payment, so tell the player what to expect.
      const transient = ['NETWORK', 'UNKNOWN', 'INTERNAL', 'PAYMENT_PROVIDER_UNAVAILABLE'].includes(err.code);
      showToast(transient ? 'Payment received. Your plan will appear within a minute; reopen the app if it doesn’t.' : err.message, transient ? 'info' : 'error');
      refreshMe().catch(() => {});
    } finally {
      setStage(null);
    }
  };

  const tiers = data?.tiers.filter((t) => t.id !== 'free') ?? [];
  const free = data?.tiers.find((t) => t.id === 'free');

  return (
    <>
      <NavBar back="Back" />
      <Page className="screen screen--bare" pushed>
        <header className="stack-8" style={{ paddingTop: 4 }}>
          <h1 className="t-large">Choose your plan</h1>
          <p className="t-body">Cancel anytime. You keep access until the end of the period you paid for.</p>
        </header>
        <Segmented value={cycle} onChange={setCycle} options={CYCLES} label="Billing cycle" />

        {error && <div className="alert" role="alert">{error.message}</div>}
        {!data ? (
          <div className="stack-16"><Skeleton height={260} /><Skeleton height={260} /></div>
        ) : (
          <div className="stack-16" style={{ paddingTop: 6 }}>
            {tiers.map((t) => {
              const plan = data.plans.find((p) => p.tier === t.id && p.interval === cycle);
              if (!plan) return null;
              const monthly = data.plans.find((p) => p.tier === t.id && p.interval === 'monthly');
              const isCurrent = current === t.id;
              const busy = stage?.planId === plan.id;
              const featured = t.id === highlight;
              return (
                <motion.article
                  key={t.id}
                  layout
                  className={`plan ${t.id === 'elite' ? 'plan--elite' : featured ? 'plan--featured' : ''}`}
                  aria-labelledby={`plan-${t.id}`}
                >
                  {t.id === 'pro' && <span className="chip chip--accent plan-flag" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>Most popular</span>}
                  {isCurrent && <span className="chip chip--brass plan-flag" style={t.id === 'pro' ? { left: 128 } : undefined}>Current plan</span>}
                  <div className="between" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <h2 id={`plan-${t.id}`} className="t-title-2">{t.name}</h2>
                      <p className="t-callout">{t.tagline}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="price">{money(plan.amount, plan.currency)}</div>
                      <div className="t-cap" style={{ color: t.id === 'elite' ? 'var(--on-ink-2)' : undefined }}>
                        {cycle === 'yearly' ? `per year · ${money(Math.round(plan.amount / 12), plan.currency)}/mo` : 'per month'}
                      </div>
                      {cycle === 'yearly' && monthly && (
                        <div className="t-cap" style={{ color: t.id === 'elite' ? 'var(--brass-bright)' : 'var(--pos)', fontWeight: 600 }}>
                          Save {money(monthly.amount * 12 - plan.amount, plan.currency)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="stack-8">
                    {t.features.map((f) => (
                      <div key={f} className="feat"><Check size={17} strokeWidth={2.6} aria-hidden="true" />{f}</div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`btn ${t.id === 'elite' ? 'btn--brass' : featured ? 'btn--accent' : 'btn--tonal'}`}
                    disabled={isCurrent || hasPlan || Boolean(stage)}
                    onClick={() => start(plan)}
                  >
                    {busy ? (
                      <><Spinner /> {stage.step === 'confirming' ? 'Confirming payment' : 'Opening checkout'}</>
                    ) : isCurrent ? 'Your current plan' : `Continue with ${t.name}`}
                  </button>
                  {hasPlan && !isCurrent && (
                    <p className="t-cap center" style={{ color: t.id === 'elite' ? 'var(--on-ink-2)' : undefined }}>
                      To switch, cancel your {TIER_LABEL[current]} plan in Profile first.
                    </p>
                  )}
                </motion.article>
              );
            })}

            {free && (
              <div className="group">
                <div className="cell">
                  <span className="grow">
                    <span className="cell-title" style={{ display: 'block' }}>Free</span>
                    <span className="cell-sub">{free.features.join(' · ')}</span>
                  </span>
                  {current === 'free' && <span className="chip">Current</span>}
                </div>
              </div>
            )}

            <div className="stack-8">
              <p className="t-foot row-8" style={{ justifyContent: 'center' }}>
                <ShieldCheck size={15} aria-hidden="true" /> Payments are processed securely by Razorpay. We never see your card or UPI details.
              </p>
              <p className="t-cap center">Prices in Indian rupees. Renews automatically until you cancel. Unlimited tutor messages are subject to a fair-use limit of 300 a day.</p>
            </div>
          </div>
        )}
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
      <Success plan={success} tiers={data?.tiers} onDone={() => { setSuccess(null); navigate('/', { replace: true }); }} />
    </>
  );
}

// Preview build only: stands in for Razorpay, clearly labelled, no payment form.
function DemoCheckout({ checkout, onClose, onPay }) {
  return (
    <Sheet open={Boolean(checkout)} onClose={onClose}>
      {(titleId) => checkout && (
        <div className="sheet-body">
          <span className="chip chip--brass" style={{ alignSelf: 'flex-start' }}><Lock size={12} aria-hidden="true" /> Preview checkout</span>
          <h2 id={titleId} className="t-title-2">{TIER_LABEL[checkout.plan.tier]}, billed {checkout.plan.interval}</h2>
          <div className="group">
            <div className="cell"><span className="grow cell-title">Due today</span><span className="fig">{money(checkout.plan.amount, checkout.plan.currency)}</span></div>
          </div>
          <p className="t-callout">
            This preview has no payment system. In the live app, Razorpay’s secure checkout opens here for card, UPI or net banking, and the payment is verified on the server before the plan unlocks.
          </p>
          <button type="button" className="btn btn--accent" onClick={onPay}>Simulate a successful payment</button>
          <button type="button" className="btn btn--plain" onClick={onClose}>Cancel</button>
        </div>
      )}
    </Sheet>
  );
}

function Success({ plan, tiers, onDone }) {
  const tier = plan && tiers?.find((t) => t.id === plan.tier);
  return (
    <AnimatePresence>
      {plan && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paid-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'var(--bg)', overflowY: 'auto' }}
        >
          <div className="screen screen--bare" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}>
              <Mascot mood="celebrate" size={150} />
            </motion.div>
            <p className="t-foot">Payment confirmed</p>
            <h1 id="paid-title" className="t-large">Welcome to {tier?.name ?? 'your new plan'}</h1>
            <div className="card stack-8" style={{ width: '100%', textAlign: 'left' }}>
              {tier?.features.map((f) => (
                <div key={f} className="feat"><Check size={17} strokeWidth={2.6} aria-hidden="true" />{f}</div>
              ))}
            </div>
            <button type="button" className="btn btn--accent" onClick={onDone}>Start practicing</button>
            {api.mode === 'live' && <p className="t-cap">A receipt from Razorpay is on its way to your email.</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
