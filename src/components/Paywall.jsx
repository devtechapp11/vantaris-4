import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { LEVEL_TIER, monthlyPlan, usePlans } from '../app/usePlans';
import { money, weekday } from '../lib/format';
import { Sheet } from './chrome';
import Mascot from './Mascot';

const COPY = {
  quota: (me) => ({
    title: "You've used this week's free problems",
    body: `Keep your streak going with unlimited practice. Your free problems come back on ${me?.quota?.resets_at ? weekday(me.quota.resets_at) : 'Monday'}.`,
    tier: 'core',
  }),
  level: (_, extra) => ({
    title: `This module is part of ${{ core: 'Core', pro: 'Pro', elite: 'Elite' }[LEVEL_TIER[extra.level]] ?? 'a paid plan'}`,
    body: 'Unlock harder modules and the deals interviewers actually ask about.',
    tier: LEVEL_TIER[extra.level] ?? 'core',
  }),
  tutor: () => ({
    title: 'Learn faster with the AI tutor',
    body: 'Get hints, formulas and explanations on any problem, without the answer being spoiled.',
    tier: 'pro',
  }),
  steps: () => ({
    title: 'See every step of the solution',
    body: 'Free shows the first two steps. Core and above show the full walkthrough on every problem.',
    tier: 'core',
  }),
  eliteCard: () => ({
    title: 'Elite member card',
    body: 'Your score and level on a card you can show off, plus everything else Vantaris offers.',
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
    navigate('/plans', { state: { highlight } });
  };

  return (
    <Sheet open={Boolean(paywall)} onClose={closePaywall}>
      {(titleId) =>
        copy && (
          <div className="sheet-body">
            <div className="stack-12" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 8 }}>
              <Mascot mood="think" size={88} />
              <h2 id={titleId} className="t-title-2">{copy.title}</h2>
              <p className="t-callout" style={{ maxWidth: 380 }}>{copy.body}</p>
            </div>
            {tier && (
              <div className={`plan ${tier.id === 'elite' ? 'plan--elite' : 'plan--featured'}`}>
                <div className="between">
                  <div>
                    <div className="t-headline">{tier.name}</div>
                    <div className="t-foot" style={{ color: tier.id === 'elite' ? 'var(--on-ink-2)' : undefined }}>{tier.tagline}</div>
                  </div>
                  {price && (
                    <div style={{ textAlign: 'right' }}>
                      <span className="fig" style={{ fontSize: 22, fontWeight: 600 }}>{money(price.amount, price.currency)}</span>
                      <span className="t-cap" style={{ color: tier.id === 'elite' ? 'var(--on-ink-2)' : undefined }}> /month</span>
                    </div>
                  )}
                </div>
                <div className="stack-8">
                  {tier.features.slice(0, 3).map((f) => (
                    <div key={f} className="feat"><Check size={17} strokeWidth={2.6} aria-hidden="true" />{f}</div>
                  ))}
                </div>
              </div>
            )}
            <div className="stack-4">
              <button type="button" className={`btn ${copy.tier === 'elite' ? 'btn--brass' : 'btn--accent'}`} onClick={() => go(copy.tier)}>
                Continue with {tier?.name ?? 'a plan'}
              </button>
              <button type="button" className="btn btn--plain" onClick={() => go(null)}>Compare all plans</button>
            </div>
          </div>
        )
      }
    </Sheet>
  );
}
