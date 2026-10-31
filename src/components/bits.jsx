import { Check, ChevronRight, Lock, X, LoaderCircle } from 'lucide-react';
import { initials } from '../lib/format';

const TIER_RANK = { Analyst: 1, Associate: 2, VP: 3, MD: 4 };

/** Career tier: the title and 1-4 pips. No colour, just rank. */
export function TierBadge({ level, className = '' }) {
  if (!level) return null;
  const n = TIER_RANK[level] ?? 1;
  return (
    <span className={`tier ${className}`} data-tier={level}>
      <span className="tier-pips" aria-hidden="true">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>
      {level}
    </span>
  );
}

const DIFF_LABEL = { 1: 'Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Expert' };

/** Difficulty: five pips and a word. */
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
  return (
    <span className={`avatar ${variant === 'me' ? 'avatar--me' : ''} ${size === 'lg' ? 'avatar--lg' : ''}`} style={style} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Spinner({ size = 18 }) {
  return <LoaderCircle size={size} className="spin" aria-hidden="true" />;
}

export function ProblemStatus({ status, locked }) {
  if (locked) return <span className="pstat pstat--locked" aria-label="Locked"><Lock size={13} /></span>;
  if (status === 'correct') return <span className="pstat pstat--correct" aria-label="Solved"><Check size={14} /></span>;
  if (status === 'wrong') return <span className="pstat pstat--wrong" aria-label="Answered incorrectly"><X size={14} /></span>;
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

/** Indeterminate bar pinned to the top of the viewport. */
export function LoadBar() {
  return <div className="loadbar" role="progressbar" aria-label="Loading" />;
}

export const TIER_LABEL = { free: 'Free', core: 'Core', pro: 'Pro', elite: 'Elite' };

export function PlanChip({ tier }) {
  if (!tier || tier === 'free') return <span className="chip">Free plan</span>;
  if (tier === 'core') return <span className="chip chip--strong">Core</span>;
  return <span className="chip chip--strong">{TIER_LABEL[tier]}</span>;
}
