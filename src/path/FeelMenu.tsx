import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SlidersHorizontal } from 'lucide-react';
import { setPref, usePrefs } from '../app/prefs';
import { springs } from '../motion/springs';

const ROWS = [
  { key: 'sound', label: 'Sound' },
  { key: 'haptics', label: 'Haptics' },
  { key: 'celebrations', label: 'Particles' },
  { key: 'reduceMotion', label: 'Reduce motion' },
  { key: 'showVale', label: 'Show Vale' },
  { key: 'holdConfirm', label: 'Hold to confirm' },
] as const;

/** Sound, haptics, particles and motion, one tap away from any screen with the bar. */
export default function FeelMenu() {
  const prefs = usePrefs();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('pointerdown', off);
    addEventListener('keydown', esc);
    return () => {
      removeEventListener('pointerdown', off);
      removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <span className="feel" ref={root}>
      <button type="button" className="sound-toggle" aria-expanded={open} aria-haspopup="true" aria-label="Sound, haptics and motion settings" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal size={16} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="feel-pop" role="group" aria-label="Feel settings" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={springs.snappy}>
            {ROWS.map(({ key, label }) => {
              const on = Boolean(prefs[key]);
              return (
                <label key={key} className="feel-row">
                  <span>{label}</span>
                  <input type="checkbox" role="switch" className="feel-switch" checked={on} onChange={() => setPref(key, !on)} />
                </label>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
