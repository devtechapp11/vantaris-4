import { Check, ChevronRight, Crown, Lock, X, LoaderCircle } from 'lucide-react';
import { initials } from '../lib/format';

/** Career tier pill: Analyst blue, Associate purple, VP gold, MD platinum. */
export function TierBadge({ level, className = '' }) {
  if (!level) return null;
  return <span className={`tier ${className}`} data-tier={level}>{level}</span>;
}

const DIFF_LABEL = { 1: 'Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Expert' };

/** Difficulty: colour-coded label with glowing dots. */
export function DifficultyBadge({ value, compact = false }) {
  return (
    <span className="diff" data-diff={value} role="img" aria-label={`Difficulty ${value} of 5, ${DIFF_LABEL[value]}`}>
      <Dots value={value} label={false} />
      {!compact && DIFF_LABEL[value]}
    </span>
  );
}

export function Dots({ value, max = 5, label = true }) {
  return (
    <span className="dots" role={label ? 'img' : undefined} aria-label={label ? `Difficulty ${value} of ${max}` : undefined} aria-hidden={label ? undefined : true}>
      {Array.from({ length: max }, (_, i) => <i key={i} className={i < value ? 'on' : ''} />)}
    </span>
  );
}

export function Avatar({ name, variant = '', size, style }) {
  const metal = { gold: 'metal-gold', silver: 'metal-silver', bronze: 'metal-bronze' }[variant];
  return (
    <span className={`avatar ${metal ?? (variant ? `avatar--${variant}` : '')} ${size === 'lg' ? 'avatar--lg' : ''}`} style={style} aria-hidden="true">
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

/** Shimmering placeholder in the shape of the content that's loading. */
export function Skeleton({ height = 80, width, radius, style }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius, ...style }} aria-hidden="true" />;
}

/** Glowing indeterminate bar pinned to the top of the viewport. */
export function LoadBar() {
  return <div className="loadbar" role="progressbar" aria-label="Loading" />;
}

export const TIER_LABEL = { free: 'Free', core: 'Core', pro: 'Pro', elite: 'Elite' };

export function PlanChip({ tier }) {
  if (!tier || tier === 'free') return <span className="chip">Free plan</span>;
  if (tier === 'core') return <span className="chip chip--cyan">Core</span>;
  return (
    <span className="chip chip--solid-gold sheen" style={{ position: 'relative', overflow: 'hidden' }}>
      <Crown size={12} aria-hidden="true" /> {TIER_LABEL[tier]}
    </span>
  );
}
