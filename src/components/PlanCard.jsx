import { AnimatePresence, motion } from 'motion/react';
import { money } from '../lib/format';
import { group } from '../design/motion';
import { duration, ease, spring, stagger } from '../design/tokens';
import { Spinner } from './bits';
import { Spotlight } from './effects';
import './PlanCard.css';

const check = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: duration.base, ease: ease.out } },
};
const draw = {
  hidden: { pathLength: 0 },
  show: { pathLength: 1, transition: { duration: duration.slow, ease: ease.out } },
};

/** Animated check mark that draws itself when its row appears. */
export function DrawCheck({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="draw-check" aria-hidden="true">
      <circle cx="12" cy="12" r="11" />
      <motion.path d="M7 12.5l3.2 3.2L17 9" variants={draw} />
    </svg>
  );
}

/**
 * One plan, as a flat column. `featured` (Pro) carries the page's one primary
 * button and a small "Most popular" label. Feature checks tick in one after another.
 */
export default function PlanCard({ tier, plan, monthly, featured = false, current = false, busy = false, disabled = false, busyLabel, onSelect, cta, note }) {
  const elite = tier.id === 'elite';
  const yearly = plan.interval === 'yearly';
  const saving = yearly && monthly ? monthly.amount * 12 - plan.amount : 0;
  return (
    <motion.article
      className={`plan ${featured ? 'plan--featured' : ''} ${elite ? 'plan--elite' : ''}`}
      aria-labelledby={`plan-${tier.id}`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={group(stagger.list, 0.15)}
    >
      <Spotlight className="plan-inner">
      {featured && <span className="plan-flag">Most popular</span>}
      {current && <span className="plan-flag plan-flag--current">Current plan</span>}
      <header className="stack-4">
        <h3 id={`plan-${tier.id}`} className="plan-name">{tier.name}</h3>
        <p className="t-callout">{tier.tagline}</p>
      </header>
      <div className="plan-price">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={plan.id}
            className="price"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={spring.snappy}
          >
            {money(plan.amount, plan.currency)}
          </motion.span>
        </AnimatePresence>
        <span className="t-foot">{yearly ? '/year' : '/month'}</span>
      </div>
      <div className="plan-sub">
        {yearly ? (
          <span className="t-cap">{money(Math.round(plan.amount / 12), plan.currency)}/mo billed yearly</span>
        ) : (
          <span className="t-cap">Billed monthly · cancel anytime</span>
        )}
        <AnimatePresence>
          {saving > 0 && (
            <motion.span
              key="save"
              className="chip chip--strong plan-save"
              initial={{ opacity: 0, scale: 0.4, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={spring.bouncy}
            >
              Save {money(saving, plan.currency)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <ul className="plan-feats">
        {tier.features.map((f) => (
          <motion.li key={f} variants={check} className="feat">
            <DrawCheck />
            <span>{f}</span>
          </motion.li>
        ))}
      </ul>
      <button
        type="button"
        className={`btn ${featured ? 'btn--primary' : 'btn--secondary'} plan-cta`}
        disabled={disabled || current}
        onClick={onSelect}
      >
        {busy ? <><Spinner /> {busyLabel}</> : current ? 'Your current plan' : cta ?? `Continue with ${tier.name}`}
      </button>
      {note && <p className="t-cap center">{note}</p>}
      </Spotlight>
    </motion.article>
  );
}

/** Monthly / yearly switch; the "2 months free" badge bounces in on yearly. */
export function BillingToggle({ cycle, onChange }) {
  const yearly = cycle === 'yearly';
  return (
    <div className="billing">
      <div className="billing-track" role="group" aria-label="Billing cycle">
        {['monthly', 'yearly'].map((c) => (
          <button key={c} type="button" aria-pressed={cycle === c} onClick={() => onChange(c)}>
            {cycle === c && <motion.span layoutId="billing-thumb" className="billing-thumb" transition={spring.snappy} />}
            <span className="billing-label">{c === 'monthly' ? 'Monthly' : 'Yearly'}</span>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {yearly && (
          <motion.span
            className="chip chip--strong billing-badge"
            initial={{ opacity: 0, scale: 0.3, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={spring.bouncy}
          >
            2 months free
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
