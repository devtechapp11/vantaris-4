import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const cache = {};

// undefined while loading, null if unavailable (e.g. offline), otherwise the data.
function usePublic(key, load) {
  const [data, setData] = useState(cache[key]);
  useEffect(() => {
    if (cache[key]) return undefined;
    let alive = true;
    load().then(
      (d) => {
        cache[key] = d;
        if (alive) setData(d);
      },
      () => alive && setData(null),
    );
    return () => {
      alive = false;
    };
  }, [key, load]);
  return data;
}

// Counts below this read as an empty room rather than social proof, so the
// landing page and sign-up screen hide them until the community is this big.
export const SOCIAL_PROOF_MIN = 100;

/** { deals_solved, players, problems, modules }, undefined while loading, null if unavailable. */
export const usePublicStats = () => usePublic('stats', api.getPublicStats);
export const usePublicModules = () => usePublic('modules', api.getPublicModules);
