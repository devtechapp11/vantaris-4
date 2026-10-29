import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { LargeTitle, Page, Segmented } from '../components/chrome';
import { Avatar, Skeleton } from '../components/bits';
import Mascot from '../components/Mascot';
import { number } from '../lib/format';

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
    <Page>
      <LargeTitle title="Ranking" eyebrow={data ? `${number(data.players)} players ranked` : ' '} />
      <Segmented value={scope} onChange={setScope} options={SCOPES} label="Time range" />

      {!data ? (
        <div className="stack-12"><Skeleton height={190} /><Skeleton height={300} /></div>
      ) : rows.length === 0 ? (
        <div className="card stack-12 center" style={{ alignItems: 'center' }}>
          <Mascot mood="idle" size={80} />
          <p className="t-headline">No one has scored {scope === 'all' ? 'yet' : scope === 'week' ? 'this week' : 'this month'}</p>
          <p className="t-callout">Solve a problem and you’ll open the board.</p>
        </div>
      ) : (
        <>
          <Podium rows={podium} />
          {rest.length > 0 && (
            <div className="group">
              {rest.map((r) => <Row key={`${r.rank}-${r.name}`} r={r} />)}
            </div>
          )}
          {!meInList && data.me && (
            <div className="stack-8">
              <p className="group-label">You</p>
              <div className="group">
                {data.me.rank ? <Row r={data.me} /> : (
                  <div className="cell"><Avatar name={data.me.name} variant="me" /><span className="grow t-callout">Solve a problem {scope === 'week' ? 'this week' : scope === 'month' ? 'this month' : ''} to get ranked.</span></div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <p className="t-foot center">Points come from first-time correct answers. Faster answers earn up to 50% more.</p>
    </Page>
  );
}

function Row({ r }) {
  return (
    <div className="cell" style={r.is_me ? { background: 'var(--accent-soft)' } : undefined} aria-current={r.is_me ? 'true' : undefined}>
      <span className="fig c-3" style={{ width: 28, textAlign: 'right', fontSize: 14, fontWeight: 600 }}>{r.rank}</span>
      <Avatar name={r.name} variant={r.is_me ? 'solid' : ''} />
      <span className="grow">
        <span className="cell-title ellipsis" style={{ display: 'block', fontWeight: r.is_me ? 700 : 500 }}>{r.name}{r.is_me ? ' (you)' : ''}</span>
        <span className="cell-sub ellipsis" style={{ display: 'block' }}>{r.school || r.level}</span>
      </span>
      <span className="fig" style={{ fontWeight: 600 }}>{number(r.points)}</span>
    </div>
  );
}

function Podium({ rows }) {
  const reduce = useReducedMotion();
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  const heights = { 1: 96, 2: 70, 3: 54 };
  const tone = { 1: 'gold', 2: 'silver', 3: 'bronze' };
  return (
    <div className="card" style={{ padding: '20px 12px 0', display: 'grid', gridTemplateColumns: `repeat(${order.length}, 1fr)`, alignItems: 'end', gap: 8 }}>
      {order.map((r, i) => (
        <motion.div
          key={`${r.rank}-${r.name}`}
          className="stack-8"
          style={{ alignItems: 'center', minWidth: 0 }}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
        >
          <span style={{ position: 'relative' }}>
            <Avatar name={r.name} variant={tone[r.rank] ?? ''} />
            {r.is_me && <span className="chip chip--accent" style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', height: 18, fontSize: 10, padding: '0 6px' }}>You</span>}
          </span>
          <div className="center" style={{ minWidth: 0, width: '100%' }}>
            <div className="t-label c-fg ellipsis">{r.name.split(' ')[0]}</div>
            <div className="t-cap ellipsis">{r.school}</div>
          </div>
          <div
            style={{
              width: '100%', height: heights[r.rank] ?? 50, borderRadius: '12px 12px 0 0',
              background: r.rank === 1 ? 'linear-gradient(180deg, var(--brass-soft), var(--surface-2))' : 'var(--surface-2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            }}
          >
            <span style={{ font: '500 22px/1 var(--font-display)', color: r.rank === 1 ? 'var(--brass-ink)' : 'var(--fg-2)' }}>{r.rank}</span>
            <span className="fig" style={{ fontSize: 13, fontWeight: 600 }}>{number(r.points)}</span>
          </div>
        </motion.div>
      ))}
      <span className="sr-only">Top three: {rows.map((r) => `${r.rank}. ${r.name}, ${r.points} points`).join('; ')}</span>
    </div>
  );
}
