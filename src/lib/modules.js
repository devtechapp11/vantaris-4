// Module icons and unlock bookkeeping shared by Home and Practice.
import { createElement } from 'react';
import { Building2, ChartColumn, FileSpreadsheet, Gem, Handshake, History, TrendingUp, Wrench, LayoutGrid } from 'lucide-react';
import { LEVELS } from '../design/tokens';

const ICONS = {
  statements: FileSpreadsheet,
  dcf: TrendingUp,
  comps: ChartColumn,
  precedents: History,
  lbo: Building2,
  ma: Handshake,
  restructuring: Wrench,
  structuring: Gem,
};

export const moduleIcon = (id) => ICONS[id] ?? LayoutGrid;

/** The icon for a module id. */
export function ModuleIcon({ id, ...props }) {
  return createElement(moduleIcon(id), props);
}

export const isLocked = (level, maxLevel) => LEVELS.indexOf(level) > LEVELS.indexOf(maxLevel ?? 'Analyst');

const KEY = 'vantaris-unlocked-v1';

/**
 * Modules that became unlocked since this device last looked (e.g. right after
 * an upgrade), so their cards can mark the unlock once. The first visit
 * only records the current state.
 */
export function takeNewlyUnlocked(unlockedIds) {
  let seen = null;
  try {
    seen = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    /* storage unavailable */
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(unlockedIds));
  } catch {
    /* ignore */
  }
  if (!Array.isArray(seen)) return new Set();
  return new Set(unlockedIds.filter((id) => !seen.includes(id)));
}
