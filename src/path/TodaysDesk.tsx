import { useNavigate } from 'react-router-dom';
import { Ghost, Repeat2, Zap } from 'lucide-react';
import SpecularCard from '../components/fx/SpecularCard';
import MagneticButton from '../components/fx/MagneticButton';
import AnimatedNumber from '../components/fx/AnimatedNumber';
import MetalPlate from '../components/fx/MetalPlate';
import Vale from '../components/vale/Vale';
import GlassStat from '../components/fx/GlassStat';
import DotMatrixNumber from '../components/viz/DotMatrixNumber';
import DotMatrixChart from '../components/viz/DotMatrixChart';
import { careerName } from '../lib/career';
import { prefetchProps } from '../app/routes';
import DealBriefCard from '../pedagogy/DealBriefCard';
import { briefOfTheDay } from '../content/briefs';
import { seen } from './store';

type Row = { rank: number; name: string; points: number; is_me?: boolean };
type Board = { rank: number | null; players: number; gap: number | null; above: Row | null; rows: Row[] } | null;
type Me = {
  profile: { level: string; points: number; next_level: string | null; next_level_at: number | null; streak: number; active_today: boolean; display_name: string };
  week?: { date: string; points: number }[];
  blitz_best?: number;
  path?: { stars?: Record<string, number> };
};

export const DAILY_XP = 50;

/** What Vale says on arrival: one line, the most useful thing first. */
export function mentorLine(me: Me, due: number) {
  const p = me.profile;
  const best = me.blitz_best ?? 0;
  if (best > 0 && best > (seen().blitz ?? 0)) return `New Blitz record: ${best.toLocaleString('en-US')}. The floor noticed. Now do it on a harder desk.`;
  if (due > 0) return `${due} ${due === 1 ? 'notion is' : 'notions are'} going soft. Ten minutes of review now saves an hour before the interview.`;
  if (p.streak > 0 && !p.active_today) return `${p.streak}-day streak on the line. One session before midnight keeps the desk warm.`;
  if (p.streak >= 3) return `${p.streak} days straight. That is how analysts become associates: quietly, every day.`;
  if (p.next_level && p.next_level_at != null) return `${Math.max(0, p.next_level_at - p.points)} XP to the ${careerName(p.next_level)} desk. Clean answers, fast: the multiplier does the rest.`;
  return 'Every chapter is a deal you will see again. Learn it once, properly.';
}

function Ring({ value, goal }: { value: number; goal: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / goal);
  return (
    <svg className="td-ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} className="td-ring-track" />
      <circle cx="32" cy="32" r={r} className="td-ring-fill" strokeDasharray={`${c * pct} ${c}`} />
    </svg>
  );
}

type Props = { me: Me; board: Board; due: number; compact?: boolean };

/**
 * « Today's Desk »: Vale and the desk status, the daily XP goal, the next
 * action, the league around you and the Deal Brief of the day. A sticky right
 * rail on desktop; compact cards above the path below 1280 px.
 */
export default function TodaysDesk({ me, board, due, compact = false }: Props) {
  const navigate = useNavigate();
  const week = me.week ?? [];
  const today = me.week?.[me.week.length - 1]?.points ?? 0;
  const bestDay = Math.max(0, ...(me.week ?? []).slice(0, -1).map((d) => d.points));
  const rows = board?.rows ?? [];
  const meAt = rows.findIndex((r) => r.is_me);
  const around = meAt >= 0 ? rows.slice(Math.max(0, meAt - 2), meAt + 3) : [];
  const ghost = (board?.players ?? 0) < 5;
  const p = me.profile;
  const toNext = p.next_level_at != null ? Math.max(0, p.next_level_at - p.points) : null;
  const action = due > 0
    ? { to: '/learn/review', label: `Review ${due} ${due === 1 ? 'mistake' : 'mistakes'}`, Icon: Repeat2 }
    : { to: '/blitz', label: 'Blitz · 60s', Icon: Zap };

  return (
    <aside className={`td ${compact ? 'td--compact' : ''}`} aria-label="Today's desk">
      <SpecularCard className="td-card td-vale">
        <div className="td-vale-row">
          <Vale size={compact ? 56 : 72} avatar />
          <div className="td-vale-copy">
            <MetalPlate tone="platinum" size="sm">{`${careerName(p.level)} desk`.toUpperCase()}</MetalPlate>
            <p className="td-line">{mentorLine(me, due)}</p>
          </div>
        </div>
        {toNext != null && p.next_level && (
          <p className="td-meta fig-mono">{toNext} XP → {careerName(p.next_level).toUpperCase()}</p>
        )}
      </SpecularCard>

      <SpecularCard className="td-card td-goal">
        <div className="td-goal-ring">
          <Ring value={today} goal={DAILY_XP} />
          <span className="td-goal-num fig-mono"><AnimatedNumber value={today} /></span>
        </div>
        <div className="td-goal-copy">
          <span className="t-eyebrow">Today's goal</span>
          <span className="td-goal-text"><b className="fig-mono">{Math.min(today, DAILY_XP)}</b> / {DAILY_XP} XP</span>
          <MagneticButton className="btn btn--primary btn--sm td-action" onClick={() => navigate(action.to)} {...prefetchProps(action.to)}>
            <action.Icon size={16} aria-hidden="true" /> {action.label}
          </MagneticButton>
        </div>
      </SpecularCard>

      <GlassStat eyebrow="XP today" value={today} unit="XP" size="sm" className="td-card td-pulse">
        <div className="td-streak">
          <DotMatrixNumber value={p.streak} label={`${p.streak}-day streak`} dot={compact ? 4 : 5} />
          <span className="t-eyebrow">Day streak</span>
        </div>
        {week.length > 0 && (
          <DotMatrixChart
            values={week.map((d) => d.points)}
            labels={week.map((d) => new Date(`${d.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' }))}
            rows={6}
            ariaLabel={`XP over the last 7 days: ${week.map((d) => d.points).join(', ')}`}
          />
        )}
      </GlassStat>

      {!compact || around.length ? (
        <SpecularCard className="td-card td-league">
          <div className="td-head">
            <span className="t-eyebrow">League · all time</span>
            {board?.rank && <span className="fig-mono td-pos">#{board.rank}/{board.players}</span>}
          </div>
          {ghost ? (
            <div className="td-ghost">
              <Ghost size={18} aria-hidden="true" />
              <p>
                <b>Ghost run.</b> The league is still filling up, so you race your own best day this week:{' '}
                <span className="fig-mono">{bestDay} XP</span>. Today: <span className="fig-mono">{today} XP</span>.
              </p>
            </div>
          ) : (
            <ol className="td-rows">
              {around.map((r) => (
                <li key={`${r.rank}-${r.name}`} className={r.is_me ? 'is-me' : ''}>
                  <span className="fig-mono td-r">{r.rank}</span>
                  <span className="td-n ellipsis">{r.is_me ? 'You' : r.name}</span>
                  <span className="fig-mono td-p">{r.points.toLocaleString('en-US')}</span>
                </li>
              ))}
            </ol>
          )}
          {!ghost && board?.above && board.gap != null && (
            <p className="td-meta fig-mono">{board.gap} XP TO PASS {(board.above.name ?? 'the next desk').toUpperCase()}</p>
          )}
        </SpecularCard>
      ) : null}

      <DealBriefCard brief={briefOfTheDay(me.path?.stars ?? {})} title="Deal Brief · today" className="td-card" collapsible={compact} defaultOpen={!compact} />
    </aside>
  );
}
