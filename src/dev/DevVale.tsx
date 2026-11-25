import { lazy, Suspense, useEffect, useState } from 'react';
import { useMeta as useMetaJs } from '../app/useMeta';
import { fieldBus } from '../fx/field/fieldBus';
import { valeBus } from '../components/vale/valeBus';
import { rippleBus } from '../vale/rippleBus';
import { hasWebGL, isLowPower, prefersReducedMotion } from '../vale/lowPower';
import { siteSound } from '../vale/siteSound';
import SoundPill from '../vale/SoundPill';
import ValePoster from '../vale/ValePoster';
import Logo from '../components/Logo';
import './dev.css';

const useMeta = useMetaJs as unknown as (o: { title?: string; path?: string; noindex?: boolean }) => void;
const ValeCanvas = lazy(() => import('../vale/ValeCanvas'));

/** /dev/vale: Vale alone on the pool, for sign-off (noindex, never linked). */
export default function DevVale() {
  useMeta({ title: 'Vale · Vantaris dev', path: '/dev/vale', noindex: true });
  const [lowPower] = useState(isLowPower);
  const [reduced] = useState(prefersReducedMotion);
  const [gl] = useState(hasWebGL);
  const [ready, setReady] = useState(false);
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  useEffect(() => {
    fieldBus.setScene('landing');
    return () => fieldBus.setScene('app');
  }, []);

  return (
    <main className="devvale" id="main">
      <ValePoster gone={ready} />
      {gl && (
        <Suspense fallback={null}>
          <ValeCanvas lowPower={lowPower} reduced={reduced} onReady={() => setReady(true)} />
        </Suspense>
      )}
      <header className="devvale-top">
        <Logo size={24} />
        <SoundPill />
      </header>
      <p className="devvale-cue kicker">{touch ? 'Tap Vale' : 'Move · Vale is awake'}</p>
      <aside className="devvale-panel" aria-label="Test Vale's reactions">
        <span className="kicker">{lowPower ? 'Low power' : 'Full'} · {reduced ? 'Reduced motion' : 'Motion'}</span>
        <div className="devvale-btns">
          <button type="button" onClick={() => valeBus.correct(1)}>Delight</button>
          <button type="button" onClick={() => valeBus.correct(3)}>Wow</button>
          <button type="button" onClick={(e) => valeBus.wrong(e.currentTarget)}>Concern</button>
          <button type="button" onClick={() => { rippleBus.emit(0, 0, 1); siteSound.play((s) => s.plink()); }}>Drop</button>
        </div>
      </aside>
    </main>
  );
}
