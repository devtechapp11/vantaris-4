import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Building2, Calculator, FileSpreadsheet, History, LifeBuoy, Lock, Merge, Puzzle, Scale, Star } from 'lucide-react';
import { springs } from '../motion/springs';
import type { NodeState, PathNodeModel } from './model';

const ICONS = { statements: FileSpreadsheet, dcf: Calculator, comps: Scale, precedents: History, lbo: Building2, ma: Merge, restructuring: LifeBuoy, structuring: Puzzle } as const;

export const NODE = 80;

const SAY: Record<NodeState, string> = {
  locked: 'Locked',
  available: 'Open',
  progress: 'In progress',
  completed: 'Completed',
  mastered: 'Mastered',
};

type Props = {
  n: PathNodeModel;
  style: CSSProperties;
  active: boolean;
  onOpen: (n: PathNodeModel) => void;
  prefetch?: Record<string, unknown>;
  children?: ReactNode;
};

/**
 * One chapter on the path, as a metal disc in one of five states: smoked glass
 * (locked), brushed platinum with a turning specular ring (available), the same
 * with a chrome progress arc (in progress), matt platinum (1–2★) or liquid
 * chrome with a travelling glint (mastered, 3★).
 */
const PathNode = forwardRef<HTMLButtonElement, Props>(function PathNode({ n, style, active, onOpen, prefetch, children }, ref) {
  const Icon = ICONS[n.id as keyof typeof ICONS] ?? Star;
  const label = `${n.title}. ${SAY[n.state]}${n.state === 'completed' || n.state === 'mastered' ? `, ${n.stars} of 3 stars` : ''}.`;
  const arc = 2 * Math.PI * 44;
  return (
    <motion.button
      ref={ref}
      type="button"
      className={`pn pn--${n.state} ${active ? 'is-active' : ''}`}
      style={style}
      onClick={() => onOpen(n)}
      whileTap={{ scale: 0.95 }}
      transition={springs.snappy}
      aria-label={label}
      data-state={n.state}
      {...prefetch}
    >
      {(n.state === 'available' || n.state === 'progress') && <span className="pn-ring" aria-hidden="true" />}
      {n.state === 'progress' && (
        <svg className="pn-arc" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="44" className="pn-arc-track" />
          <circle cx="50" cy="50" r="44" className="pn-arc-fill" strokeDasharray={`${arc * n.progress} ${arc}`} />
        </svg>
      )}
      <span className="pn-edge" aria-hidden="true" />
      <span className="pn-face" aria-hidden="true">
        {n.state === 'mastered' && <i className="pn-glint" />}
        {n.state === 'mastered' && <i className="pn-spark" />}
        {n.state === 'locked' ? <Lock size={22} strokeWidth={1.6} /> : <Icon size={28} strokeWidth={1.5} />}
      </span>
      <span className="pn-stars" aria-hidden="true">
        {[1, 2, 3].map((k) => (
          <Star key={k} size={14} strokeWidth={1.6} className={k <= n.stars ? 'is-on' : ''} />
        ))}
      </span>
      {children}
    </motion.button>
  );
});

export default PathNode;
