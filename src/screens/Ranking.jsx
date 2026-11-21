import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Crown, Flag } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { usePullToRefresh } from '../app/fluid';
import { CountUp, Item, LargeTitle, Page, PullIndicator, Segmented } from '../components/chrome';
import { Avatar, Skeleton, TierBadge } from '../components/bits';
import { group, item } from '../design/motion';
import { duration, ease, spring, stagger } from '../design/tokens';
import { number } from '../lib/format';
import { CAREER } from '../lib/career';
import './Ranking.css';
import { useMeta } from '../app/useMeta';

const SCOPES = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

export default function Ranking() {
  useMeta({ title: 'Rank' });
  const { showToast, me } = useApp();
  const [scope, setScope] = useState('week');
  const [board, setBoard] = useState({});
  const [nonce, setNonce] = useState(0);
  const ptr = usePullToRefresh(() => new Promise((done) => { setNonce((n) => n + 1); setTimeout(done, 600); }));

  useEffect(() => {
    let alive = true;
    api.getLeaderboard(scope).then((b) => alive && setBoard((prev) => ({ ...prev, [scope]: b })), (e) => showToast(e.message, 'error'));
    return () => {
      alive = false;
    };
  }, [scope, showToast, me?.profile?.points, nonce]);

  const data = board[scope];
  const rows = data?.rows ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const meInList = rows.some((r) => r.is_me);

  return (
    <Page wide>
      <PullIndicator {...ptr} />
      <LargeTitle title="Rank" eyebrow={data ? `${number(data.players)} players ranked` : 'Leaderboard'} />
      <Item className="rank-scope"><Segmented value={scope} onChange={setScope} options={SCOPES} label="Time range" /></Item>

      {data && <Item><NextMove data={data} me={me} scope={scope} /></Item>}

      {!data ? (
        <div className="stack-12"><Skeleton height={260} /><Skeleton height={320} /></div>
      ) : (
        <div className="rank-layout">
          {podium.length > 0 && <Item><Podium key={scope} rows={podium} /></Item>}
          <Item className="stack-12">
            {rest.length > 0 && (
              <motion.ol key={scope} className="rank-list" variants={group(stagger.children)} initial="hidden" animate="show">
                {rest.map((r) => <Row key={`${r.rank}-${r.name}`} r={r} />)}
              </motion.ol>
            )}
            {!meInList && data.me?.rank && (
              <div className="stack-8">
                <p className="group-label">You</p>
                <ol className="rank-list"><Row r={data.me} /></ol>
              </div>
            )}
            <Lines points={me?.profile?.points ?? 0} />
          </Item>
        </div>
      )}
      <Item as="p" className="t-foot center">Points come from first-time correct answers. Faster answers earn up to 50% more.</Item>
    </Page>
  );
}

