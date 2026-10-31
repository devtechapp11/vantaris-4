import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Crown } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { LEVEL_TIER, monthlyPlan, usePlans } from '../app/usePlans';
import { money, weekday } from '../lib/format';
import { group } from '../design/motion';
import { stagger } from '../design/tokens';
import { Sheet } from './chrome';
import { DrawCheck } from './PlanCard';
import Mascot from './Mascot';
import { track } from '../lib/analytics';

const COPY = {
  quota: (me) => ({
    title: 'You’ve used this week’s free deals',
    body: `Keep your streak going with unlimited practice. Your free deals come back on ${me?.quota?.resets_at ? weekday(me.quota.resets_at) : 'Monday'}.`,
    tier: 'core',
  }),
  level: (_, extra) => ({
    title: `This desk opens with ${{ core: 'Core', pro: 'Pro', elite: 'Elite' }[LEVEL_TIER[extra.level]] ?? 'a paid plan'}`,
    body: 'Unlock harder modules and the deals interviewers actually ask about.',
    tier: LEVEL_TIER[extra.level] ?? 'core',
  }),
  tutor: () => ({
    title: 'Learn faster with Vale',
    body: 'Hints, formulas and explanations on any deal, without the answer being spoiled.',
    tier: 'pro',
  }),
  steps: () => ({
    title: 'See every step of the solution',
    body: 'Free shows the first two steps. Core and above show the full walkthrough on every deal.',
    tier: 'core',
  }),
  eliteCard: () => ({
    title: 'The Elite member card',
    body: 'Your score and tier on a card worth showing off, plus everything else Vantaris offers.',
    tier: 'elite',
  }),
};

export default function Paywall() {
  const { paywall, closePaywall, me } = useApp();
  const navigate = useNavigate();
  const { data } = usePlans();
  const copy = paywall ? (COPY[paywall.reason] ?? COPY.steps)(me, paywall) : null;
  const tier = copy && data?.tiers.find((t) => t.id === copy.tier);
  const price = copy && monthlyPlan(data, copy.tier);

  const go = (highlight) => {
    closePaywall();
    track('upgrade_click', { source: 'paywall' });
    navigate('/plans', { state: { highlight } });
  };

  return (
    <Sheet open={Boolean(paywall)} onClose={closePaywall}>
      {(titleId) =>
        copy && (
          <div className="sheet-body">
            <div className="stack-12 center-x center" style={{ paddingTop: 'var(--sp-2)' }}>
              <Mascot mood="think" size={110} />
              <h2 id={titleId} className="t-h2">{copy.title}</h2>
              <p className="t-callout" style={{ maxWidth: 400 }}>{copy.body}</p>
            </div>
            {tier && (
              <div className={`plan ${copy.tier === 'elite' ? 'plan--elite' : 'plan--featured'}`} style={{ animation: 'none' }}>
                <div className="between">
                  <div className="stack-4">
                    <span className="row-8"><Crown size={16} className="c-fg" aria-hidden="true" /><span className="plan-name">{tier.name}</span></span>
                    <span className="t-foot">{tier.tagline}</span>
                  </div>
                  {price && (
                    <div style={{ textAlign: 'right' }}>
                      <span className="price" style={{ fontSize: 'var(--fs-2xl)' }}>{money(price.amount, price.currency)}</span>
                      <span className="t-cap"> /month</span>
                    </div>
                  )}
                </div>
                <motion.ul className="plan-feats" variants={group(stagger.list, 0.2)} initial="hidden" animate="show">
                  {tier.features.slice(0, 3).map((f) => (
                    <motion.li key={f} className="feat" variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}>
                      <DrawCheck /><span>{f}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            )}
            <div className="stack-4">
              <button type="button" className="btn btn--primary" onClick={() => go(copy.tier)}>
                Continue with {tier?.name ?? 'a plan'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => go(null)}>Compare all plans</button>
            </div>
          </div>
        )
      }
    </Sheet>
  );
}
