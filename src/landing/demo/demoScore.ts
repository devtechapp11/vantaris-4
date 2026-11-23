/**
 * The demo result, kept on this device until the visitor creates an account.
 * Crediting it to the account is a server-side step (it changes XP), planned
 * with the server-validated XP work; nothing here grants points.
 */
const KEY = 'vantaris.demo.v1';

export type DemoScore = { xp: number; right: number; played: number; total: number; at: number };

export function saveDemoScore(s: Omit<DemoScore, 'at'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, at: Date.now() }));
  } catch {
    /* storage unavailable: the demo still works */
  }
}

export function readDemoScore(): DemoScore | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as DemoScore;
    return typeof v?.xp === 'number' && typeof v?.right === 'number' ? v : null;
  } catch {
    return null;
  }
}
