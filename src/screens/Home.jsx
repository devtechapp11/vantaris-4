import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useAnimate } from 'motion/react';
import { ArrowRight, Check, Clock, Gem, Lock, Target, Timer, Trophy, X } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useIsDesktop } from '../app/useDevice';
import { useRank } from '../app/useRank';
import { LEVEL_TIER } from '../app/usePlans';
import { CountUp, Item, Page } from '../components/chrome';
import { DifficultyBadge, PlanChip, Skeleton, TIER_LABEL, TierBadge } from '../components/bits';
import { ActivityChart, Ring } from '../components/charts';
import { ProgressBar, StatTile } from '../components/ui';
import Mascot from '../components/Mascot';
import StreakFlame from '../components/StreakFlame';
import TierEmblem from '../components/TierEmblem';
import { group, shake } from '../design/motion';
import { stagger } from '../design/tokens';
import { isLocked, ModuleIcon, takeNewlyUnlocked } from '../lib/modules';
import { greeting, number, relative, todayLine, weekday } from '../lib/format';
import './Home.css';

const KICKER = {
  'Working late': 'One more deal before the close?',
  'Good morning': 'Ready to close deals?',
  'Good afternoon': 'Markets are open. Ready to close deals?',
  'Good evening': 'Time for one more deal?',
};

