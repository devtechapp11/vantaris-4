import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Lock, RotateCw, Timer, X } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useBoard } from '../app/useRank';
import { haptic } from '../app/prefs';
import { Item, Page, PullIndicator } from '../components/chrome';
import { Skeleton, TIER_LABEL } from '../components/bits';
import { RankGauge, StreakLine } from '../components/RankGauge';
import { BorderBeam, ComboBadge, NumberTicker, SessionBar, SoundToggle } from '../components/Momentum';
import RankCard from '../components/RankCard';
import Badges from '../components/Badges';
import { comboOf } from '../lib/momentum';
import Mascot from '../components/Mascot';
import { LEVEL_TIER } from '../app/usePlans';
import { isLocked } from '../lib/modules';
import { greeting, number, todayLine, weekday } from '../lib/format';
import { rememberShared, usePullToRefresh } from '../app/fluid';
import { prefetchProps } from '../app/routes';
import { sound } from '../lib/sound';
import { spring } from '../design/tokens';
import './Home.css';
import { useMeta } from '../app/useMeta';

/**
 * The terminal: one unmissable action (today's session), then the board
 * around you, a flash drill, your seat and the track to MD, as a bento of
 * smoked-glass panels.
 */
export default function Home() {
  useMeta({ title: 'Terminal' });
  const { me, openPaywall, refreshMe } = useApp();
  const ptr = usePullToRefresh(refreshMe);
  const navigate = useNavigate();
  const board = useBoard(me?.profile?.points);

  if (!me) return <HomeSkeleton />;

  const { profile, tier, quota, daily } = me;
  const firstName = profile.display_name.split(' ')[0];
  const next = me.continue[0];
  const dailyOpen = daily && daily.status !== 'correct' && daily.status !== 'wrong';
  const target = dailyOpen ? daily : next;
  const resuming = dailyOpen ? daily.status === 'opened' : next?.opened;
  const label = resuming ? 'Back to the deal' : 'Start the session';

  const steps = me.skills.map((m) => ({ ...m, locked: isLocked(m.level, tier.max_level), done: m.total > 0 && m.solved >= m.total }));
  const nextStep = steps.find((m) => !m.locked && !m.done);
  const run = comboOf(me);

  return (
    <Page wide className="screen home">
      <PullIndicator {...ptr} />
      <Item as="header" className="home-head">
        <div className="stack-8 grow">
          <p className="t-eyebrow">{todayLine()}</p>
          <h1 className="t-h1">{greeting()}, {firstName}.</h1>
        </div>
        <SoundToggle className="home-sound" />
        <Mascot mood={profile.streak >= 3 || run >= 3 ? 'streak' : 'idle'} size={64} decorative className="home-mascot" />
      </Item>

      <div className="bento">
        <Item as="section" className="b-mission smoke smoke--pad" aria-labelledby="today">
          {target && <BorderBeam duration={8} />}
          <div className="between">
            <p id="today" className="t-eyebrow">{dailyOpen ? 'Mission of the day' : next ? 'Next mission' : 'Desk cleared'}</p>
            {target && <span className="chip fig">{target.kind}</span>}
          </div>
          {target ? (
            <>
              <div className="stack-4">
                <p className="t-h2 b-mission-title">{target.title}</p>
                <p className="t-foot">{target.module_name}</p>
              </div>
              <motion.button
                type="button"
                className="btn btn--primary btn--lg home-cta"
                whileTap={{ scale: 0.97 }}
                transition={spring.snappy}
                {...prefetchProps(`/practice/${target.id}`)}
                onClick={() => {
                  rememberShared(`deal-${target.id}`, document.querySelector('.b-mission-title'));
                  navigate(`/practice/${target.id}`);
                }}
              >
                <span>{label}</span>
                <span className="home-cta-time fig-mono"><Timer size={15} aria-hidden="true" /> {target.minutes} min</span>
                <ArrowRight size={18} aria-hidden="true" />
              </motion.button>
            </>
          ) : (
            <>
              <p className="t-callout">Every deal on your desk is closed. The harder desks, and the bigger tickets, open on the next plan.</p>
              <Link to="/plans" className="btn btn--primary btn--lg home-cta">Open the next desk <ArrowRight size={18} aria-hidden="true" /></Link>
            </>
          )}
          <div className="b-mission-meta">
            <StreakLine streak={profile.streak} activeToday={profile.active_today} />
            <ComboBadge n={run} />
          </div>
          <SessionBar me={me} />
          {tier.id === 'free' && quota.limit != null && (
            <p className="t-foot">
              <span className="fig c-fg">{quota.remaining}</span> of <span className="fig">{quota.limit}</span> free deals left this week · back {weekday(quota.resets_at)} · <Link to="/plans" className="link">Go unlimited</Link>
            </p>
          )}
        </Item>

        <Item as="section" className="b-rival smoke smoke--pad" aria-labelledby="rival">
          <Rival board={board} points={profile.points} />
        </Item>

        <Item as="section" className="b-card smoke smoke--pad" aria-label="Your rank card">
          <RankCard name={profile.display_name} level={profile.level} points={profile.points} rank={board?.rank ?? null} since={profile.created_at} />
        </Item>

        <Item as="section" className="b-flash smoke smoke--pad" aria-labelledby="flash">
          <FlashDrill />
        </Item>

        <Item as="section" className="b-gauge smoke smoke--pad" aria-label="Your career">
          <RankGauge points={profile.points} level={profile.level} />
        </Item>

        <Item as="section" className="b-medals smoke smoke--pad" aria-labelledby="medals">
          <div className="between">
            <h2 id="medals" className="t-eyebrow">Medals</h2>
            <Link to="/profile" className="link t-foot tap-target b-medals-count" aria-label="Medals on your profile"><span className="fig">{me.achievements.filter((a) => a.earned).length}/{me.achievements.length}</span></Link>
          </div>
          <Badges achievements={me.achievements} compact />
          <p className="t-cap">{nextMedal(me.achievements)}</p>
        </Item>

        <Item as="section" className="b-track smoke smoke--pad" aria-labelledby="path">
          <div className="between">
            <h2 id="path" className="t-eyebrow">Your track to MD</h2>
            <Link to="/practice" className="link t-foot tap-target">Deal library</Link>
          </div>
          <ol className="path">
            {steps.map((m) => {
              const isNext = nextStep?.module_id === m.module_id;
              const state = m.done ? 'done' : m.locked ? 'locked' : isNext ? 'next' : 'open';
              return (
                <li key={m.module_id} className={`path-step is-${state}`}>
                  <button
                    type="button"
                    className="path-btn"
                    aria-current={isNext ? 'step' : undefined}
                    onClick={() => (m.locked ? openPaywall('level', { level: m.level }) : navigate(`/practice?m=${m.module_id}`))}
                    aria-label={m.locked ? `${m.name}, locked. Opens with ${TIER_LABEL[LEVEL_TIER[m.level]]}.` : `${m.name}, ${m.solved} of ${m.total} solved${isNext ? ', next step' : ''}`}
                  >
                    <span className="path-node" aria-hidden="true">
                      {m.done ? <Check size={14} strokeWidth={2} /> : m.locked ? <Lock size={12} strokeWidth={1.75} /> : null}
                    </span>
                    <span className="path-text">
                      <span className="path-name">{m.name}</span>
                      <span className="t-cap fig">{m.locked ? `${m.level} desk · ${TIER_LABEL[LEVEL_TIER[m.level]]}` : `${m.solved}/${m.total} closed`}{isNext ? ' · your next move' : ''}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Item>
      </div>
    </Page>
  );
}

const shortName = (name = '') => {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};

function nextMedal(achievements) {
  const next = achievements.find((a) => !a.earned);
  return next ? `Next medal: ${next.name}. ${next.detail}.` : 'Every medal on the wall.';
}

/** The board around you, live from the leaderboard: the exact gap to the player just ahead. */
function Rival({ board, points }) {
  if (!board) {
    return (
      <div className="stack-12">
        <p id="rival" className="t-eyebrow">The board</p>
        <Skeleton height={28} width="80%" />
        <Skeleton height={72} />
      </div>
    );
  }
  const { rank, players, above, gap, top, topAfter, rows } = board;
  const i = rows.findIndex((r) => r.is_me);
  const near = i >= 0 ? rows.slice(Math.max(0, i - 1), i + 2) : rows.slice(0, 2);
  let title;
  let line;
  if (!rank) {
    title = 'One closed deal puts you on the board.';
    line = players ? `${number(players)} ${players === 1 ? 'player is' : 'players are'} ranked. Take your seat.` : 'No one has scored yet. The first close takes the top seat.';
  } else if (above) {
    title = <>Only <b className="fig-mono"><NumberTicker value={gap} /></b> XP to pass {shortName(above.name)}</>;
    line = topAfter && topAfter < top ? `…and move into the Top ${topAfter}%.` : `You’re #${rank} of ${number(players)}.`;
  } else {
    title = 'You lead the desk.';
    line = `#1 of ${number(players)}. Close a deal today to hold the seat.`;
  }
  return (
    <div className="stack-12">
      <div className="between">
        <p id="rival" className="t-eyebrow">The board · all time</p>
        {top && <span className="chip chip--strong fig">Top {top}%</span>}
      </div>
      <p className="t-headline b-rival-title">{title}</p>
      <p className="t-foot">{line}</p>
      {near.length > 0 && (
        <ol className="b-board" aria-label="Players around you">
          {near.map((r) => (
            <li key={`${r.rank}-${r.name}`} className={r.is_me ? 'is-me' : ''}>
              <span className="fig-mono b-board-rank">#{r.rank}</span>
              <span className="grow ellipsis">{r.is_me ? 'You' : shortName(r.name)}</span>
              <span className="fig-mono">{number(r.is_me ? points : r.points)}</span>
            </li>
          ))}
        </ol>
      )}
      <Link to="/ranking" className="link t-foot tap-target b-rival-link">Full ranking <ArrowRight size={14} aria-hidden="true" /></Link>
    </div>
  );
}

/* ---------- Flash drill: thirty-second mental maths, on the house ---------- */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt = (v, unit) => (unit === '%' ? `${v.toFixed(1)}%` : unit === 'x' ? `${v.toFixed(1)}x` : `$${number(Math.round(v))}M`);

function makeDrill() {
  const kind = pick(['ev', 'multiple', 'margin', 'moic']);
  let text;
  let answer;
  let unit;
  let wrong;
  if (kind === 'ev') {
    const e = pick([30, 40, 45, 60, 75, 80, 120]);
    const m = pick([6, 7.5, 8, 9, 10, 12]);
    text = `EBITDA $${e}M at ${m.toFixed(1)}x. Enterprise value?`;
    answer = e * m; unit = 'M';
    wrong = [e * (m + 1), e * (m - 1.5), e + m * 10];
  } else if (kind === 'multiple') {
    const e = pick([40, 50, 80, 100]);
    const m = pick([6, 8, 9, 11, 12.5]);
    text = `EV $${number(e * m)}M on EBITDA of $${e}M. The multiple?`;
    answer = m; unit = 'x';
    wrong = [m + 1.5, m - 1, m * 1.2];
  } else if (kind === 'margin') {
    const r = pick([200, 250, 400, 500, 800]);
    const pct = pick([12, 15, 18, 20, 24, 30]);
    text = `Revenue $${r}M, EBITDA $${(r * pct) / 100}M. EBITDA margin?`;
    answer = pct; unit = '%';
    wrong = [pct + 5, pct * 1.5, pct - 4];
  } else {
    const inv = pick([100, 150, 200, 250]);
    const m = pick([2, 2.5, 3, 3.5]);
    text = `Equity in $${inv}M, out $${inv * m}M. MOIC?`;
    answer = m; unit = 'x';
    wrong = [m + 0.5, m - 0.5, m * 1.5];
  }
  const options = [answer, ...wrong.filter((w) => w > 0 && w !== answer)].slice(0, 4).map((v) => fmt(v, unit));
  const uniq = [...new Set(options)];
  while (uniq.length < 4) uniq.push(fmt(answer * (1 + uniq.length * 0.25), unit));
  const correct = uniq[0];
  return { text, options: uniq.sort(() => Math.random() - 0.5), correct, id: Math.random() };
}

function FlashDrill() {
  const reduce = useReducedMotion();
  const [q, setQ] = useState(makeDrill);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState({ right: 0, done: 0 });
  const answer = (o) => {
    if (picked) return;
    setPicked(o);
    const right = o === q.correct;
    setScore((s) => ({ right: s.right + (right ? 1 : 0), done: s.done + 1 }));
    if (right) { sound.correct(score.right + 1); haptic([10, 30, 14]); } else { sound.wrong(); haptic([20, 40, 20]); }
  };
  const again = () => {
    setPicked(null);
    setQ(makeDrill());
  };
  return (
    <div className="stack-12">
      <div className="between">
        <p id="flash" className="t-eyebrow">Flash drill</p>
        <span className="t-cap fig">{score.done ? `${score.right}/${score.done} right` : 'Practice · no XP'}</span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={q.id} className="stack-12" initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring.snappy}>
          <p className="t-headline">{q.text}</p>
          <div className="flash-opts" role="radiogroup" aria-label="Your answer">
            {q.options.map((o) => {
              const state = !picked ? 'idle' : o === q.correct ? 'answer' : o === picked ? 'wrong' : 'dim';
              return (
                <motion.button key={o} type="button" role="radio" aria-checked={picked === o} className="flash-opt fig-mono" data-state={state} disabled={Boolean(picked)} onClick={() => answer(o)} whileTap={{ scale: 0.97 }}>
                  {state === 'answer' && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
                  {state === 'wrong' && <X size={14} strokeWidth={2.5} aria-hidden="true" />}
                  {o}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
      {picked && (
        <button type="button" className="btn btn--secondary btn--sm btn--auto flash-next" onClick={again} autoFocus>
          <RotateCw size={15} aria-hidden="true" /> Another one
        </button>
      )}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <Page wide className="screen home">
      <div className="home-head"><div className="stack-8 grow"><Skeleton height={14} width={160} /><Skeleton height={40} width={300} /></div></div>
      <div className="bento">
        <div className="b-mission"><Skeleton height={320} /></div>
        <div className="b-rival"><Skeleton height={200} /></div>
        <div className="b-card"><Skeleton height={200} /></div>
      </div>
    </Page>
  );
}
