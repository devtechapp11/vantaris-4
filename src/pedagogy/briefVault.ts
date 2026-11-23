import type { Brief } from '../content/briefs';
import { sound } from '../lib/sound';

const KEY = 'vantaris.briefs.v1';
type Saved = Brief & { at: number };

export function savedBriefs(): Saved[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
export const isSaved = (id: string) => savedBriefs().some((b) => b.id === id);

/** Keeps a brief in the Vault's « Briefs » section (newest first, at most 60). */
export function saveBrief(brief: Brief) {
  sound.tap();
  const list = [{ ...brief, at: Date.now() }, ...savedBriefs().filter((b) => b.id !== brief.id)].slice(0, 60);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function removeBrief(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(savedBriefs().filter((b) => b.id !== id)));
  } catch {
    /* ignore */
  }
}