/** The one thing to do next on this board, with the deal ready in one tap. */
function NextMove({ data, me, scope }) {
  const navigate = useNavigate();
  const rows = data.rows ?? [];
  const i = rows.findIndex((r) => r.is_me);
  const mine = i >= 0 ? rows[i] : data.me;
  const above = i > 0 ? rows[i - 1] : null;
  const when = scope === 'week' ? 'this week' : scope === 'month' ? 'this month' : 'all time';
  const daily = me?.daily && me.daily.status !== 'correct' && me.daily.status !== 'wrong' ? me.daily : null;
  const deal = daily ?? me?.continue?.[0] ?? null;
  let title;
  let line;
  if (!mine?.rank) {
    title = 'One closed deal puts you on this board.';
    line = rows.length ? `${number(rows.length)} ${rows.length === 1 ? 'player has' : 'players have'} scored ${when}. Take your place.` : `No one has scored ${when} yet. The first close takes the top seat.`;
  } else if (above) {
    const gap = Math.max(1, above.points - mine.points + 1);
    title = <><b className="fig-mono">{number(gap)}</b> pts to pass {above.name.split(' ')[0]}.</>;
    line = gap <= 15 ? 'One fast, correct deal closes the gap.' : `You’re #${mine.rank} ${when}. Every first-time close counts.`;
  } else {
    title = `You lead ${when}.`;
    line = 'Hold the seat: close a deal today and keep the streak alive.';
  }
  return (
    <section className="next-move metal metal--pad" aria-label="Your next move">
      <div className="stack-4 grow">
        <p className="t-eyebrow">Your next move</p>
        <p className="t-headline">{title}</p>
        <p className="t-foot">{line}</p>
      </div>
      {deal && (
        <button type="button" className="btn btn--primary btn--auto next-move-cta" onClick={() => navigate(`/practice/${deal.id}`)}>
          {deal.opened || deal.status === 'opened' ? 'Back to the deal' : 'Take the next deal'} <ArrowRight size={17} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/** The career thresholds still ahead of you: lines to cross, not players. */
function Lines({ points }) {
  const ahead = CAREER.slice(1).filter((c) => c.floor > points);
  if (!ahead.length) return null;
  return (
    <div className="stack-8">
      <p className="group-label">Lines to cross</p>
      <motion.ol className="rank-list" variants={group(stagger.children)} initial="hidden" animate="show">
        {ahead.map((c) => (
          <motion.li key={c.level} variants={item} className="rank-row rank-row--mark" aria-label={`${c.name}: ${c.floor} points, ${c.floor - points} to go`}>
            <span className="rank-pos" aria-hidden="true"><Flag size={14} /></span>
            <span className="grow stack-4" style={{ minWidth: 0 }}>
              <span className="row-8"><TierBadge level={c.level} />{c.name !== c.level && <span className="t-cap">{c.name}</span>}</span>
            </span>
            <span className="stack-4" style={{ alignItems: 'flex-end' }}>
              <span className="fig rank-pts">{number(c.floor)}</span>
              <span className="t-cap fig">{number(c.floor - points)} to go</span>
            </span>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  );
}

function Row({ r }) {
  return (
    <motion.li variants={item} className={`rank-row ${r.is_me ? 'is-me' : ''}`} aria-current={r.is_me ? 'true' : undefined}>
      <span className="fig rank-pos">{r.rank}</span>
      <Avatar name={r.name} variant={r.is_me ? 'me' : ''} />
      <span className="grow stack-4" style={{ minWidth: 0 }}>
        <span className="t-headline ellipsis">{r.name}{r.is_me ? ' (you)' : ''}</span>
        <span className="row-8" style={{ minWidth: 0 }}>
          <TierBadge level={r.level} />
          {r.school && <span className="t-cap ellipsis">{r.school}</span>}
        </span>
      </span>
      <span className="fig rank-pts">{number(r.points)}</span>
    </motion.li>
  );
}

const PODIUM = {
  1: { h: 150, label: 'first' },
  2: { h: 112, label: 'second' },
  3: { h: 88, label: 'third' },
};

function Podium({ rows }) {
  const reduce = useReducedMotion();
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  return (
    <div className="podium">
      <div className="podium-row" style={{ gridTemplateColumns: `repeat(${order.length}, 1fr)` }}>
        {order.map((r, i) => {
          const p = PODIUM[r.rank] ?? PODIUM[3];
          return (
            <div key={`${r.rank}-${r.name}`} className="podium-col">
              <motion.div
                className="stack-8 center-x"
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.gentle, delay: 0.35 + i * 0.12 }}
              >
                {r.rank === 1 && <Crown size={18} className="podium-crown" aria-hidden="true" />}
                <span style={{ position: 'relative' }}>
                  <Avatar name={r.name} variant={r.is_me ? 'me' : ''} style={r.rank === 1 ? { width: 64, height: 64, fontSize: 20 } : { width: 52, height: 52 }} />
                  {r.is_me && <span className="chip chip--strong podium-you">You</span>}
                </span>
                <div className="center" style={{ minWidth: 0, width: '100%' }}>
                  <div className="t-label c-fg ellipsis">{r.name.split(' ')[0]}</div>
                  <div className="t-cap ellipsis">{r.school}</div>
                </div>
              </motion.div>
              <motion.div
                className="podium-step" data-place={r.rank}
                style={{ height: p.h }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: duration.slower, delay: 0.1 + i * 0.1, ease: ease.out }}
              >
                <span className="podium-rank">{r.rank}</span>
                <span className="fig podium-pts"><CountUp to={r.points} delay={0.5} /></span>
              </motion.div>
            </div>
          );
        })}
      </div>
      <span className="sr-only">Top three: {rows.map((r) => `${r.rank}. ${r.name}, ${r.points} points`).join('; ')}</span>
    </div>
  );
}
