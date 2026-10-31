import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Lock } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useRank } from '../app/useRank';
import { CountUp, Item, Page } from '../components/chrome';
import { Skeleton, TIER_LABEL } from '../components/bits';
import { ProgressBar } from '../components/ui';
import Mascot from '../components/Mascot';
import { LEVEL_TIER } from '../app/usePlans';
import { isLocked } from '../lib/modules';
import { greeting, number, todayLine, weekday } from '../lib/format';
import './Home.css';

/**
 * Home has one job: get you into today's deal.
 * One primary action, the path through the modules with the next step lit,
 * and three numbers. Everything else lives one tap away (Deals, Rank, Profile).
 */
export default function Home() {
  const { me, openPaywall } = useApp();
  const navigate = useNavigate();
  const rank = useRank(me?.profile?.points);

  if (!me) return <HomeSkeleton />;

  const { profile, tier, quota, daily } = me;
  const firstName = profile.display_name.split(' ')[0];
  const next = me.continue[0];
  const dailyOpen = daily && daily.status !== 'correct' && daily.status !== 'wrong';
  const target = dailyOpen ? daily : next;
  const label = dailyOpen
    ? daily.status === 'opened' ? 'Continue today’s deal' : 'Start today’s deal'
    : next ? (next.opened ? 'Continue your deal' : 'Start the next deal') : null;

  const span = profile.next_level_at != null ? profile.next_level_at - profile.level_floor : 1;
  const progress = profile.next_level_at != null ? (profile.points - profile.level_floor) / span : 1;
  const toNext = profile.next_level_at != null ? profile.next_level_at - profile.points : 0;

  const steps = me.skills.map((m) => ({ ...m, locked: isLocked(m.level, tier.max_level), done: m.total > 0 && m.solved >= m.total }));
  const nextStep = steps.find((m) => !m.locked && !m.done);

  return (
    <Page wide className="screen home">
      <Item as="header" className="home-head">
        <div className="stack-8 grow">
          <p className="t-eyebrow">{todayLine()}</p>
          <h1 className="t-h1">{greeting()}, {firstName}.</h1>
        </div>
        <Mascot mood={profile.streak >= 3 ? 'streak' : 'idle'} size={64} decorative className="home-mascot" />
      </Item>

      <div className="home-grid">
        <div className="home-main">
          <Item as="section" className="home-today" aria-labelledby="today">
            <p id="today" className="t-eyebrow">{dailyOpen ? 'Today’s deal' : next ? 'Up next' : 'All caught up'}</p>
            {target ? (
              <>
                <div className="stack-4">
                  <p className="t-h2">{target.title}</p>
                  <p className="t-foot">{target.kind} · {target.module_name} · <span className="fig">{target.minutes}</span> min</p>
                </div>
                <button type="button" className="btn btn--gold btn--lg home-cta" onClick={() => navigate(`/practice/${target.id}`)} data-magnetic>
                  {label} <ArrowRight size={18} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <p className="t-callout">Every deal on your desk is closed. Harder modules open on the next plan.</p>
                <Link to="/plans" className="btn btn--gold btn--lg home-cta">See plans <ArrowRight size={18} aria-hidden="true" /></Link>
              </>
            )}
            {tier.id === 'free' && quota.limit != null && (
              <p className="t-foot">
                <span className="fig c-fg">{quota.remaining}</span> of <span className="fig">{quota.limit}</span> free deals left · resets {weekday(quota.resets_at)} · <Link to="/plans" className="link">Go unlimited</Link>
              </p>
            )}
          </Item>

          <Item as="dl" className="home-stats" aria-label="Your numbers">
            <div className="home-stat">
              <dt>Streak</dt>
              <dd className="fig"><CountUp to={profile.streak} /><span className="unit">{profile.streak === 1 ? 'day' : 'days'}</span></dd>
            </div>
            <div className="home-stat">
              <dt>Score</dt>
              <dd className="fig"><CountUp to={profile.points} /><span className="unit">pts</span></dd>
            </div>
            <div className="home-stat">
              <dt>Rank</dt>
              <dd className="fig">{rank ? <>#<CountUp to={rank} /></> : <span className="c-3">—</span>}</dd>
            </div>
          </Item>

          <Item className="home-level stack-8">
            <div className="between">
              <span className="t-label">{profile.level}</span>
              <span className="t-cap">{profile.next_level ? <><span className="fig c-fg">{number(toNext)}</span> pts to {profile.next_level}</> : 'Top of the ladder'}</span>
            </div>
            <ProgressBar value={progress} label={`Progress to ${profile.next_level ?? 'the top'}`} size="sm" />
          </Item>
        </div>

        <Item as="section" className="home-path" aria-labelledby="path">
          <div className="between">
            <h2 id="path" className="t-eyebrow">Your path</h2>
            <Link to="/practice" className="link t-foot">All deals</Link>
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
                      <span className="t-cap fig">{m.locked ? `${m.level} · ${TIER_LABEL[LEVEL_TIER[m.level]]}` : `${m.solved}/${m.total}`}{isNext ? ' · next' : ''}</span>
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
