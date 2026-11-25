import { useEffect } from 'react';
import { useMeta as useMetaJs } from '../app/useMeta';
import { CAREER } from '../lib/career';
import { fieldBus } from '../fx/field/fieldBus';
import './dev.css';

const useMeta = useMetaJs as unknown as (o: { title?: string; path?: string; noindex?: boolean }) => void;
const WIDTHS = [62, 75, 87.5, 100, 112.5, 125];

/** /dev/type: the Prism Chrome type system on one page (noindex). */
export default function DevType() {
  useMeta({ title: 'Type · Vantaris dev', path: '/dev/type', noindex: true });
  useEffect(() => {
    fieldBus.setScene('landing');
    return () => fieldBus.setScene('app');
  }, []);
  return (
    <main className="devpage" id="main">
      <p className="kicker">Prism Chrome · type</p>
      <h1 className="t-wide devtype-hero">Don’t study finance. <span className="devtype-doit">Do it.</span></h1>

      <section className="devsec">
        <p className="kicker">Archivo · width axis 62 → 125%</p>
        {WIDTHS.map((w) => (
          <p key={w} className="devtype-row" style={{ fontStretch: `${w}%` }}>
            <span className="devtype-tag num">{w}%</span> YOUR DESK IS OPEN
          </p>
        ))}
      </section>

      <section className="devsec">
        <p className="kicker">Width is rank</p>
        {CAREER.map((c) => (
          <p key={c.level} className="devtype-rank" data-rank={c.level}>{c.name.toUpperCase()}</p>
        ))}
      </section>

      <section className="devsec">
        <p className="kicker">Martian Mono · tabular, slashed zero</p>
        <p className="devtype-mono num">EV 8.0x × $50.0M = $400.0M · IRR 23.0% · 0 / 50 XP</p>
        {[75, 100, 112.5].map((w) => (
          <p key={w} className="devtype-mono num" style={{ fontStretch: `${w}%` }}>{w}% · 1,234,567.890 · 0O0O</p>
        ))}
      </section>

      <section className="devsec">
        <p className="kicker">Reading</p>
        <h2 className="t-h2">Every case is a live deal.</h2>
        <p className="t-lead">A company, the numbers that matter and the one question a managing director would put to you. No flashcards.</p>
        <p className="t-body">Body copy in Archivo at 100% width. Every figure switches to Martian Mono: <span className="fig-mono">$450M − $110M = $340M</span>.</p>
      </section>
    </main>
  );
}
