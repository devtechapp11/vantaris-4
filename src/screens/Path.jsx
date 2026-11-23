import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Building2, Calculator, FileSpreadsheet, Flame, History, LifeBuoy, Lock, Merge, Puzzle, Repeat2, Scale, Star, Zap } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useRank } from '../app/useRank';
import { useMedia } from '../app/useDevice';
import { Page } from '../components/chrome';
import PathSwitch from '../components/PathSwitch';
import { Skeleton, TIER_LABEL } from '../components/bits';
import { LEVEL_TIER } from '../app/usePlans';
import { isLocked } from '../lib/modules';
import { CHAPTERS } from '../content/path';
import { prefetchProps } from '../app/routes';
import { careerName } from '../lib/career';
import { spring } from '../design/tokens';
import { useMeta } from '../app/useMeta';
import './Path.css';

const ICONS = { FileSpreadsheet, Calculator, Scale, History, Building2, Merge, LifeBuoy, Puzzle };
const DESK = { Analyst: 'Analyst desk', Associate: 'Associate desk', VP: 'VP desk', MD: 'MD desk' };

const NODE = 76; // disc diameter
const ROW = 168; // vertical rhythm per chapter
const UNIT = 76; // desk header

/**
 * The Deal Path: one winding route through the eight desks. Each chapter is a
 * metal node with 0–3 platinum stars; the next one glows and carries the only
 * button on the screen.
 */
export default function Path() {
  useMeta({ title: 'Deal Path' });
  const { me, openPaywall, showToast } = useApp();
  const navigate = useNavigate();
  const rank = useRank(me?.profile?.points);
  const wide = useMedia('(min-width: 768px)');
  const reduce = useReducedMotion();
  const activeRef = useRef(null);
  const loaded = me != null;

  // Bring the next chapter into view on arrival
  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.75) el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, [reduce, loaded]);

  if (!me) return <PathSkeleton />;

  const stars = me.path?.stars ?? {};
  const total = me.path?.total ?? 0;
  const levelOf = Object.fromEntries(me.skills.map((m) => [m.module_id, m.level]));
  const nodes = CHAPTERS.map((c, i) => {
    const level = levelOf[c.id] ?? c.level;
    return {
      ...c,
      level,
      stars: stars[c.id] ?? 0,
      tierLocked: isLocked(level, me.tier.max_level),
      reachable: i === 0 || (stars[CHAPTERS[i - 1].id] ?? 0) >= 1,
    };
  });
  const active = nodes.findIndex((n) => n.stars === 0);
  const due = me.review?.due?.length ?? 0;

  // Layout: a sine-wave column, desk headers between levels.
  const W = wide ? 440 : 320;
  const amp = W / 2 - 56;
  let y = 0;
  const items = [];
  nodes.forEach((n, i) => {
    if (i === 0 || nodes[i - 1].level !== n.level) {
      items.push({ kind: 'unit', level: n.level, y });
      y += UNIT;
    }
    const cx = W / 2 + amp * Math.sin((i * Math.PI) / 3 + Math.PI / 6);
    items.push({ kind: 'node', n, i, cx, y });
    y += ROW;
  });
  const H = y;
  const pts = items.filter((it) => it.kind === 'node').map((it) => [it.cx, it.y + 14 + NODE / 2]);
  const curve = (list) => list.reduce((d, [x, yy], k) => (k === 0 ? `M ${x} ${yy}` : `${d} C ${list[k - 1][0]} ${list[k - 1][1] + ROW / 2}, ${x} ${yy - ROW / 2}, ${x} ${yy}`), '');
  const reached = active < 0 ? pts : pts.slice(0, active + 1);

  const open = (n) => {
    if (n.tierLocked) return openPaywall('level', { level: n.level });
    if (!n.reachable) return showToast(`Earn a star on “${nodes[n.index - 1]?.title}” to open this chapter.`);
    navigate(`/learn/${n.id}`);
    return undefined;
  };

  return (
    <Page wide className="screen path-screen">
      <header className="pbar glass" aria-label="Your standing">
        <Link to="/ranking" className="pbar-stat pbar-rank" aria-label={`${careerName(me.profile.level)}${rank ? `, rank ${rank}` : ''}. Open the ranking`}>
          <span className="pbar-badge">{me.profile.level}</span>
          {rank ? <b className="fig-mono">#{rank}</b> : <span className="t-cap">Unranked</span>}
        </Link>
        <span className={`pbar-stat ${me.profile.active_today ? 'is-lit' : ''}`} aria-label={`${me.profile.streak}-day streak`}>
          <Flame size={18} aria-hidden="true" /> <b className="fig-mono">{me.profile.streak}</b>
        </span>
        <span className="pbar-stat" aria-label={`${total} stars`}>
          <Star size={18} aria-hidden="true" className="pbar-star" /> <b className="fig-mono">{total}</b>
        </span>
      </header>

      <PathSwitch value="guided" />

      <div className="path-chips">
        {due > 0 && (
          <motion.button type="button" className="pchip pchip--review" whileTap={{ scale: 0.96 }} onClick={() => navigate('/learn/review')} {...prefetchProps('/learn/review')}>
            <Repeat2 size={17} aria-hidden="true" /> Review <b className="fig-mono">{due}</b> fragile {due === 1 ? 'notion' : 'notions'}
          </motion.button>
        )}
        <motion.button type="button" className="pchip" whileTap={{ scale: 0.96 }} onClick={() => navigate('/blitz')} {...prefetchProps('/blitz')}>
          <Zap size={17} aria-hidden="true" /> Blitz · 60s{me.blitz_best ? <> · best <b className="fig-mono">{me.blitz_best}</b></> : null}
        </motion.button>
      </div>

      <div className="path" style={{ width: W, height: H }}>
        <svg className="path-trail" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <defs>
            <linearGradient id="trail-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--white-metal)" />
              <stop offset="0.5" stopColor="var(--chrome-hi)" />
              <stop offset="1" stopColor="var(--platinum)" />
            </linearGradient>
          </defs>
          <path d={curve(pts)} className="trail-base" />
          {reached.length > 1 && (
            <motion.path d={curve(reached)} className="trail-lit" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
          )}
        </svg>

        {items.map((it) => (it.kind === 'unit' ? (
          <div key={`u-${it.level}`} className="punit" style={{ top: it.y + 18 }}>
            <span>{DESK[it.level] ?? it.level}</span>
            {isLocked(it.level, me.tier.max_level) && <em><Lock size={11} aria-hidden="true" /> {TIER_LABEL[LEVEL_TIER[it.level]]}</em>}
          </div>
        ) : (
          <Chapter
            key={it.n.id}
            n={{ ...it.n, index: it.i }}
            cx={it.cx}
            y={it.y}
            W={W}
            isActive={it.i === active}
            activeRef={it.i === active ? activeRef : null}
            onOpen={open}
          />
        )))}
      </div>

    </Page>
  );
}

