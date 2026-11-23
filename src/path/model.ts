import { CHAPTERS } from '../content/path';
import { isLocked } from '../lib/modules';
import { openedCaches, sessionMark, type CacheReward } from './store';

export type NodeState = 'locked' | 'available' | 'progress' | 'completed' | 'mastered';
export const DESKS = ['Analyst', 'Associate', 'VP', 'MD'] as const;
export type Desk = (typeof DESKS)[number];

export type PathNodeModel = {
  id: string;
  index: number;
  title: string;
  level: Desk;
  artifact: string;
  stars: number;
  state: NodeState;
  tierLocked: boolean;
  reachable: boolean;
  progress: number; // 0–1, sessions in progress
};

export type CacheModel = { id: string; after: string; afterTitle: string; reward: CacheReward; ready: boolean; opened: boolean };

type Me = {
  path?: { stars?: Record<string, number> };
  skills?: { module_id: string; level: Desk }[];
  tier: { max_level: Desk };
  desk?: { caches?: string[] } | null;
};

/** One capsule after every third chapter: +50 XP, then a streak freeze, alternately. */
export const CACHE_EVERY = 3;

/** Chapters, capsules and the next chapter to play, from the player's record. */
export function buildPath(me: Me) {
  const stars = me.path?.stars ?? {};
  const levelOf = Object.fromEntries((me.skills ?? []).map((m) => [m.module_id, m.level]));
  const live = sessionMark();
  const nodes: PathNodeModel[] = CHAPTERS.map((c, i) => {
    const level = (levelOf[c.id] ?? c.level) as Desk;
    const s = stars[c.id] ?? 0;
    const tierLocked = isLocked(level, me.tier.max_level);
    const reachable = i === 0 || (stars[CHAPTERS[i - 1].id] ?? 0) >= 1;
    const progress = live && live.node === c.id && s === 0 ? Math.min(0.95, live.done / Math.max(1, live.total)) : 0;
    const state: NodeState = tierLocked || !reachable ? 'locked' : s >= 3 ? 'mastered' : s > 0 ? 'completed' : progress > 0 ? 'progress' : 'available';
    return { id: c.id, index: i, title: c.title, level, artifact: c.id, stars: s, state, tierLocked, reachable, progress };
  });
  const active = nodes.findIndex((n) => n.stars === 0 && !n.tierLocked && n.reachable);
  const nextLocked = nodes.findIndex((n, i) => n.state === 'locked' && (active < 0 || i > active));

  const local = openedCaches();
  const server = new Set(me.desk?.caches ?? []);
  const caches: CacheModel[] = [];
  nodes.forEach((n, i) => {
    if ((i + 1) % CACHE_EVERY !== 0 || i === nodes.length - 1) return;
    const id = `cache-${n.id}`;
    caches.push({
      id,
      after: n.id,
      afterTitle: n.title,
      reward: caches.length % 2 === 0 ? 'xp' : 'freeze',
      ready: n.stars >= 1,
      opened: server.has(id) || Boolean(local[id]),
    });
  });
  return { nodes, caches, active, nextLocked };
}
