import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Crown } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { CountUp, Item, LargeTitle, Page, Segmented } from '../components/chrome';
import { Avatar, Skeleton, TierBadge } from '../components/bits';
import Mascot from '../components/Mascot';
import { group, item } from '../design/motion';
import { duration, ease, spring, stagger } from '../design/tokens';
import { number } from '../lib/format';
import './Ranking.css';

const SCOPES = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

export default function Ranking() {
  const { showToast, me } = useApp();
  const [scope, setScope] = useState('week');
  const [board, setBoard] = useState({});

  useEffect(() => {
    let alive = true;
    api.getLeaderboard(scope).then((b) => alive && setBoard((prev) => ({ ...prev, [scope]: b })), (e) => showToast(e.message, 'error'));
    return () => {
      alive = false;
    };
  }, [scope, showToast, me?.profile?.points]);

  const data = board[scope];
  const rows = data?.rows ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const meInList = rows.some((r) => r.is_me);

  return (
    <Page wide>
      <LargeTitle title="Rank" eyebrow={data ? `${number(data.players)} players ranked` : 'Leaderboard'} />
      <Item className="rank-scope"><Segmented value={scope} onChange={setScope} options={SCOPES} label="Time range" /></Item>

      {!data ? (
        <div className="stack-12"><Skeleton height={260} /><Skeleton height={320} /></div>
      ) : rows.length === 0 ? (
        <Item className="card empty">
          <Mascot mood="welcome" size={110} label="Vale beckoning you to start" />
          <div className="stack-8">
            <p className="t-headline">No one has scored {scope === 'all' ? 'yet' : scope === 'week' ? 'this week' : 'this month'}.</p>
            <p className="t-callout">Solve a deal and you’ll open the board.</p>
          </div>
        </Item>
      ) : (
        <div className="rank-layout">
          <Item><Podium key={scope} rows={podium} /></Item>
          <Item className="stack-12">
            {rest.length > 0 && (
              <motion.ol key={scope} className="rank-list" variants={group(stagger.children)} initial="hidden" animate="show">
                {rest.map((r) => <Row key={`${r.rank}-${r.name}`} r={r} />)}
              </motion.ol>
            )}
            {!meInList && data.me && (
              <div className="stack-8">
                <p className="group-label">You</p>
                {data.me.rank ? (
                  <ol className="rank-list"><Row r={data.me} /></ol>
                ) : (
                  <div className="card row">
                    <Avatar name={data.me.name} variant="me" />
                    <span className="grow t-callout">Solve a deal {scope === 'week' ? 'this week' : scope === 'month' ? 'this month' : ''} to get ranked.</span>
                  </div>
                )}
              </div>
            )}
          </Item>
        </div>
      )}
      <Item as="p" className="t-foot center">Points come from first-time correct answers. Faster answers earn up to 50% more.</Item>
    </Page>
  );
}

function Row({ r }) {
  return (
    <motion.li variants={item} className={`rank-row ${r.is_me ? 'is-me' : ''}`} aria-current={r.is_me ? 'true' : undefined}>
      <span className="fig rank-pos">{r.rank}</span>
      <Avatar name={r.name} variant={r.is_me ? 'solid' : ''} />
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
  1: { h: 150, metal: 'metal-gold', label: 'gold' },
  2: { h: 112, metal: 'metal-silver', label: 'silver' },
  3: { h: 88, metal: 'metal-bronze', label: 'bronze' },
};

function Podium({ rows }) {
  const reduce = useReducedMotion();
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  return (
    <div className="podium card">
      <div className="podium-glow" aria-hidden="true" />
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
                {r.rank === 1 && <Crown size={22} className="c-gold podium-crown" aria-hidden="true" />}
                <span style={{ position: 'relative' }}>
                  <Avatar name={r.name} variant={p.label} style={r.rank === 1 ? { width: 64, height: 64, fontSize: 20 } : { width: 52, height: 52 }} />
                  {r.is_me && <span className="chip chip--gold podium-you">You</span>}
                </span>
                <div className="center" style={{ minWidth: 0, width: '100%' }}>
                  <div className="t-label c-fg ellipsis">{r.name.split(' ')[0]}</div>
                  <div className="t-cap ellipsis">{r.school}</div>
                </div>
              </motion.div>
              <motion.div
                className={`podium-step ${p.metal}`}
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
