import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookmarkCheck, BookmarkPlus, ChevronDown } from 'lucide-react';
import SpecularCard from '../components/fx/SpecularCard';
import { springs } from '../motion/springs';
import type { Brief } from '../content/briefs';
import { isSaved, saveBrief } from './briefVault';
import { parseBrief } from './dealBrief';
import './pedagogy.css';

type Props = { brief: Brief; title?: string; className?: string; collapsible?: boolean; defaultOpen?: boolean };

/** « Deal Brief — to remember »: the rule, the trap, the real world. Three lines, saved to the Vault in one tap. */
export default function DealBriefCard({ brief, title = 'Deal Brief — to remember', className = '', collapsible = false, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(!collapsible || defaultOpen);
  const [saved, setSaved] = useState(() => isSaved(brief.id));
  if (!parseBrief(brief)) return null;
  const save = () => {
    if (saved) return;
    saveBrief(brief);
    setSaved(true);
  };
  return (
    <SpecularCard className={`brief ${className}`}>
      <div className="brief-head">
        {collapsible ? (
          <button type="button" className="brief-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span className="t-eyebrow">{title}</span>
            <ChevronDown size={16} aria-hidden="true" className={open ? 'is-open' : ''} />
          </button>
        ) : (
          <span className="t-eyebrow">{title}</span>
        )}
        <button type="button" className={`brief-save ${saved ? 'is-saved' : ''}`} onClick={save} aria-pressed={saved} aria-label={saved ? 'Saved to your Vault' : 'Save to Vault'}>
          {saved ? <BookmarkCheck size={16} aria-hidden="true" /> : <BookmarkPlus size={16} aria-hidden="true" />}
          <span>{saved ? 'In your Vault' : 'Save to Vault'}</span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.dl className="brief-rows" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={springs.soft}>
            <div>
              <dt>The rule</dt>
              <dd>{brief.formula && <code className="brief-formula fig-mono">{brief.formula}</code>}{brief.rule}</dd>
            </div>
            <div>
              <dt>The trap</dt>
              <dd>{brief.trap}</dd>
            </div>
            <div>
              <dt>In the real world</dt>
              <dd>{brief.realWorld}</dd>
            </div>
          </motion.dl>
        )}
      </AnimatePresence>
    </SpecularCard>
  );
}
