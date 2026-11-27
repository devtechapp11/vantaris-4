/**
 * The Vault's tickets: one per closed lesson, written only once the server has
 * answered with the XP it really credited. Kept on this device (the server has
 * no per-lesson history endpoint yet); the seals come from the server's stars.
 */
export type Ticket = { at: string; skill: string; title: string; xp: number; right: number; total: number };

const KEY = 'vt.vault.tickets';
const MAX = 120;

export function tickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Ticket[]) : [];
  } catch {
    return [];
  }
}

export function recordTicket(t: Ticket) {
  try {
    localStorage.setItem(KEY, JSON.stringify([t, ...tickets()].slice(0, MAX)));
  } catch {
    /* private mode: the shelf stays empty */
  }
}

/** Accuracy on a chapter across its tickets, or null without any. */
export function accuracy(skill: string, list = tickets()) {
  const mine = list.filter((t) => t.skill === skill);
  const total = mine.reduce((n, t) => n + t.total, 0);
  return total ? Math.round((mine.reduce((n, t) => n + t.right, 0) / total) * 100) : null;
}
