import { Flame } from 'lucide-react';
import { ProgressBar } from './ui';
import { number } from '../lib/format';
import { CAREER, careerName } from '../lib/career';

/**
 * The career ladder as four brushed segments. Finished tiers are full, the
 * current one fills to your points and glows, the rest wait in the dark.
 */
export function RankGauge({ points = 0, level, compact = false }) {
  const nowIndex = Math.max(0, CAREER.findIndex((c) => c.level === level));
  const next = CAREER[nowIndex + 1];
  const toNext = next ? Math.max(0, next.floor - points) : 0;
  return (
    <div className="gauge" role="group" aria-label={`Career: ${careerName(level)}, ${number(points)} points${next ? `, ${number(toNext)} to ${next.name}` : ', top of the ladder'}`}>
      {!compact && (
        <div className="gauge-head">
          <span className="gauge-now">
            <span className="gauge-title">{careerName(level)}</span>
            <span className="gauge-pts fig">{number(points)} pts</span>
          </span>
          <span className="gauge-next">
            {next ? <><b className="fig">{number(toNext)}</b> pts to {next.name}</> : 'Top of the ladder. Defend the seat.'}
          </span>
        </div>
      )}
      <ol className="gauge-track" aria-hidden="true" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {CAREER.map((c, i) => {
          const upper = CAREER[i + 1]?.floor;
          const fill = i < nowIndex ? 1 : i > nowIndex ? 0 : upper == null ? 1 : Math.max(0.04, Math.min(1, (points - c.floor) / (upper - c.floor)));
          const state = i < nowIndex ? 'done' : i === nowIndex ? 'now' : 'future';
          return (
            <li key={c.level} className={`gauge-seg is-${state}`}>
              <ProgressBar value={fill} size="sm" delay={0.25 + i * 0.14} />
              <span className="gauge-label">
                <span className="gauge-pip" />
                <span className="gauge-short">{c.level}</span>
                <span className="gauge-long">{c.name}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Today's streak: lit once a deal is closed today, pulsing while it's at stake. */
export function StreakLine({ streak = 0, activeToday = false }) {
  const state = activeToday ? 'lit' : streak > 0 ? 'due' : 'idle';
  const days = `${streak}-day`;
  const text = activeToday
    ? <><b className="fig c-fg">{streak}</b> {streak === 1 ? 'day' : 'days'} in a row. Today is secured.</>
    : streak > 0
      ? <>Your <b className="fig c-fg">{days}</b> streak is on the line. Close one deal today.</>
      : 'Close a deal today to start your streak.';
  return (
    <p className={`streak is-${state}`} role="status">
      <span className="streak-icon" aria-hidden="true"><Flame size={15} strokeWidth={1.75} /></span>
      <span>{text}</span>
    </p>
  );
}
