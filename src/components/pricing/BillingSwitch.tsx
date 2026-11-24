import { motion } from 'motion/react';
import { sfx } from '../../lib/sfx/engine';
import { haptics, HAPTIC } from '../../lib/haptics';
import { springs } from '../../motion/springs';
import './billing-switch.css';

type Props = { annual: boolean; onChange: (annual: boolean) => void; savingsLabel?: string };

/** Glass pill with a switch cap overlapping its right end: Monthly ↔ Annual. */
export default function BillingSwitch({ annual, onChange, savingsLabel }: Props) {
  return (
    <div className="billing-switch">
      <div className="billing-switch__glass">
        <span className="billing-switch__title">{annual ? 'Annual billing' : 'Switch to annual'}</span>
        {savingsLabel && <span className="billing-switch__sub num">{savingsLabel}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={annual}
        aria-label="Annual billing"
        className="billing-switch__cap"
        onClick={() => { sfx.tick(); haptics.fire(HAPTIC.tick); onChange(!annual); }}
      >
        <span className="billing-switch__track" data-on={annual}>
          <motion.span layout transition={springs.snappy} className="billing-switch__thumb" />
        </span>
      </button>
    </div>
  );
}
