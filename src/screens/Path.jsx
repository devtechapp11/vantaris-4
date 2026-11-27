import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { Play } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useBoard } from '../app/useRank';
import { hasWebGL, lowPower, useMedia } from '../app/useDevice';
import { usePrefs } from '../app/prefs';
import { Page } from '../components/chrome';
import PathSwitch from '../components/PathSwitch';
import { Skeleton, TIER_LABEL } from '../components/bits';
import MagneticButton from '../components/fx/MagneticButton';
import { valeBus } from '../components/vale/valeBus';
import { LEVEL_TIER } from '../app/usePlans';
import { isLocked } from '../lib/modules';
import { prefetchProps } from '../app/routes';
import { useMeta } from '../app/useMeta';
import { sfx } from '../lib/sfx/engine';
import { haptics, HAPTIC } from '../lib/haptics';
import { metalBurst } from '../fx/MetalBurst';
import { fieldBus } from '../fx/field/fieldBus';
import { api } from '../lib/api';
import StatsBar from '../path/StatsBar';
import TodaysDesk, { mentorLine } from '../path/TodaysDesk';
import PathNode, { NODE } from '../path/PathNode';
import VaultCache from '../path/VaultCache';
import DeskPlaque from '../path/DeskPlaque';
import ValeSeat from '../path/ValeSeat';
import ActiveCta, { ContinuePill } from '../path/ActiveCta';
import { buildPath, DESKS } from '../path/model';
import { recordCache } from '../path/store';
import { RELIC_OF, posterUrl } from '../path/relics/kinds';
import '../path/path.css';

// three, fiber and drei only load once the path is on screen and the page is idle.
const RelicLayer = lazy(() => import('../path/relics/RelicLayer'));

const MAX_W = 560;
const GAUGE = 30; // left margin for the elevation gauge
const UNIT = 92; // desk plaque row
const CACHE_ROW = 116;

