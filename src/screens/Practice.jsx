import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { LargeTitle, Page, Segmented } from '../components/chrome';
import { Chevron, Dots, LevelBadge, ProblemStatus, Skeleton, TIER_LABEL } from '../components/bits';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To do' },
  { value: 'done', label: 'Done' },
];

export default function Practice() {
  const navigate = useNavigate();
  const { openPaywall, me, showToast } = useApp();
  const [catalog, setCatalog] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    api.getCatalog().then((c) => alive && setCatalog(c), (e) => showToast(e.message, 'error'));
    return () => {
      alive = false;
    };
  }, [me?.tier?.id, showToast]);

  const totals = useMemo(() => {
    if (!catalog) return null;
    const all = catalog.modules.flatMap((m) => m.problems);
    return { total: all.length, solved: all.filter((p) => p.status === 'correct').length, modules: catalog.modules.length };
  }, [catalog]);

  const keep = (p) => filter === 'all' || (filter === 'done' ? p.status === 'correct' || p.status === 'wrong' : p.status === 'new' || p.status === 'opened');

  return (
    <Page>
      <LargeTitle
        title="Practice"
        eyebrow={totals ? `${totals.solved} of ${totals.total} solved across ${totals.modules} modules` : ' '}
      />
      <Segmented value={filter} onChange={setFilter} options={FILTERS} label="Filter problems" />

      {!catalog ? (
        <div className="stack-16"><Skeleton height={200} /><Skeleton height={160} /></div>
      ) : (
        catalog.modules.map((m) => {
          const list = m.problems.filter(keep);
          if (!list.length) return null;
          const solved = m.problems.filter((p) => p.status === 'correct').length;
          return (
            <section key={m.id} className="stack-8" aria-labelledby={`mod-${m.id}`}>
              <div className="section-head" style={{ alignItems: 'center' }}>
                <div className="row-8" style={{ minWidth: 0 }}>
                  <h2 id={`mod-${m.id}`} className="ellipsis" style={{ fontSize: 18 }}>{m.name}</h2>
                  <LevelBadge level={m.level} />
                </div>
                {m.locked ? (
                  <button type="button" className="chip chip--brass" onClick={() => openPaywall('level', { level: m.level })}>
                    <Lock size={12} aria-hidden="true" /> {TIER_LABEL[m.unlock_tier]}
                  </button>
                ) : (
                  <span className="t-foot fig">{solved}/{m.problems.length}</span>
                )}
              </div>
              <p className="t-foot" style={{ padding: '0 4px', marginTop: -4 }}>{m.blurb}</p>
              <div className="group">
                {list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="cell cell--indent"
                    onClick={() => (m.locked && p.status === 'new' ? openPaywall('level', { level: m.level }) : navigate(`/practice/${p.id}`))}
                    style={m.locked && p.status === 'new' ? { opacity: 0.72 } : undefined}
                  >
                    <ProblemStatus status={p.status} locked={m.locked && p.status === 'new'} />
                    <span className="grow">
                      <span className="cell-title" style={{ display: 'block' }}>{p.title}</span>
                      <span className="cell-sub">{p.kind}</span>
                    </span>
                    <span className="stack-4" style={{ alignItems: 'flex-end' }}>
                      <Dots value={p.difficulty} />
                      <span className="t-cap fig">{p.status === 'correct' ? `+${p.points}` : `${p.minutes} min`}</span>
                    </span>
                    <Chevron />
                  </button>
                ))}
              </div>
            </section>
          );
        })
      )}
      {catalog && filter !== 'all' && !catalog.modules.some((m) => m.problems.some(keep)) && (
        <div className="card center t-callout">{filter === 'done' ? 'Nothing finished yet. Your answered problems will collect here.' : 'You’ve answered every problem. More are on the way.'}</div>
      )}
    </Page>
  );
}
