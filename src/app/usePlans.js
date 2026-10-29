import { useEffect, useState } from 'react';
import { api } from '../lib/api';

let cache = null;

/** Tiers and prices from the database (cached for the session). */
export function usePlans() {
  const [data, setData] = useState(cache);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    api.getPlans().then(
      (d) => {
        cache = d;
        if (alive) setData(d);
      },
      (e) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
  }, []);
  return { data, error };
}

export const LEVEL_TIER = { Analyst: 'free', Associate: 'core', VP: 'pro', MD: 'elite' };

export function monthlyPlan(data, tier) {
  return data?.plans.find((p) => p.tier === tier && p.interval === 'monthly');
}
