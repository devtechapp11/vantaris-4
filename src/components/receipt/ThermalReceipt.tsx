import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { sfx } from '../../lib/sfx/engine';
import { haptics, HAPTIC } from '../../lib/haptics';
import { springs } from '../../motion/springs';
import './receipt.css';

export type ReceiptLine = { label: string; value: string; strong?: boolean };

type Props = {
  heading: string;
  meta?: string;
  lines: ReceiptLine[];
  /** Rubber stamp across the ticket, e.g. « CALIBRATED · Analyst+ » or « PAID ». */
  stamp?: string | null;
  footnote?: string;
  /** Feed the paper out line by line (off under reduced motion). */
  print?: boolean;
  className?: string;
  onPrinted?: () => void;
};

const LINE_MS = 70;

/** A thermal ticket: mono print on pale paper, serrated tear edge, optional stamp. */
export default function ThermalReceipt({ heading, meta, lines, stamp, footnote, print = true, className = '', onPrinted }: Props) {
  const reduce = useReducedMotion();
  const animate = print && !reduce;
  const [shown, setShown] = useState(animate ? 0 : lines.length);

  useEffect(() => {
    if (!animate) {
      setShown(lines.length);
      onPrinted?.();
      return undefined;
    }
    sfx.printFeed(lines.length + 2);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= lines.length) {
        window.clearInterval(id);
        window.setTimeout(() => {
          sfx.tear();
          haptics.fire(HAPTIC.tick);
          onPrinted?.();
        }, 120);
      }
    }, LINE_MS);
    return () => window.clearInterval(id);
    // Printed once per ticket
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const printed = shown >= lines.length;

  useEffect(() => {
    if (!stamp || !printed) return;
    sfx.stamp();
    haptics.fire(HAPTIC.press);
  }, [stamp, printed]);

  return (
    <div className={`receipt-slot ${className}`}>
      <motion.article
        className={`receipt ${stamp && printed ? 'has-stamp' : ''}`}
        initial={animate ? { y: '-35%', opacity: 0.4 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={animate ? { duration: (lines.length * LINE_MS) / 1000 + 0.15, ease: 'linear' } : { duration: 0 }}
      >
        <header className="receipt__head">
          <p className="receipt__heading">{heading}</p>
          {meta && <p className="receipt__meta">{meta}</p>}
        </header>
        <dl className="receipt__lines">
          {lines.map((l, i) => (
            <div key={l.label} className={`receipt__line ${l.strong ? 'is-strong' : ''}`} style={{ visibility: i < shown ? 'visible' : 'hidden' }}>
              <dt>{l.label}</dt>
              <dd>{l.value}</dd>
            </div>
          ))}
        </dl>
        {footnote && printed && <p className="receipt__foot">{footnote}</p>}
        {stamp && printed && (
          <motion.p
            className="receipt__stamp"
            initial={reduce ? { opacity: 0 } : { scale: 1.8, opacity: 0, rotate: -14 }}
            animate={{ scale: 1, opacity: 1, rotate: -8 }}
            transition={reduce ? { duration: 0.15 } : springs.heavy}
          >
            {stamp}
          </motion.p>
        )}
      </motion.article>
    </div>
  );
}
