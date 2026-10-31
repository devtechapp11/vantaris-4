// Route chunks, shared by the router and by prefetching: hovering, focusing or
// touching a link starts downloading its screen before the click lands.
export const loaders = {
  landing: () => import('../screens/Landing'),
  auth: () => import('../screens/Auth'),
  onboarding: () => import('../screens/Onboarding'),
  home: () => import('../screens/Home'),
  practice: () => import('../screens/Practice'),
  problem: () => import('../screens/Problem'),
  ranking: () => import('../screens/Ranking'),
  profile: () => import('../screens/Profile'),
  plans: () => import('../screens/Plans'),
  legal: () => import('../screens/Legal'),
  notFound: () => import('../screens/NotFound'),
};

const BY_PATH = [
  [/^\/$/, 'home'],
  [/^\/practice\/[^/]+$/, 'problem'],
  [/^\/practice$/, 'practice'],
  [/^\/ranking$/, 'ranking'],
  [/^\/profile$/, 'profile'],
  [/^\/plans$/, 'plans'],
  [/^\/(signin|signup|forgot)$/, 'auth'],
  [/^\/(terms|privacy|refund|cookies|disclaimer|acceptable-use|subscription-terms|contact)$/, 'legal'],
];

const started = new Set();
/** Start loading the chunk for `path` (no-op if already started). */
export function prefetch(path) {
  const hit = BY_PATH.find(([re]) => re.test(path));
  if (!hit || started.has(hit[1])) return;
  started.add(hit[1]);
  loaders[hit[1]]().catch(() => started.delete(hit[1]));
}

/** Props for a link that prefetches its target on intent. */
export const prefetchProps = (path) => ({
  onPointerEnter: () => prefetch(path),
  onFocus: () => prefetch(path),
  onTouchStart: () => prefetch(path),
});
