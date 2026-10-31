import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clock, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { Item, LargeTitle, Page, Segmented } from '../components/chrome';
import { DifficultyBadge, ProblemStatus, Skeleton, TIER_LABEL, TierBadge } from '../components/bits';
import { Ring } from '../components/charts';
import Mascot from '../components/Mascot';
import { group, item } from '../design/motion';
import { stagger } from '../design/tokens';
import { ModuleIcon } from '../lib/modules';
import { rememberShared } from '../app/fluid';
import { prefetchProps } from '../app/routes';
import './Practice.css';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To do' },
  { value: 'done', label: 'Done' },
];

export default function Practice() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const focus = params.get('m');
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

  // Deep link from a module card on Home: scroll to it once the list is in.
  useEffect(() => {
    if (!catalog || !focus) return undefined;
    const t = setTimeout(() => document.getElementById(`mod-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    return () => clearTimeout(t);
  }, [catalog, focus]);

  const totals = useMemo(() => {
    if (!catalog) return null;
    const all = catalog.modules.flatMap((m) => m.problems);
    return { total: all.length, solved: all.filter((p) => p.status === 'correct').length, modules: catalog.modules.length };
  }, [catalog]);

  const keep = (p) => filter === 'all' || (filter === 'done' ? p.status === 'correct' || p.status === 'wrong' : p.status === 'new' || p.status === 'opened');
  const empty = catalog && filter !== 'all' && !catalog.modules.some((m) => m.problems.some(keep));

  return (
    <Page wide>
      <LargeTitle title="Deals" eyebrow={totals ? `${totals.solved} of ${totals.total} solved · ${totals.modules} modules` : 'Deal library'} />
      <Item className="practice-bar">
        <div className="practice-filter"><Segmented value={filter} onChange={setFilter} options={FILTERS} label="Filter deals" /></div>
        {catalog && (
          <nav className="practice-jump" aria-label="Jump to module">
            {catalog.modules.map((m) => (
              <a key={m.id} href={`#mod-${m.id}`} className="chip" data-tier={m.level} onClick={(e) => { e.preventDefault(); document.getElementById(`mod-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                {m.locked && <Lock size={11} aria-hidden="true" />} {m.short}
              </a>
            ))}
          </nav>
        )}
      </Item>

      {!catalog ? (
        <div className="stack-16"><Skeleton height={220} /><Skeleton height={180} /></div>
      ) : (
        catalog.modules.map((m) => {
          const list = m.problems.filter(keep);
          if (!list.length) return null;
          const solved = m.problems.filter((p) => p.status === 'correct').length;
          return (
            <Item as="section" key={m.id} id={`mod-${m.id}`} className={`pmod ${focus === m.id ? 'pmod--focus' : ''}`} data-tier={m.level} aria-labelledby={`h-${m.id}`}>
              <header className="pmod-head">
                <span className="mod-icon"><ModuleIcon id={m.id} size={20} aria-hidden="true" /></span>
                <div className="grow stack-4">
                  <div className="row-8 wrap">
                    <h2 id={`h-${m.id}`} className="t-h3">{m.name}</h2>
                    <TierBadge level={m.level} />
                  </div>
                  <p className="t-foot">{m.blurb}</p>
                </div>
                {m.locked ? (
                  <button type="button" className="chip chip--strong" onClick={() => openPaywall('level', { level: m.level })}>
                    <Lock size={12} aria-hidden="true" /> {TIER_LABEL[m.unlock_tier]}
                  </button>
                ) : (
                  <Ring value={solved / Math.max(1, m.problems.length)} size={48} stroke={5} delay={0.1}>
                    <span className="fig t-cap c-fg">{solved}/{m.problems.length}</span>
                  </Ring>
                )}
              </header>
              <motion.div className="pgrid" variants={group(stagger.children)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
                {list.map((p) => {
                  const locked = m.locked && p.status === 'new';
                  return (
                    <motion.button
                      key={p.id}
                      variants={item}
                      type="button"
                      className={`prow card--interactive ${locked ? 'prow--locked' : ''}`}
                      onClick={(e) => {
                        if (locked) return openPaywall('level', { level: m.level });
                        rememberShared(`deal-${p.id}`, e.currentTarget.querySelector('.t-headline'));
                        return navigate(`/practice/${p.id}`);
                      }}
                      {...prefetchProps(`/practice/${p.id}`)}
                    >
                      <ProblemStatus status={p.status} locked={locked} />
                      <span className="grow stack-4">
                        <span className="t-headline">{p.title}</span>
                        <span className="t-foot">{p.kind}</span>
                      </span>
                      <span className="stack-4 prow-meta">
                        <DifficultyBadge value={p.difficulty} compact />
                        <span className="t-cap fig">{p.status === 'correct' ? <span className="c-pos">+{p.points} pts</span> : <><Clock size={11} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> {p.minutes} min</>}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </Item>
          );
        })
      )}
      {empty && (
        <Item className="card empty">
          <Mascot mood={filter === 'done' ? 'welcome' : 'correct'} size={96} decorative />
          <p className="t-callout">{filter === 'done' ? 'Nothing closed yet. Your answered deals collect here.' : 'You’ve answered every deal on your plan. More are on the way.'}</p>
        </Item>
      )}
    </Page>
  );
}
