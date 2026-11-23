// Small per-device records for the path. Each read and write is guarded:
// storage can be unavailable (private mode, blocked site data).

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/* ---------- The session in progress (drives the « in progress » arc) ---------- */
const SESSION = 'vantaris.session.v1';
export type SessionMark = { node: string; done: number; total: number; at: number };

export function sessionMark(): SessionMark | null {
  const s = read<SessionMark | null>(SESSION, null);
  // A session left more than two days ago is no longer « in progress ».
  return s && Date.now() - s.at < 2 * 864e5 ? s : null;
}
export function markSession(node: string, done: number, total: number) {
  write(SESSION, { node, done, total, at: Date.now() });
}
export function clearSession() {
  try {
    localStorage.removeItem(SESSION);
  } catch {
    /* ignore */
  }
}

/* ---------- Vault Cache capsules ---------- */
const CACHES = 'vantaris.caches.v1';
export type CacheReward = 'xp' | 'freeze';
export type OpenedCache = { reward: CacheReward; at: number; credited: boolean };

export function openedCaches(): Record<string, OpenedCache> {
  return read<Record<string, OpenedCache>>(CACHES, {});
}
export function recordCache(id: string, reward: CacheReward, credited: boolean) {
  write(CACHES, { ...openedCaches(), [id]: { reward, at: Date.now(), credited } });
}

/* ---------- Things Vale has already congratulated ---------- */
const SEEN = 'vantaris.seen.v1';
export function seen(): { blitz?: number; level?: string } {
  return read(SEEN, {});
}
export function markSeen(patch: { blitz?: number; level?: string }) {
  write(SEEN, { ...seen(), ...patch });
}
