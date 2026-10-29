import { Check, ChevronRight, Lock, X, LoaderCircle } from 'lucide-react';
import { initials } from '../lib/format';

export function LevelBadge({ level }) {
  if (!level) return null;
  return <span className={`lvl lvl--${level}`}>{level}</span>;
}

export function Dots({ value, max = 5, label = true }) {
  return (
    <span className="dots" role={label ? 'img' : undefined} aria-label={label ? `Difficulty ${value} of ${max}` : undefined}>
      {Array.from({ length: max }, (_, i) => <i key={i} className={i < value ? 'on' : ''} />)}
    </span>
  );
}

export function Avatar({ name, variant = '', size }) {
  return (
    <span className={`avatar ${variant ? `avatar--${variant}` : ''} ${size === 'lg' ? 'avatar--lg' : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Spinner({ size = 18 }) {
  return <LoaderCircle size={size} className="spin" aria-hidden="true" />;
}

export function ProblemStatus({ status, locked }) {
  if (locked) return <span className="pstat pstat--locked" aria-label="Locked"><Lock size={13} /></span>;
  if (status === 'correct') return <span className="pstat pstat--correct" aria-label="Solved"><Check size={15} strokeWidth={3} /></span>;
  if (status === 'wrong') return <span className="pstat pstat--wrong" aria-label="Answered incorrectly"><X size={15} strokeWidth={3} /></span>;
  if (status === 'opened') return <span className="pstat pstat--opened" aria-label="Started" />;
  return <span className="pstat pstat--new" aria-label="Not started" />;
}

export function Chevron() {
  return <ChevronRight size={18} className="cell-chevron" aria-hidden="true" />;
}

export function Skeleton({ height = 80, style }) {
  return <div className="skeleton" style={{ height, ...style }} aria-hidden="true" />;
}

export const TIER_LABEL = { free: 'Free', core: 'Core', pro: 'Pro', elite: 'Elite' };

export function PlanChip({ tier }) {
  if (!tier || tier === 'free') return <span className="chip">Free plan</span>;
  return <span className={`chip ${tier === 'elite' ? 'chip--brass' : 'chip--accent'}`}>{TIER_LABEL[tier]}</span>;
}
