import { lazy, useSyncExternalStore } from 'react';

/** Desks in rank order; the outfit and the type width follow the desk. */
export type Desk = 'analyst' | 'associate' | 'vp' | 'md';
export const DESKS: Desk[] = ['analyst', 'associate', 'vp', 'md'];
export const DESK_LABEL: Record<Desk, string> = { analyst: 'Analyst', associate: 'Associate', vp: 'Vice President', md: 'Managing Director' };
/** The `--w-<desk>` token: width is rank. */
export const DESK_WIDTH: Record<Desk, string> = { analyst: '62%', associate: '85%', vp: '105%', md: '125%' };

export const OUTFITS = {
  analyst: lazy(() => import('./Analyst')),
  associate: lazy(() => import('./Associate')),
  vp: lazy(() => import('./VP')),
  md: lazy(() => import('./MD')),
} satisfies Record<Desk, unknown>;

/** The server's career level ('Analyst' | 'Associate' | 'VP' | 'MD') as a desk. */
export function deskOf(level?: string | null): Desk {
  const l = (level ?? '').toLowerCase();
  return l === 'md' || l.startsWith('managing') ? 'md' : l === 'vp' || l.startsWith('vice') ? 'vp' : l === 'associate' ? 'associate' : 'analyst';
}

let desk: Desk | null = null;
const listeners = new Set<() => void>();
/** Which outfit the 3D Vale wears (null: none). One Vale on screen, so one store. */
export const valeOutfit = {
  get: () => desk,
  set(d: Desk | null) {
    desk = d;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useOutfit(): Desk | null {
  return useSyncExternalStore(valeOutfit.subscribe, valeOutfit.get, valeOutfit.get);
}