export default function Home() {
  const { me, openPaywall } = useApp();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const rank = useRank(me?.profile?.points);

  const unlocked = useMemo(() => (me ? me.skills.filter((s) => !isLocked(s.level, me.tier.max_level)).map((s) => s.module_id) : []), [me]);
  const [fresh, setFresh] = useState(() => new Set());
  const unlockKey = unlocked.join(',');
  useEffect(() => {
    if (unlockKey) setFresh(takeNewlyUnlocked(unlockKey.split(',')));
  }, [unlockKey]);

  if (!me) return <HomeSkeleton />;

  const { profile, tier, quota, daily } = me;
  const firstName = profile.display_name.split(' ')[0];
  const hello = greeting();
  const next = me.continue[0];
  const nextSkill = next && me.skills.find((s) => s.name === next.module_name);
  const span = profile.next_level_at != null ? profile.next_level_at - profile.level_floor : 1;
  const progress = profile.next_level_at != null ? (profile.points - profile.level_floor) / span : 1;
  const toNext = profile.next_level_at != null ? profile.next_level_at - profile.points : 0;
  const open = (id) => navigate(`/practice/${id}`);

  return (
    <Page wide className="screen home">
      <Item className="home-hero">
        <div className="stack-12 grow">
          <p className="t-eyebrow">{todayLine()}</p>
          <h1 className="t-h1 home-greet">
            {hello}, {firstName}.
            <span className="home-kicker">{KICKER[hello]}</span>
          </h1>
          <div className="row-8 wrap">
            <TierBadge level={profile.level} />
            <PlanChip tier={tier.id} />
            {tier.id === 'free' && <Link to="/plans" className="chip chip--gold">Upgrade</Link>}
          </div>
        </div>
        <Mascot mood={profile.streak >= 3 ? 'streak' : 'idle'} size={desktop ? 168 : 112} label="Vale" className="home-vale" />
      </Item>

      {tier.id === 'free' && quota.limit != null && (
        <Item className="card quota">
          <div className="grow stack-4">
            <span className="t-headline"><span className="fig c-gold">{quota.remaining}</span> of <span className="fig">{quota.limit}</span> free deals left this week</span>
            <span className="t-foot">Resets on {weekday(quota.resets_at)}</span>
          </div>
          <ProgressBar value={quota.remaining / quota.limit} size="sm" label="Free deals left" />
          <Link to="/plans" className="btn btn--outline btn--sm">Go unlimited</Link>
        </Item>
      )}

      <motion.div className="grid-4" variants={group(stagger.children)}>
        <StatTile icon={<StreakFlame streak={profile.streak} size={20} />} label={`Day streak · best ${profile.streak_best}`} accent="var(--warn)">
          <CountUp to={profile.streak} />
        </StatTile>
        <StatTile icon={<Gem size={18} />} label="Vantaris score">
          <CountUp to={profile.points} />
        </StatTile>
        <StatTile icon={<Trophy size={18} />} label="Global rank" accent="var(--cyan)">
          {rank ? <>#<CountUp to={rank} /></> : <span className="c-3">—</span>}
        </StatTile>
        <StatTile icon={<Target size={18} />} label={`Accuracy · ${profile.solved} solved`} accent="var(--pos)">
          {profile.accuracy != null ? <CountUp to={Math.round(profile.accuracy * 100)} format={(v) => `${Math.round(v)}%`} /> : <span className="c-3">—</span>}
        </StatTile>
      </motion.div>

      <div className="home-main">
        <Item className="stack-16">
          {next ? (
            <button type="button" className="card card--interactive cont" onClick={() => open(next.id)}>
              <Ring value={nextSkill ? nextSkill.solved / Math.max(1, nextSkill.total) : 0} size={88} stroke={8}>
                <span className="stack center">
                  <span className="fig cont-pct">{nextSkill ? Math.round((nextSkill.solved / Math.max(1, nextSkill.total)) * 100) : 0}%</span>
                  <span className="t-cap">module</span>
                </span>
              </Ring>
              <span className="grow stack-8">
                <span className="t-eyebrow t-eyebrow--cyan">{next.opened ? 'Continue where you left off' : 'Up next'}</span>
                <span className="t-h3">{next.title}</span>
                <span className="t-foot">{next.kind} · {next.module_name}</span>
                <span className="row-8 wrap">
                  <DifficultyBadge value={next.difficulty} />
                  <span className="chip"><Clock size={12} aria-hidden="true" /> {next.minutes} min</span>
                </span>
              </span>
              <span className="btn btn--gold btn--sm cont-cta">{next.opened ? 'Continue' : 'Start'} <ArrowRight size={16} aria-hidden="true" /></span>
            </button>
          ) : (
            <div className="card cont">
              <Mascot mood="correct" size={88} decorative />
              <span className="grow stack-8">
                <span className="t-h3">Every deal on your desk is done.</span>
                <span className="t-callout">Unlock the next tier for harder modules.</span>
              </span>
              <Link to="/plans" className="btn btn--gold btn--sm btn--auto">See plans</Link>
            </div>
          )}
          {daily && <DailyCard daily={daily} onOpen={() => open(daily.id)} />}
        </Item>

        <Item className="card tiercard" data-tier={profile.level}>
          <div className="row-16">
            <TierEmblem level={profile.level} size={76} />
            <div className="stack-4">
              <span className="t-eyebrow">Current tier</span>
              <span className="t-h2">{profile.level}</span>
            </div>
          </div>
          <div className="stack-8">
            <div className="between">
              <span className="fig t-headline">{number(profile.points)} <span className="t-foot">pts</span></span>
              <span className="fig t-foot">{Math.round(Math.min(1, progress) * 100)}%</span>
            </div>
            <ProgressBar value={progress} glow label={`Progress to ${profile.next_level ?? 'the top'}`} />
            <span className="t-foot">
              {profile.next_level ? <><span className="fig c-fg">{toNext}</span> pts to {profile.next_level}</> : 'Top of the ladder. Keep your rank.'}
            </span>
          </div>
          <Link to="/ranking" className="btn btn--glass btn--md">See the leaderboard <ArrowRight size={16} aria-hidden="true" /></Link>
        </Item>
      </div>

      <Item as="section" className="stack-16" aria-labelledby="mods">
        <div className="section-head"><h2 id="mods">Modules</h2><Link to="/practice">All deals</Link></div>
        <div className="mod-grid">
          {me.skills.map((m) => (
            <ModuleCard
              key={m.module_id}
              m={m}
              locked={isLocked(m.level, tier.max_level)}
              fresh={fresh.has(m.module_id)}
              onOpen={() => navigate(`/practice?m=${m.module_id}`)}
              onLocked={() => openPaywall('level', { level: m.level })}
            />
          ))}
        </div>
      </Item>

      <div className="home-two">
        <Item as="section" className="card stack-12" aria-labelledby="act">
          <div className="between">
            <h2 id="act" className="t-title">Activity</h2>
            <span className="t-foot"><span className="fig c-fg">{number(me.week.reduce((s, d) => s + d.points, 0))}</span> pts this week</span>
          </div>
          <ActivityChart week={me.week} />
        </Item>
        <Item as="section" className="stack-12" aria-labelledby="rec">
          <div className="section-head"><h2 id="rec">Recent deals</h2></div>
          {me.recent.length ? (
            <div className="group">
              {me.recent.map((r) => (
                <button key={r.id} type="button" className="cell cell--indent" onClick={() => open(r.id)}>
                  <span className={`pstat ${r.correct ? 'pstat--correct' : 'pstat--wrong'}`} aria-label={r.correct ? 'Correct' : 'Incorrect'}>
                    {r.correct ? <Check size={15} strokeWidth={3} /> : <X size={15} strokeWidth={3} />}
                  </span>
                  <span className="grow">
                    <span className="cell-title" style={{ display: 'block' }}>{r.title}</span>
                    <span className="cell-sub">{r.kind} · {relative(r.submitted_at)}</span>
                  </span>
                  <span className={`fig ${r.points ? 'c-pos' : 'c-3'}`} style={{ fontWeight: 700 }}>{r.points ? `+${r.points}` : '0'}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="card empty">
              <Mascot mood="welcome" size={96} label="Vale beckoning you to start" />
              <div className="stack-8">
                <p className="t-headline">No deals closed yet.</p>
                <p className="t-callout">Your solved deals land here. Today’s challenge is a good first close.</p>
                {daily && <button type="button" className="btn btn--gold btn--sm btn--auto" onClick={() => open(daily.id)}>Take today’s deal <ArrowRight size={15} aria-hidden="true" /></button>}
              </div>
            </div>
          )}
        </Item>
      </div>
    </Page>
  );
}

function useCountdownToMidnight() {
  const calc = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((end - now) / 1000));
  };
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(left / 3600)).padStart(2, '0');
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function DailyCard({ daily, onOpen }) {
  const left = useCountdownToMidnight();
  const done = daily.status === 'correct' || daily.status === 'wrong';
  return (
    <button type="button" className={`card card--interactive daily ${done ? '' : 'pulse-border'}`} onClick={onOpen} aria-label={`Daily challenge: ${daily.title}, ${daily.kind}`}>
      <div className="daily-glow" aria-hidden="true" />
      <div className="between">
        <span className="t-eyebrow">Daily challenge</span>
        <span className="daily-timer fig" aria-label={`New challenge in ${left}`}><Timer size={13} aria-hidden="true" /> {left}</span>
      </div>
      <div className="stack-4">
        <span className="t-h3">{daily.title}</span>
        <span className="t-foot">{daily.kind} · {daily.module_name}</span>
      </div>
      <div className="between wrap">
        <span className="row-8"><DifficultyBadge value={daily.difficulty} /><span className="chip"><Clock size={12} aria-hidden="true" /> {daily.minutes} min</span></span>
        {daily.status === 'correct' ? (
          <span className="chip chip--pos"><Check size={13} strokeWidth={3} aria-hidden="true" /> Solved, +{daily.points}</span>
        ) : daily.status === 'wrong' ? (
          <span className="chip chip--neg">Review solution</span>
        ) : (
          <span className="btn btn--gold btn--sm">{daily.status === 'opened' ? 'Continue' : 'Solve now'} <ArrowRight size={15} aria-hidden="true" /></span>
        )}
      </div>
    </button>
  );
}

function ModuleCard({ m, locked, fresh, onOpen, onLocked }) {
  const [scope, animate] = useAnimate();
  const unlockTier = TIER_LABEL[LEVEL_TIER[m.level]];
  const click = async () => {
    if (!locked) return onOpen();
    animate(scope.current, shake);
    setTimeout(onLocked, 380);
    return undefined;
  };
  return (
    <button
      type="button"
      className={`mod ${locked ? 'mod--locked' : 'card--interactive'} ${fresh ? 'shimmer-sweep' : ''}`}
      data-tier={m.level}
      onClick={click}
      aria-label={locked ? `${m.name}, locked. Unlock with ${unlockTier}.` : `${m.name}, ${m.solved} of ${m.total} solved`}
    >
      <span className="mod-body">
        <span className="between">
          <span className="mod-icon"><ModuleIcon id={m.module_id} size={20} aria-hidden="true" /></span>
          <TierBadge level={m.level} />
        </span>
        <span className="stack-4">
          <span className="t-title">{m.name}</span>
          <span className="t-foot">{m.total} deals</span>
        </span>
        <span className="stack-4">
          <ProgressBar value={m.total ? m.solved / m.total : 0} size="sm" />
          <span className="t-cap fig">{m.solved}/{m.total} solved</span>
        </span>
      </span>
      {locked && (
        <span className="mod-lock">
          <span ref={scope} className="mod-lock-icon"><Lock size={20} aria-hidden="true" /></span>
          <span className="t-label c-gold">Unlock with {unlockTier}</span>
        </span>
      )}
    </button>
  );
}

function HomeSkeleton() {
  return (
    <Page wide className="screen home">
      <div className="top"><Skeleton height={16} width={160} /><Skeleton height={44} width={340} style={{ marginTop: 10 }} /></div>
      <div className="grid-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={128} />)}</div>
      <div className="home-main"><Skeleton height={300} /><Skeleton height={300} /></div>
      <div className="mod-grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={170} />)}</div>
    </Page>
  );
}
