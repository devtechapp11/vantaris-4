import { useSyncExternalStore } from 'react';

/**
 * What the hero's telemetry badges show. Only real values: the visitor's own
 * demo results and the number of published deals in the database.
 */
export type HeroState = {
  played: number;
  right: number;
  total: number;
  /** Grade after the three demo deals, e.g. « Analyst+ ». */
  grade: string | null;
  /** Published deals (get_public_stats), null until known or if it failed. */
  deals: number | null;
};

let state: HeroState = { played: 0, right: 0, total: 3, grade: null, deals: null };
const listeners = new Set<() => void>();

export const heroStore = {
  get: () => state,
  set(patch: Partial<HeroState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export const useHero = () => useSyncExternalStore(heroStore.subscribe, heroStore.get, heroStore.get);
