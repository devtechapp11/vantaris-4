import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const cache = new Map();

function load(key) {
  if (!cache.has(key)) cache.set(key, api.getLeaderboard('all').catch(() => null));
  return cache.get(key);
}

/** The all-time board around the player: rank, the player just ahead, and the share of the board behind. */
export function useBoard(points) {
  const key = `all:${points ?? 0}`;
  const [board, setBoard] = useState(null);
  useEffect(() => {
    let alive = true;
    load(key).then((b) => {
      if (!alive || !b) return;
      const rows = b.rows ?? [];
      const i = rows.findIndex((r) => r.is_me);
      const rank = b.me?.rank ?? null;
      const players = b.players ?? rows.length;
      const above = i > 0 ? rows[i - 1] : null;
      setBoard({
        rank,
        players,
        above,
        gap: above ? Math.max(1, above.points - (rows[i]?.points ?? 0) + 1) : null,
        // Top X%: where you sit, and where passing the next player puts you
        top: rank && players ? Math.max(1, Math.ceil((rank / players) * 100)) : null,
        topAfter: rank && players && above ? Math.max(1, Math.ceil(((above.rank) / players) * 100)) : null,
        rows,
      });
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return board;
}

/** The player's all-time rank (null while loading or when unranked). */
export function useRank(points) {
  return useBoard(points)?.rank ?? null;
}
