import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Star } from 'lucide-react';
import MetalPlate from '../components/fx/MetalPlate';
import SpecularBorder from '../components/fx/SpecularBorder';
import AnimatedNumber from '../components/fx/AnimatedNumber';
import { SoundToggle } from '../components/Momentum';
import SoundBars from '../components/sound/SoundBars';
import { careerName } from '../lib/career';
import FeelMenu from './FeelMenu';

type Board = { rank: number | null; players: number } | null;
type Props = {
  level: string;
  streak: number;
  lit: boolean;
  stars: number;
  board: Board;
  /** XP earned today, for the goal ring (phones and tablets: the rail is hidden). */
  today?: number;
};

const GOAL = 50;
function GoalRing({ value }: { value: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / GOAL);
  return (
    <span className="sbar-stat sbar-goal" aria-label={`Today's goal: ${Math.min(value, GOAL)} of ${GOAL} XP`}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r={r} className="sbar-goal-track" />
        <circle cx="12" cy="12" r={r} className="sbar-goal-fill" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 12 12)" />
      </svg>
    </span>
  );
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/**
 * The standing bar. Phones and tablets: three items only (streak, today's
 * goal, desk). Desktop: desk, league place, streak, stars and sound (the goal
 * and the league live in the rail there).
 */
export default function StatsBar({ level, streak, lit, stars, board, today = 0 }: Props) {
  const tip = useId();
  const rank = board?.rank ?? null;
  return (
    <header className="sbar" aria-label="Your standing">
      <SpecularBorder />
      <MetalPlate tone="platinum" size="sm" className="sbar-desk" rank={level}>{careerName(level)}</MetalPlate>
      <Link to="/ranking" className="sbar-stat sbar-rank" aria-describedby={tip}>
        {rank ? <><b className="fig-mono">#<AnimatedNumber value={rank} /></b><span className="sbar-unit">in league</span></> : <span className="sbar-unit">Unranked</span>}
        <span role="tooltip" id={tip} className="sbar-tip">
          {rank ? `All-time league: ${ordinal(rank)} of ${board?.players ?? '—'} players, ranked by XP.` : 'Answer one deal to enter the all-time league.'}
        </span>
      </Link>
      <span className={`sbar-stat ${lit ? 'is-lit' : ''}`} aria-label={`${streak}-day streak${lit ? ', kept today' : ''}`}>
        <Flame size={17} aria-hidden="true" /> <b className="fig-mono"><AnimatedNumber value={streak} /></b>
      </span>
      <GoalRing value={today} />
      <span className="sbar-stat sbar-stars" aria-label={`${stars} stars`}>
        <Star size={17} aria-hidden="true" className="sbar-star" /> <b className="fig-mono"><AnimatedNumber value={stars} /></b>
      </span>
      <span className="sbar-sound">
        <SoundBars />
        <SoundToggle />
        <FeelMenu />
      </span>
    </header>
  );
}
