import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Lock, Repeat2, RotateCcw, Star } from 'lucide-react';
import { CHAPTERS, VAULT_STARS } from '../content/path';
import { haptic } from '../app/prefs';
import { sound } from '../lib/sound';
import './Vault.css';

/**
 * The Wall Street Vault: one Platinum mnemonic card per chapter, earned at two
 * stars. Tap a card to turn it over: the golden rule on the front, the memory
 * hook and a banker's tip on the back.
 */
export default function Vault({ stars = {}, review }) {
  const owned = CHAPTERS.filter((c) => (stars[c.id] ?? 0) >= VAULT_STARS).length;
  const due = review?.due?.length ?? 0;
  const fragile = review?.fragile ?? 0;
  return (
    <div className="vault stack-16">
      <div className="vault-review">
        <Repeat2 size={20} aria-hidden="true" />
        <span className="grow stack-4">
          <span className="t-label c-fg">{fragile ? `${fragile} fragile ${fragile === 1 ? 'notion' : 'notions'}` : 'No fragile notions'}</span>
          <span className="t-cap">{due ? `${due} due for review now` : fragile ? 'They come back on a 1-3-7-14-30 day rhythm' : 'Misses come back here on a spaced schedule'}</span>
        </span>
        {due > 0 && <Link to="/learn/review" className="btn btn--primary btn--sm">Review</Link>}
      </div>
      <p className="t-foot"><span className="fig-mono c-fg">{owned}</span> of {CHAPTERS.length} Platinum cards · two stars on a chapter unlock its card</p>
      <div className="vault-grid">
        {CHAPTERS.map((c) => <VaultCard key={c.id} chapter={c} stars={stars[c.id] ?? 0} />)}
      </div>
    </div>
  );
}

function VaultCard({ chapter, stars }) {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const last = useRef(0);
  const open = stars >= VAULT_STARS;
  if (!open) {
    return (
      <div className="vcard is-locked" aria-label={`${chapter.title}: locked`}>
        <div className="vcard-face">
          <Lock size={18} aria-hidden="true" />
          <span className="vcard-kicker">{chapter.title}</span>
          <span className="vcard-silhouette" aria-hidden="true" />
          <span className="t-cap">{VAULT_STARS}★ on this chapter unlocks it</span>
        </div>
      </div>
    );
  }
  const flip = () => {
    const now = Date.now();
    if (now - last.current < 250) return;
    last.current = now;
    setFlipped((f) => !f);
    sound.hover();
    haptic(6);
  };
  return (
    <motion.button
      type="button"
      className="vcard"
      onClick={flip}
      whileTap={{ scale: 0.96 }}
      aria-pressed={flipped}
      aria-label={`${chapter.vault.title}. ${flipped ? 'Showing the memory hook' : 'Showing the golden rule'}. Tap to turn over`}
    >
      <motion.span className="vcard-inner" animate={{ rotateY: flipped ? 180 : 0 }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}>
        <span className="vcard-face vcard-front">
          <span className="vcard-kicker">{chapter.title}</span>
          <span className="vcard-title">{chapter.vault.title}</span>
          <span className="vcard-rule">“{chapter.vault.rule}”</span>
          <span className="vcard-stars" aria-hidden="true">{[1, 2, 3].map((k) => <Star key={k} size={13} className={k <= stars ? 'is-on' : ''} />)}</span>
        </span>
        <span className="vcard-face vcard-back">
          <span className="vcard-kicker">Memory hook</span>
          <span className="vcard-hook">{chapter.vault.hook}</span>
          <span className="vcard-tip"><b>Desk tip.</b> {chapter.vault.tip}</span>
          <RotateCcw size={14} className="vcard-turn" aria-hidden="true" />
        </span>
      </motion.span>
    </motion.button>
  );
}
