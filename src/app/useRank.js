import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const cache = new Map();

/** The player's all-time rank (null while loading or when unranked). Refreshes when points change. */
export function useRank(points) {
  const key = `all:${points ?? 0}`;
  const [rank, setRank] = useState(cache.get(key) ?? null);
  useEffect(() => {
    if (cache.has(key)) return undefined;
    let alive = true;
    api.getLeaderboard('all').then(
      (b) => {
        const r = b?.me?.rank ?? null;
        cache.set(key, r);
        if (alive) setRank(r);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [key]);
  return rank;
}
