import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { START_KEYS, get, put } from '../onboarding/keys';

/**
 * The plans, on one closable card: right after onboarding, then at most once
 * a week after a finished lesson (free tier). Never inside a lesson.
 */
export default function PlansCard({ free }: { free: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => free && get(START_KEYS.plansCard) === '1');
  if (!open) return null;
  const close = () => {
    put(START_KEYS.plansCard, '0');
    setOpen(false);
  };
  return (
    <aside className="plans-card" aria-label="Plans">
      <div className="plans-card-copy">
        <p className="plans-card-title">Start free. Upgrade when you're winning.</p>
        <p className="plans-card-sub">Every plan, side by side. No pressure, no timer.</p>
      </div>
      <div className="plans-card-actions">
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => { close(); navigate('/plans'); }}>See plans</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={close}>Not now</button>
      </div>
      <button type="button" className="plans-card-x" onClick={close} aria-label="Close"><X size={16} aria-hidden="true" /></button>
    </aside>
  );
}
