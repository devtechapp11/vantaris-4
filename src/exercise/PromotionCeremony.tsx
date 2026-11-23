import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Share2, X } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { sfx } from '../lib/sfx/engine';
import { haptics, HAPTIC } from '../lib/haptics';
import { fieldBus } from '../fx/field/fieldBus';
import { shower } from '../lib/celebrate';
import { springs } from '../motion/springs';
import { careerName } from '../lib/career';
import { markSeen, seen } from '../path/store';
import { plaqueImage } from './plaqueImage';
import './exercise.css';

const ORDER = ['Analyst', 'Associate', 'VP', 'MD'];
const LINE: Record<string, string> = {
  Associate: 'You now review Analyst work.',
  VP: 'You now run the deal team.',
  MD: 'You now own the client relationship.',
};

/**
 * The desk promotion (Analyst → Associate → VP → MD): a full-screen ceremony,
 * skippable after 1.5 s. The plate swings up in 3D, is engraved letter by
 * letter, and can be shared as a square image.
 */
export default function PromotionCeremony() {
  const { me } = useApp() as { me: { profile: { level: string; display_name: string } } | null };
  const reduce = useReducedMotion();
  const level = me?.profile?.level ?? null;
  const [desk, setDesk] = useState<string | null>(null);
  const [skippable, setSkippable] = useState(false);
  const [letters, setLetters] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const shareBtn = useRef<HTMLButtonElement>(null);

  // A new desk since the last time this device saw the player: celebrate once.
  useEffect(() => {
    if (!level) return;
    const prev = seen().level;
    markSeen({ level });
    if (prev && ORDER.indexOf(level) > ORDER.indexOf(prev)) setDesk(level);
  }, [level]);

  const label = desk ? `${careerName(desk)} desk`.toUpperCase() : '';

  useEffect(() => {
    if (!desk) return undefined;
    setSkippable(false);
    setLetters(reduce ? label.length : 0);
    sfx.promotion();
    haptics.fire(HAPTIC.promotion);
    fieldBus.setMultiplier(5);
    fieldBus.pulse(null);
    shower();
    const skip = window.setTimeout(() => setSkippable(true), 1500);
    let i = 0;
    const engrave = reduce ? 0 : window.setInterval(() => {
      i += 1;
      setLetters(i);
      if (i % 2 === 0) sfx.tick();
      if (i >= label.length) window.clearInterval(engrave);
    }, 40);
    // Starts once the plate has swung up
    return () => {
      window.clearTimeout(skip);
      window.clearInterval(engrave);
      fieldBus.setMultiplier(1);
    };
  }, [desk, label, reduce]);

  useEffect(() => {
    if (!desk || !skippable) return undefined;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setDesk(null);
    addEventListener('keydown', esc);
    shareBtn.current?.focus();
    return () => removeEventListener('keydown', esc);
  }, [desk, skippable]);

  const share = async () => {
    if (!desk || !me) return;
    sfx.press();
    const blob = await plaqueImage(careerName(desk), me.profile.display_name);
    if (!blob) return;
    const file = new File([blob], `vantaris-${desk.toLowerCase()}-desk.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: `${careerName(desk)} desk · Vantaris` });
        return;
      }
    } catch {
      /* share sheet dismissed: fall through to download */
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setNote('Image saved.');
  };

  return (
    <AnimatePresence>
      {desk && (
        <motion.div className="promo" role="dialog" aria-modal="true" aria-label={`Promoted to the ${careerName(desk)} desk`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {skippable && (
            <button type="button" className="promo-skip" onClick={() => setDesk(null)} aria-label="Close">
              <X size={20} aria-hidden="true" />
            </button>
          )}
          <p className="promo-eyebrow fig-mono">PROMOTION · {ORDER.indexOf(desk) + 1}/4</p>
          <div className="promo-stage">
            <motion.div
              className="promo-plate"
              initial={reduce ? { opacity: 0 } : { rotateX: 70, y: 60, opacity: 0 }}
              animate={{ rotateX: 0, y: 0, opacity: 1 }}
              transition={springs.heavy}
            >
              <span className="promo-text" aria-hidden="true">
                {label.split('').map((ch, i) => (
                  <span key={i} className={i < letters ? 'is-cut' : ''}>{ch === ' ' ? ' ' : ch}</span>
                ))}
              </span>
              <span className="sr-only">{label}</span>
            </motion.div>
          </div>
          <motion.p className="promo-line" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.soft, delay: reduce ? 0 : 0.9 }}>
            {LINE[desk] ?? 'A new seat at the table.'}
          </motion.p>
          <motion.div className="promo-actions" initial={{ opacity: 0 }} animate={{ opacity: skippable ? 1 : 0 }} transition={{ duration: 0.3 }}>
            <button ref={shareBtn} type="button" className="btn btn--secondary btn--md" onClick={share} disabled={!skippable}>
              <Share2 size={16} aria-hidden="true" /> Share
            </button>
            <button type="button" className="btn btn--primary btn--md" onClick={() => setDesk(null)} disabled={!skippable}>
              Take the seat
            </button>
          </motion.div>
          {note && <p className="promo-note" role="status">{note}</p>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
