import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookmarkX } from 'lucide-react';
import DealBriefCard from './DealBriefCard';
import { removeBrief, savedBriefs } from './briefVault';
import { springs } from '../motion/springs';
import { CHAPTERS } from '../content/path.js';

const titleOf = (id: string) => CHAPTERS.find((c: { id: string }) => c.id === id.replace(/^tpl-/, '').split('.')[0])?.title ?? 'Deal Brief';
import './pedagogy.css';

/** The Vault's « Briefs » section: every Deal Brief saved after an exercise. */
export default function VaultBriefs() {
  const [list, setList] = useState(savedBriefs);
  return (
    <section className="vbriefs stack-12" aria-labelledby="vbriefs-title">
      <div className="section-head">
        <h3 id="vbriefs-title" className="t-headline">Briefs</h3>
        <span className="t-foot fig-mono">{list.length}</span>
      </div>
      {list.length === 0 ? (
        <p className="t-cap">Save a Deal Brief after any exercise and it lands here: the rule, the trap, and where it shows up on a real deal.</p>
      ) : (
        <ul className="vbriefs-list">
          <AnimatePresence initial={false}>
            {list.map((b) => (
              <motion.li key={b.id} layout exit={{ opacity: 0, height: 0 }} transition={springs.soft} className="vbriefs-item">
                <DealBriefCard brief={b} title={titleOf(b.id)} collapsible defaultOpen={false} />
                <button
                  type="button"
                  className="vbriefs-remove"
                  aria-label="Remove this brief from the Vault"
                  onClick={() => { removeBrief(b.id); setList(savedBriefs()); }}
                >
                  <BookmarkX size={14} aria-hidden="true" /> Remove
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
