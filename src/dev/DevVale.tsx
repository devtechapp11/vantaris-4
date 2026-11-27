import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useMeta as useMetaJs } from '../app/useMeta';
import { fieldBus } from '../fx/field/fieldBus';
import { valeBus } from '../components/vale/valeBus';
import { rippleBus } from '../vale/rippleBus';
import { hasWebGL, isLowPower, prefersReducedMotion } from '../vale/lowPower';
import { siteSound } from '../vale/siteSound';
import { valeMidas } from '../vale/valeMidas';
import { DESKS, DESK_LABEL, DESK_WIDTH, useOutfit, valeOutfit, type Desk } from '../vale/outfits/outfitRegistry';
import SoundPill from '../vale/SoundPill';
import ValePoster from '../vale/ValePoster';
import Logo from '../components/Logo';
import './dev.css';

const useMeta = useMetaJs as unknown as (o: { title?: string; path?: string; noindex?: boolean }) => void;
const ValeCanvas = lazy(() => import('../vale/ValeCanvas'));

function Fps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let n = 0;
    let t0 = performance.now();
    let id = 0;
    const f = () => {
      n += 1;
      const t = performance.now();
      if (t - t0 >= 1000) {
        setFps(Math.round((n * 1000) / (t - t0)));
        n = 0;
        t0 = t;
      }
      id = requestAnimationFrame(f);
    };
    id = requestAnimationFrame(f);
    return () => cancelAnimationFrame(id);
  }, []);
  return <span className="kicker devvale-fps" aria-live="off">{fps} FPS</span>;
}

/** /dev/vale: Vale alone on the pool, for sign-off (noindex, never linked, absent from production). */
export default function DevVale() {
  useMeta({ title: 'Vale · Vantaris dev', path: '/dev/vale', noindex: true });
  const [lowPower] = useState(isLowPower);
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const [gl] = useState(hasWebGL);
  const [ready, setReady] = useState(false);
  const [stateOn, setStateOn] = useState(false);
  const desk = useOutfit();
  const busy = useRef(false);
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

  useEffect(() => {
    fieldBus.setScene('landing');
    // The dev page plays through the site's SOUND pill, like the landing.
    valeMidas.play = (fn) => siteSound.play(fn);
    return () => {
      fieldBus.setScene('app');
      valeMidas.state(false);
      valeOutfit.set(null);
    };
  }, []);
  useEffect(() => {
    valeMidas.reduced = reduced;
  }, [reduced]);

  const promote = () => {
    if (busy.current) return;
    busy.current = true;
    const i = desk ? DESKS.indexOf(desk) : -1;
    const next = DESKS[(i + 1) % DESKS.length];
    valeMidas.gold('gold', next).then(() => {
      busy.current = false;
    });
  };

  return (
    <main className="devvale" id="main" style={{ ['--desk-w' as string]: desk ? DESK_WIDTH[desk] : '100%' }}>
      <ValePoster gone={ready} />
      {gl && (
        <Suspense fallback={null}>
          <ValeCanvas key={reduced ? 'r' : 'm'} lowPower={lowPower} reduced={reduced} onReady={() => setReady(true)} />
        </Suspense>
      )}
      <header className="devvale-top">
        <Logo size={24} />
        <SoundPill />
      </header>
      {desk && <p className="devvale-desk" aria-live="polite">{DESK_LABEL[desk]}</p>}
      <p className="devvale-cue kicker">{touch ? 'Tap Vale' : 'Move · Vale is awake'}</p>
      <aside className="devvale-panel" aria-label="Test Vale">
        <span className="kicker">{lowPower ? 'Low power' : 'Full'} · {reduced ? 'Reduced motion' : 'Motion'} · <Fps /></span>
        <div className="devvale-btns" role="group" aria-label="Desk">
          <button type="button" aria-pressed={!desk} onClick={() => valeOutfit.set(null)}>Bare</button>
          {DESKS.map((d: Desk) => (
            <button key={d} type="button" aria-pressed={desk === d} onClick={() => valeOutfit.set(d)}>{d === 'md' ? 'MD' : d === 'vp' ? 'VP' : DESK_LABEL[d]}</button>
          ))}
        </div>
        <div className="devvale-btns" role="group" aria-label="Midas">
          <button type="button" onClick={() => { valeMidas.touch(); valeBus.correct(1); siteSound.play((s) => s.plink()); }}>Touch</button>
          <button type="button" aria-pressed={stateOn} onClick={() => { valeMidas.state(!stateOn); setStateOn(!stateOn); }}>State {stateOn ? 'off' : 'on'}</button>
          <button type="button" onClick={() => valeMidas.gold('demo')}>Gold</button>
          <button type="button" onClick={promote}>Promotion</button>
        </div>
        <div className="devvale-btns" role="group" aria-label="Reactions">
          <button type="button" onClick={() => valeBus.correct(1)}>Delight</button>
          <button type="button" onClick={() => valeBus.correct(3)}>Wow</button>
          <button type="button" onClick={(e) => valeBus.wrong(e.currentTarget)}>Concern</button>
          <button type="button" onClick={() => { rippleBus.emit(0, 0, 1); siteSound.play((s) => s.plink()); }}>Drop</button>
          <button type="button" aria-pressed={reduced} onClick={() => setReduced((r) => !r)}>Reduced motion</button>
        </div>
      </aside>
    </main>
  );
}
