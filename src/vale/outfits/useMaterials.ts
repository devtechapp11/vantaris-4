import { useEffect, useMemo } from 'react';
import type { Material } from 'three';

/** Builds an outfit's materials once and disposes them with the outfit. */
export function useMaterials<T extends Record<string, Material>>(make: () => T): T {
  const m = useMemo(make, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return m;
}
