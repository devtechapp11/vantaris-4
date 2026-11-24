import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';
import MetalPlate from '../../components/fx/MetalPlate';
import SkillRadar from '../../components/viz/SkillRadar';
import DotMatrixChart from '../../components/viz/DotMatrixChart';
import { CAREER } from '../../lib/career';
import { CHAPTERS } from '../../content/path';
import './ladder.css';

const LINE: Record<string, string> = {
  Analyst: 'Read the statements, price a business, defend a multiple.',
  Associate: 'Precedents and the leveraged buyout: model the sponsor’s return.',
  VP: 'Accretion, dilution and distressed situations: own the deal’s logic.',
  MD: 'Structure the deal: the terms that make everyone sign.',
};

// Illustration only, labelled EXAMPLE on the page.
const EXAMPLE_SKILLS = [
  { id: 'a', label: '3 statements', value: 1 },
  { id: 'b', label: 'DCF', value: 0.67 },
  { id: 'c', label: 'Comps', value: 0.67 },
  { id: 'd', label: 'Precedents', value: 0.33 },
  { id: 'e', label: 'LBO', value: 0.33 },
  { id: 'f', label: 'M&A', value: 0 },
  { id: 'g', label: 'Restructuring', value: 0 },
  { id: 'h', label: 'Structuring', value: 0 },
];
const EXAMPLE_WEEK = [20, 35, 0, 50, 42, 60, 30];

/** « From Analyst to Managing Director. »: the four desks on a chrome line that fills as you scroll. */
export default function Ladder() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  return (
    <section ref={ref} className="lsec ladder" aria-labelledby="ladder-title">
      <header className="lsec-head">
        <p className="t-eyebrow">The ladder</p>
        <h2 id="ladder-title" className="chapter-title">From Analyst to <span className="editorial">Managing Director.</span></h2>
        <p className="t-lead">Four desks. Each one opens when your XP crosses its floor, and each one adds the deals that desk really does.</p>
      </header>
      <div className="ladder-track">
        <span className="ladder-rail" aria-hidden="true">
          <motion.span className="ladder-rail__fill" style={{ ['--fill' as string]: reduce ? 1 : fill }} />
        </span>
        <ol className="ladder-rungs">
          {CAREER.map((c, i) => {
            const chapters = CHAPTERS.filter((ch) => ch.level === c.level);
            return (
              <li key={c.level} className="ladder-rung">
                <MetalPlate tone={i === CAREER.length - 1 ? 'platinum' : 'steel'} size="md">{c.name.toUpperCase()}</MetalPlate>
                <div className="glass-stat ladder-card">
                  <p className="glass__eyebrow num">{c.floor === 0 ? 'From day one' : `From ${c.floor} XP`}</p>
                  <p className="ladder-line">{LINE[c.level]}</p>
                  {chapters.length > 0 && (
                    <ul className="ladder-chapters">
                      {chapters.map((ch) => <li key={ch.id}>{ch.title}</li>)}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="ladder-preview" aria-label="Example of the progress views">
        <div className="glass-stat ladder-preview__card">
          <p className="kicker">Example · mastery radar</p>
          <SkillRadar skills={EXAMPLE_SKILLS} />
        </div>
        <div className="glass-stat ladder-preview__card">
          <p className="kicker">Example · XP, last 7 days</p>
          <DotMatrixChart values={EXAMPLE_WEEK} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} rows={6} ariaLabel="Example chart of XP per day over a week" />
        </div>
      </div>
    </section>
  );
}
