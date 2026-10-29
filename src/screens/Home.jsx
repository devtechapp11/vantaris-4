import { Link, useNavigate } from 'react-router-dom';
import { Check, Flame, ArrowRight, X } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { LargeTitle, Page } from '../components/chrome';
import { Chevron, Dots, LevelBadge, PlanChip, ProblemStatus, Skeleton } from '../components/bits';
import { Ring, WeekBars } from '../components/charts';
import Mascot from '../components/Mascot';
import { greeting, number, percent, relative, todayLine, weekday } from '../lib/format';

export default function Home() {
  const { me } = useApp();
  const navigate = useNavigate();

  if (!me) {
    return (
      <Page>
        <div className="top"><Skeleton height={20} style={{ width: 160 }} /><Skeleton height={40} style={{ width: 260, marginTop: 8 }} /></div>
        <Skeleton height={190} /><Skeleton height={120} /><Skeleton height={150} />
      </Page>
    );
  }

  const { profile, tier, quota, daily } = me;
  const firstName = profile.display_name.split(' ')[0];
  const toNext = profile.next_level_at != null ? profile.next_level_at - profile.points : null;
  const span = profile.next_level_at != null ? profile.next_level_at - profile.level_floor : 1;
  const progress = profile.next_level_at != null ? (profile.points - profile.level_floor) / span : 1;

  // The server enforces plan and quota; the problem screen explains any lock.
  const openProblem = (id) => navigate(`/practice/${id}`);

  return (
    <Page>
      <LargeTitle
        eyebrow={todayLine()}
        title={`${greeting()}, ${firstName}`}
        right={<Mascot mood="idle" size={58} label="Your mascot" />}
      >
        <div className="row-8 wrap" style={{ marginTop: 10 }}>
          <span className={`chip ${profile.streak > 0 ? 'chip--warn' : ''}`} aria-label={`${profile.streak}-day streak`}>
            <Flame size={14} aria-hidden="true" /> {profile.streak}-day streak
          </span>
          <PlanChip tier={tier.id} />
          {tier.id === 'free' && (
            <Link to="/plans" className="chip chip--ghost" style={{ textDecoration: 'none', color: 'var(--accent)' }}>Upgrade</Link>
          )}
        </div>
      </LargeTitle>

      {tier.id === 'free' && quota.limit != null && (
        <div className="group">
          <div className="cell" style={{ alignItems: 'center' }}>
            <div className="grow">
              <div className="cell-title">
                <span className="fig">{quota.remaining}</span> of <span className="fig">{quota.limit}</span> free problems left this week
              </div>
              <div className="cell-sub">Resets on {weekday(quota.resets_at)}</div>
            </div>
            <Link to="/plans" className="btn btn--tonal btn--sm">Go unlimited</Link>
          </div>
        </div>
      )}

      {daily && <DailyDeal daily={daily} onOpen={() => openProblem(daily.id)} />}

      <Link to="/profile" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Ring value={progress} size={68} stroke={8} tone={profile.level === 'MD' ? 'brass' : 'accent'}>
          <span className="fig" style={{ fontSize: 13, fontWeight: 600 }}>{Math.round(Math.min(1, progress) * 100)}%</span>
        </Ring>
        <div className="grow stack-4">
          <div className="row-8">
            <span className="t-foot">Vantaris score</span>
            <LevelBadge level={profile.level} />
          </div>
          <span className="fig" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>{number(profile.points)}</span>
          <span className="t-foot">
            {profile.attempted ? `${percent(profile.accuracy)} accuracy · ${profile.solved} solved` : 'Solve your first problem to get a score'}
          </span>
          {toNext != null && profile.attempted > 0 && (
            <span className="t-foot"><span className="fig">{toNext}</span> points to {profile.next_level}</span>
          )}
        </div>
        <Chevron />
      </Link>

      <section className="stack-8">
        <div className="section-head"><h2>This week</h2><span className="t-foot fig">{number(me.week.reduce((s, d) => s + d.points, 0))} pts</span></div>
        <div className="card" style={{ padding: '14px 12px 8px' }}>
          <WeekBars week={me.week} />
        </div>
      </section>

      {me.continue.length > 0 && (
        <section className="stack-8">
          <div className="section-head"><h2>Keep going</h2><Link to="/practice">All problems</Link></div>
          <div className="group">
            {me.continue.map((p) => (
              <button key={p.id} type="button" className="cell cell--indent" onClick={() => openProblem(p.id)}>
                <ProblemStatus status={p.opened ? 'opened' : 'new'} />
                <span className="grow">
                  <span className="cell-title" style={{ display: 'block' }}>{p.title}</span>
                  <span className="cell-sub">{p.kind} · {p.module_name}</span>
                </span>
                <Dots value={p.difficulty} />
                <Chevron />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="stack-8">
        <div className="section-head"><h2>Recent</h2></div>
        {me.recent.length ? (
          <div className="group">
            {me.recent.map((r) => (
              <button key={r.id} type="button" className="cell cell--indent" onClick={() => navigate(`/practice/${r.id}`)}>
                <span className={`pstat ${r.correct ? 'pstat--correct' : 'pstat--wrong'}`} aria-label={r.correct ? 'Correct' : 'Incorrect'}>
                  {r.correct ? <Check size={15} strokeWidth={3} /> : <X size={15} strokeWidth={3} />}
                </span>
                <span className="grow">
                  <span className="cell-title" style={{ display: 'block' }}>{r.title}</span>
                  <span className="cell-sub">{r.kind} · {relative(r.submitted_at)}</span>
                </span>
                <span className={`fig ${r.points ? 'c-pos' : 'c-3'}`} style={{ fontSize: 15, fontWeight: 600 }}>
                  {r.points ? `+${r.points}` : '0'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="card row" style={{ alignItems: 'center' }}>
            <Mascot mood="idle" size={48} />
            <p className="t-callout grow">Your solved deals show up here. Start with today’s deal.</p>
          </div>
        )}
      </section>
    </Page>
  );
}

function DailyDeal({ daily, onOpen }) {
  const done = daily.status === 'correct' || daily.status === 'wrong';
  return (
    <button type="button" className="tomb" onClick={onOpen} aria-label={`Daily deal: ${daily.title}, ${daily.kind}`}>
      <div className="tomb-top">
        <span>Daily deal</span>
        <span>{daily.module_name}</span>
      </div>
      <div className="tomb-rule" />
      <p className="tomb-name">{daily.title}</p>
      <div className="tomb-kind">{daily.kind}</div>
      <div className="tomb-rule" />
      <div className="tomb-foot">
        <span className="row-8" style={{ color: 'var(--on-ink-2)', fontSize: 13 }}>
          <Dots value={daily.difficulty} />
          <span className="fig">{daily.minutes} min</span>
        </span>
        {daily.status === 'correct' ? (
          <span className="tomb-cta tomb-cta--done"><Check size={15} strokeWidth={3} aria-hidden="true" /> Solved, +{daily.points}</span>
        ) : daily.status === 'wrong' ? (
          <span className="tomb-cta tomb-cta--missed">Review solution</span>
        ) : (
          <span className="tomb-cta">{daily.status === 'opened' ? 'Continue' : 'Solve'} <ArrowRight size={15} aria-hidden="true" /></span>
        )}
      </div>
      {!done && <span className="sr-only">Opens the problem</span>}
    </button>
  );
}