function Chapter({ n, cx, y, W, isActive, activeRef, onOpen }) {
  const Icon = ICONS[n.icon] ?? Star;
  const state = n.tierLocked ? 'locked' : !n.reachable ? 'closed' : n.stars === 3 ? 'gold' : n.stars > 0 ? 'done' : isActive ? 'active' : 'open';
  const left = cx < W / 2;
  const panel = left ? { left: cx + NODE / 2 + 16, right: 0 } : { left: 0, right: W - (cx - NODE / 2 - 16) };
  const label = `${n.title}. ${n.tierLocked ? `Locked: ${TIER_LABEL[LEVEL_TIER[n.level]]}.` : !n.reachable ? 'Not open yet.' : `${n.stars} of 3 stars.`}`;
  return (
    <div className={`pch is-${state}`} ref={activeRef}>
      <motion.button
        type="button"
        className="pnode"
        style={{ left: cx - NODE / 2, top: y + 14 }}
        onClick={() => onOpen(n)}
        whileTap={{ scale: 0.96 }}
        transition={spring.snappy}
        aria-label={label}
        {...(n.tierLocked || !n.reachable ? {} : prefetchProps(`/learn/${n.id}`))}
      >
        {isActive && <span className="pnode-ring" aria-hidden="true" />}
        <span className="pnode-edge" aria-hidden="true" />
        <span className="pnode-face" aria-hidden="true">
          {state === 'locked' || state === 'closed' ? <Lock size={22} strokeWidth={1.8} /> : <Icon size={26} strokeWidth={1.6} />}
        </span>
      </motion.button>
      <span className="pstars" style={{ left: cx - 36, top: y + 14 + NODE + 10 }} aria-hidden="true">
        {[1, 2, 3].map((k) => <Star key={k} size={15} className={k <= n.stars ? 'is-on' : ''} />)}
      </span>
      <div className={`ppanel ${left ? '' : 'ppanel--r'}`} style={{ ...panel, top: y + 4 }}>
        <Artifact kind={n.artifact} />
        <p className="ppanel-title">{n.title}</p>
        {isActive && !n.tierLocked ? (
          <motion.button type="button" className="btn btn--primary btn--sm pstart" onClick={() => onOpen(n)} whileTap={{ scale: 0.96 }} {...prefetchProps(`/learn/${n.id}`)}>
            Start
          </motion.button>
        ) : (
          <p className="t-cap">
            {n.tierLocked ? `Opens with ${TIER_LABEL[LEVEL_TIER[n.level]]}` : !n.reachable ? 'Opens at 1★ on the last chapter' : n.stars === 3 ? 'Mastered' : n.stars > 0 ? 'Replay for 3 stars' : '6 questions · 2 min'}
          </p>
        )}
      </div>
    </div>
  );
}

/** Small platinum and smoked-glass solids, turning slowly beside each chapter. */
function Artifact({ kind }) {
  if (kind === 'rings') {
    return (
      <span className="art art--rings" aria-hidden="true">
        <span className="art-spin"><i /><i /><i /></span>
      </span>
    );
  }
  if (kind === 'pyramid') {
    return (
      <span className="art art--pyramid" aria-hidden="true">
        <span className="art-spin"><i /><i /><i /><i /></span>
      </span>
    );
  }
  return (
    <span className="art art--cube" aria-hidden="true">
      <span className="art-spin"><i /><i /><i /><i /><i /><i /></span>
    </span>
  );
}

function PathSkeleton() {
  return (
    <Page wide className="screen path-screen">
      <Skeleton height={56} />
      <div className="stack-24" style={{ alignItems: 'center' }}>
        {[0, 1, 2, 3].map((k) => <Skeleton key={k} height={76} width={76} radius={38} />)}
      </div>
    </Page>
  );
}
