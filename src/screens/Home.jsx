import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Lock } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useRank } from '../app/useRank';
import { Item, Page, PullIndicator } from '../components/chrome';
import { Skeleton, TIER_LABEL } from '../components/bits';
import { RankGauge, StreakLine } from '../components/RankGauge';
import { ComboBadge, SessionBar, SoundToggle } from '../components/Momentum';
import { comboOf } from '../lib/momentum';
import Mascot from '../components/Mascot';
import { Magnetic } from '../components/effects';
import { LEVEL_TIER } from '../app/usePlans';
import { isLocked } from '../lib/modules';
import { greeting, todayLine, weekday } from '../lib/format';
import { rememberShared, usePullToRefresh } from '../app/fluid';
import { prefetchProps } from '../app/routes';
import './Home.css';
import { useMeta } from '../app/useMeta';

/**
 * Home has one job: get you into today's deal.
 * One primary action, the path through the modules with the next step lit,
 * and three numbers. Everything else lives one tap away (Deals, Rank, Profile).
 */
export default function Home() {
  useMeta({ title: 'Home' });
  const { me, openPaywall, refreshMe } = useApp();
  const ptr = usePullToRefresh(refreshMe);
  const navigate = useNavigate();
  const rank = useRank(me?.profile?.points);

  if (!me) return <HomeSkeleton />;

  const { profile, tier, quota, daily } = me;
  const firstName = profile.display_name.split(' ')[0];
  const next = me.continue[0];
  const dailyOpen = daily && daily.status !== 'correct' && daily.status !== 'wrong';
  const target = dailyOpen ? daily : next;
  const label = dailyOpen
    ? daily.status === 'opened' ? 'Back to the deal' : 'Take today’s deal'
    : next ? (next.opened ? 'Back to the deal' : 'Take the next deal') : null;

  const steps = me.skills.map((m) => ({ ...m, locked: isLocked(m.level, tier.max_level), done: m.total > 0 && m.solved >= m.total }));
  const nextStep = steps.find((m) => !m.locked && !m.done);

  return (
    <Page wide className="screen home">
      <PullIndicator {...ptr} />
      <Item as="header" className="home-head">
        <div className="stack-8 grow">
          <p className="t-eyebrow">{todayLine()}</p>
          <h1 className="t-h1">{greeting()}, {firstName}.</h1>
        </div>
        <SoundToggle className="home-sound" />
        <Mascot mood={profile.streak >= 3 ? 'streak' : 'idle'} size={64} decorative className="home-mascot" />
      </Item>

      <div className="home-grid">
        <div className="home-main">
          <Item as="section" className="home-today metal metal--pad" aria-labelledby="today">
            <div className="between">
              <p id="today" className="t-eyebrow">{dailyOpen ? 'On your desk today' : next ? 'Next on your desk' : 'Desk cleared'}</p>
              {target && <span className="chip fig">{target.minutes} min</span>}
            </div>
            {target ? (
              <>
                <div className="stack-4">
                  <p className="t-h2">{target.title}</p>
                  <p className="t-foot">{target.kind} · {target.module_name}</p>
                </div>
                <Magnetic className="home-cta-wrap">
                  <button
                    type="button"
                    className="btn btn--primary btn--lg home-cta"
                    {...prefetchProps(`/practice/${target.id}`)}
                    onClick={() => {
                      rememberShared(`deal-${target.id}`, document.querySelector('.home-today .t-h2'));
                      navigate(`/practice/${target.id}`);
                    }}
                  >
                    {label} <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </Magnetic>
              </>
            ) : (
              <>
                <p className="t-callout">Every deal on your desk is closed. The harder desks, and the bigger tickets, open on the next plan.</p>
                <Link to="/plans" className="btn btn--primary btn--lg home-cta">Open the next desk <ArrowRight size={18} aria-hidden="true" /></Link>
              </>
            )}
            <StreakLine streak={profile.streak} activeToday={profile.active_today} />
            <ComboBadge n={comboOf(me.recent)} />
            <SessionBar me={me} />
            {tier.id === 'free' && quota.limit != null && (
              <p className="t-foot">
                <span className="fig c-fg">{quota.remaining}</span> of <span className="fig">{quota.limit}</span> free deals left this week · back {weekday(quota.resets_at)} · <Link to="/plans" className="link">Go unlimited</Link>
              </p>
            )}
          </Item>

          <Item as="section" className="home-level" aria-label="Your career">
            <RankGauge points={profile.points} level={profile.level} />
            <Link to="/ranking" className="home-rank tap-target">
              {rank ? <>Desk rank <b className="fig-mono">#{rank}</b></> : 'One closed deal puts you on the board'}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </Item>

        </div>

        <Item as="section" className="home-path" aria-labelledby="path">
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

function HomeSkeleton() {
  return (
    <Page wide className="screen home">
      <div className="home-head"><div className="stack-8 grow"><Skeleton height={14} width={160} /><Skeleton height={40} width={300} /></div></div>
      <div className="home-grid">
        <div className="home-main"><Skeleton height={180} /><Skeleton height={72} /></div>
        <Skeleton height={360} />
      </div>
    </Page>
  );
}
