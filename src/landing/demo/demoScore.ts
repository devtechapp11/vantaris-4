/**
 * The demo result, kept on this device until the visitor creates an account.
 * Crediting it to the account is a server-side step (credit_demo_xp, capped
 * and once per account); nothing on this device grants points.
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

export function clearDemoScore() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** How many demo tickets the visitor printed (shown once after sign-up). */
const TICKETS = 'vantaris.demo.tickets.v1';
export function saveDemoTickets(n: number) {
  try {
    localStorage.setItem(TICKETS, String(n));
  } catch {
    /* storage unavailable */
  }
}
export function takeDemoTickets(): number {
  try {
    const n = Number(localStorage.getItem(TICKETS) || 0);
    localStorage.removeItem(TICKETS);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
