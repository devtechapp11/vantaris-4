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
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/** The standing bar: desk plate, league place, streak and stars, plus sound. Sticky, frosted, never clipped. */
export default function StatsBar({ level, streak, lit, stars, board }: Props) {
  const tip = useId();
  const rank = board?.rank ?? null;
  return (
    <header className="sbar" aria-label="Your standing">
      <SpecularBorder />
      <MetalPlate tone="platinum" size="sm" className="sbar-desk">{careerName(level)}</MetalPlate>
      <Link to="/ranking" className="sbar-stat sbar-rank" aria-describedby={tip}>
        {rank ? <><b className="fig-mono">#<AnimatedNumber value={rank} /></b><span className="sbar-unit">in league</span></> : <span className="sbar-unit">Unranked</span>}
        <span role="tooltip" id={tip} className="sbar-tip">
          {rank ? `All-time league: ${ordinal(rank)} of ${board?.players ?? '—'} players, ranked by XP.` : 'Answer one deal to enter the all-time league.'}
        </span>
      </Link>
      <span className={`sbar-stat ${lit ? 'is-lit' : ''}`} aria-label={`${streak}-day streak${lit ? ', kept today' : ''}`}>
        <Flame size={17} aria-hidden="true" /> <b className="fig-mono"><AnimatedNumber value={streak} /></b>
      </span>
      <span className="sbar-stat" aria-label={`${stars} stars`}>
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