/** Width of an element, kept up to date. */
function useWidth(ref) {
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** Smooth vertical S-curves through a list of points. */
const curve = (list) => list.reduce((d, [x, y], k) => {
  if (k === 0) return `M ${x} ${y}`;
  const [px, py] = list[k - 1];
  const h = (y - py) / 2;
  return `${d} C ${px} ${py + h}, ${x} ${y - h}, ${x} ${y}`;
}, '');

/**
 * The Deal Path. One dominant action: the active node's CTA, focused and
 * centred on arrival (Enter starts). Desktop (≥ 1024 px): sidebar, the path
 * and the « Today's Desk » rail (3 cards). Below: a 3-item header (streak,
 * goal, desk), the path, the tab bar, and a « Continue » pill when the active
 * node scrolls away.
 */
export default function Path() {
  useMeta({ title: 'Deal Path' });
  const { me, setMe, openPaywall, showToast } = useApp();
  const navigate = useNavigate();
  const board = useBoard(me?.profile?.points);
  const rail = useMedia('(min-width: 1024px)');
  const prefs = usePrefs();
  const reduce = useReducedMotion() || prefs.reduceMotion;
  const fine = useMedia('(hover: hover) and (pointer: fine)');
  const wrap = useRef(null);
  const activeRef = useRef(null);
  const width = useWidth(wrap);
  const [hover, setHover] = useState(null);
  const [slots, setSlots] = useState([]);
  const [relicsReady, setRelicsReady] = useState(false);
  const [armed, setArmed] = useState(false);
  const can3d = fine && !reduce && prefs.effects3d && hasWebGL() && !lowPower();

  // Caches opened and freezes banked on the server (null until the server-XP migration is applied).
  const [desk, setDesk] = useState(null);
  useEffect(() => {
    let live = true;
    api.getDesk?.().then((d) => {
      if (!live || !d) return;
      setDesk(d);
      if (d.freeze_used) showToast('A streak freeze covered yesterday. Your streak is safe.', 'success');
    }).catch(() => {});
    return () => { live = false; };
  }, [showToast]);
  const model = useMemo(() => (me ? buildPath({ ...me, desk }) : null), [me, desk]);

  // The « Continue » pill shows while the active node is off screen.
  const [activeGone, setActiveGone] = useState(false);
  useEffect(() => {
    // The wrapper has no box of its own (its children are positioned): watch the node itself.
    const el = activeRef.current?.querySelector('.pn');
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setActiveGone(!e.isIntersecting), { rootMargin: '-64px 0px -96px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [Boolean(model)]); // eslint-disable-line react-hooks/exhaustive-deps

  // The relics' 3D chunk waits for an idle moment after the first paint.
  useEffect(() => {
    if (!can3d) return undefined;
    const idle = window.requestIdleCallback ?? ((cb) => window.setTimeout(cb, 1));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    let id = 0;
    const t = window.setTimeout(() => { id = idle(() => setArmed(true), { timeout: 1500 }); }, 600);
    return () => { clearTimeout(t); cancel(id); };
  }, [can3d]);

  const W = Math.min(MAX_W, width || 343);
  const phone = W < 440;
  const ROW = phone ? 188 : 204;
  const RELIC = phone ? 72 : 120;

  const layout = useMemo(() => {
    if (!model) return null;
    const amp = W / 2 - NODE / 2 - GAUGE + (phone ? 10 : 0);
    const mid = W / 2 + (phone ? 6 : GAUGE / 2);
    const items = [];
    const pts = [];
    let y = 8;
    model.nodes.forEach((n, i) => {
      if (i === 0 || model.nodes[i - 1].level !== n.level) {
        items.push({ kind: 'desk', desk: n.level, y });
        y += UNIT;
      }
      const cx = Math.round(mid + amp * Math.sin((i * Math.PI) / 3 + Math.PI / 6));
      items.push({ kind: 'node', n, cx, y });
      pts.push({ x: cx, y: y + 14 + NODE / 2, reached: n.state !== 'locked', node: true });
      y += ROW;
      const cache = model.caches.find((c) => c.after === n.id);
      if (cache) {
        const next = Math.round(mid + amp * Math.sin(((i + 1) * Math.PI) / 3 + Math.PI / 6));
        const x = Math.round((cx + next) / 2);
        items.push({ kind: 'cache', cache, cx: x, y: y - 34 });
        pts.push({ x, y: y - 34 + 30, reached: cache.ready, node: false });
        y += CACHE_ROW - 34;
      }
    });
    items.push({ kind: 'elite', y });
    y += UNIT;
    return { items, pts, H: y };
  }, [model, W, phone, ROW]);

  // Relic slots on screen, for the shared 3D canvas.
  useEffect(() => {
    if (!can3d || !wrap.current) return;
    const els = [...wrap.current.querySelectorAll('[data-relic]')];
    setSlots(els.map((el) => ({ id: el.dataset.relic, kind: el.dataset.kind, el })));
  }, [can3d, layout]);

  const claim = useCallback(async (cache, el) => {
    sfx.starImpact(2);
    haptics.fire(HAPTIC.promotion);
    valeBus.react('celebrate');
    fieldBus.pulse(el);
    metalBurst.burst(el, 3);
    let credited = false;
    try {
      const res = await api.claimCache?.(cache.id);
      if (res?.me) setMe(res.me);
      if (res) setDesk((d) => ({ ...(d ?? {}), caches: [...(d?.caches ?? []), cache.id] }));
      credited = Boolean(res);
    } catch {
      credited = false;
    }
    recordCache(cache.id, cache.reward, credited);
    return { credited };
  }, [setMe]);

  if (!me || !model || !layout) return <PathSkeleton />;

  const { nodes, active, nextLocked } = model;
  const due = me.review?.due?.length ?? 0;
  const deskIdx = DESKS.indexOf(me.profile.level);
  const allMastered = nodes.every((n) => n.stars >= 3);
  const say = mentorLine(me, due);

  const open = (n) => {
    if (n.tierLocked) return openPaywall('level', { level: n.level });
    if (!n.reachable) return showToast(`Earn a star on “${nodes[n.index - 1]?.title}” to open this chapter.`);
    sfx.press();
    navigate(`/lesson/${n.id}`);
    return undefined;
  };

  const caption = (n, i) => {
    if (n.state === 'locked') {
      if (i !== nextLocked) return null;
      return n.tierLocked ? `Opens with ${TIER_LABEL[LEVEL_TIER[n.level]]}` : `Opens at 1★ on ${nodes[i - 1]?.title}`;
    }
    if (n.state === 'mastered') return 'Mastered · 3★';
    if (n.state === 'completed') return 'Replay for 3★';
    if (n.state === 'progress') return `In progress · ${Math.round(n.progress * 6)}/6`;
    return '6 questions · 2 min';
  };

  return (
    <Page wide className="screen path-screen">
      <div className="desk">
        <div className="desk-main">
          <StatsBar level={me.profile.level} streak={me.profile.streak} lit={me.profile.active_today} stars={me.path?.total ?? 0} board={board} today={me.week?.[me.week.length - 1]?.points ?? 0} />
          <PathSwitch value="guided" />

          <div ref={wrap} className={`path-wrap ${relicsReady ? 'relics-live' : ''}`}>
            <div className="path2" style={{ width: W, height: layout.H }}>
              <svg className="path2-svg" width={W} height={layout.H} viewBox={`0 0 ${W} ${layout.H}`} aria-hidden="true">
                <defs>
                  <linearGradient id="seg-chrome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--chrome-hi)" />
                    <stop offset="0.5" stopColor="var(--platinum)" />
                    <stop offset="1" stopColor="var(--chrome-hi)" />
                  </linearGradient>
                </defs>
                {layout.pts.slice(1).map((p, k) => {
                  const seg = curve([[layout.pts[k].x, layout.pts[k].y], [p.x, p.y]]);
                  return p.reached ? (
                    <g key={`s${k}`}>
                      <path d={seg} className="seg-lit" />
                      {!reduce && <path d={seg} className="seg-glint" pathLength="100" style={{ animationDelay: `${-k * 0.7}s` }} />}
                    </g>
                  ) : (
                    <path key={`s${k}`} d={seg} className="seg-locked" />
                  );
                })}
              </svg>

              {layout.items.map((it) => {
                if (it.kind === 'desk') {
                  const di = DESKS.indexOf(it.desk);
                  return (
                    <div key={`d-${it.desk}`} className="path2-row" style={{ top: it.y + 18 }}>
                      <DeskPlaque desk={it.desk} reached={di <= deskIdx} tierLabel={isLocked(it.desk, me.tier.max_level) ? TIER_LABEL[LEVEL_TIER[it.desk]] : null} />
                    </div>
                  );
                }
                if (it.kind === 'elite') {
                  return (
                    <div key="elite" className="path2-row" style={{ top: it.y + 14 }}>
                      <DeskPlaque desk="Elite" elite reached={allMastered} caption={allMastered ? 'Every chapter mastered.' : 'Master every chapter (3★) to take the seat.'} />
                    </div>
                  );
                }
                if (it.kind === 'cache') {
                  return <VaultCache key={it.cache.id} cache={it.cache} style={{ left: it.cx - 40, top: it.y }} onClaim={claim} />;
                }
                const { n, cx, y } = it;
                const i = n.index;
                const isActive = i === active;
                const left = cx < W / 2 + (phone ? 6 : GAUGE / 2);
                const panel = left ? { left: cx + NODE / 2 + 14, right: 0 } : { left: phone ? 16 : GAUGE + 8, right: W - (cx - NODE / 2 - 14) };
                const room = left ? cx - NODE / 2 - (phone ? 12 : GAUGE + 8) : W - (cx + NODE / 2);
                // Phones: Vale sits inline by the CTA (no room beside the node for him and his line).
                const seat = phone ? 0 : room >= 140 ? 140 : room >= 100 ? 100 : 0;
                const valeOut = seat > 0;
                const cta = n.state === 'progress' ? 'continue' : n.state === 'completed' || n.state === 'mastered' ? 'review' : 'start';
                const cap = caption(n, i);
                const hot = hover ? hover === n.id : isActive;
                return (
                  <div key={n.id} className={`pch2 ${isActive ? 'is-active' : ''}`} ref={isActive ? activeRef : null} onPointerEnter={fine ? () => setHover(n.id) : undefined} onPointerLeave={fine ? () => setHover(null) : undefined}>
                    <PathNode
                      n={n}
                      active={isActive}
                      style={{ left: cx - NODE / 2, top: y + 14 }}
                      onOpen={open}
                      prefetch={n.state === 'locked' ? undefined : prefetchProps(`/lesson/${n.id}`)}
                    />
                    {isActive && valeOut && (
                      <div className="path-vale" style={left ? { left: cx - NODE / 2 - seat - 4, top: y + 14 + NODE / 2 - seat / 2 } : { left: cx + NODE / 2 + 4, top: y + 14 + NODE / 2 - seat / 2 }}>
                        <ValeSeat level={me.profile.level} reduced={reduce} size={seat} />
                        <p className={`vale-say ${left ? 'vale-say--l' : 'vale-say--r'}`} style={{ top: seat - 6 }}>{say}</p>
                      </div>
                    )}
                    <div className={`pp ${left ? '' : 'pp--r'} ${phone ? 'pp--col' : ''} is-${n.state}`} style={{ ...panel, top: y + (phone ? 0 : 6) }}>
                      <span className={`relic ${hot && relicsReady ? 'is-hot' : ''}`} style={{ width: RELIC, height: RELIC }} data-relic={can3d ? n.id : undefined} data-kind={RELIC_OF[n.id]}>
                        <img src={posterUrl(RELIC_OF[n.id])} alt="" width={RELIC} height={RELIC} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.hidden = true; }} />
                      </span>
                      <span className="pp-text">
                        <span className="pp-title">{n.title}</span>
                        {cap && <span className="pp-cap">{cap}</span>}
                        {isActive && (
                          <span className="pp-go">
                            <ActiveCta kind={cta} title={n.title} onStart={() => open(n)} prefetch={prefetchProps(`/lesson/${n.id}`)} />
                            {!valeOut && <ValeSeat level={me.profile.level} reduced={reduce} size={phone ? 56 : 88} />}
                          </span>
                        )}
                        {!isActive && n.state === 'progress' && (
                          <span className="pp-go">
                            <MagneticButton className="btn btn--secondary btn--sm pp-start" onClick={() => open(n)} {...prefetchProps(`/lesson/${n.id}`)}>
                              <Play size={14} aria-hidden="true" /> Resume
                            </MagneticButton>
                          </span>
                        )}
                        {isActive && !valeOut && !phone && (
                          <span className="vale-say vale-say--inline">{say}</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {rail && (
          <div className="desk-rail">
            <TodaysDesk me={me} board={board} due={due} />
          </div>
        )}
      </div>
      {!rail && activeGone && nodes[active] && (
        <ContinuePill title={nodes[active].title} onStart={() => open(nodes[active])} />
      )}
      {can3d && armed && slots.length > 0 && (
        <Suspense fallback={null}>
          <RelicLayer slots={slots} hot={hover ?? nodes[active]?.id ?? null} onReady={() => setRelicsReady(true)} />
        </Suspense>
      )}
    </Page>
  );
}

function PathSkeleton() {
  return (
    <Page wide className="screen path-screen">
      <div className="desk">
        <div className="desk-main">
          <Skeleton height={56} radius={999} />
          <div className="stack-24" style={{ alignItems: 'center', marginTop: 32 }}>
            {[0, 1, 2, 3].map((k) => <Skeleton key={k} height={80} width={80} radius={40} />)}
          </div>
        </div>
      </div>
    </Page>
  );
}
