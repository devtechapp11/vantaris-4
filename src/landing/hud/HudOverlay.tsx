import { useEffect, useRef, useState } from 'react';
import { ledger } from '../hero/ledger';
import './hud.css';

/**
 * Architectural finish over the landing viewport: four fine « + » marks in the
 * corners and a line of mono telemetry. Purely decorative, never interactive.
 */
export default function HudOverlay() {
  const scr = useRef<HTMLSpanElement>(null);
  const [locked, setLocked] = useState(ledger.locked);
  useEffect(() => ledger.subscribe(() => setLocked(true)), []);
  useEffect(() => {
    let raf = 0;
    const paint = () => {
      raf = 0;
      if (scr.current) scr.current.textContent = String(Math.round(ledger.orbit * 100)).padStart(3, '0');
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
    };
  }, []);
  return (
    <div className="hud" aria-hidden="true">
      <i className="hud-mark hud-mark--tl" />
      <i className="hud-mark hud-mark--tr" />
      <i className="hud-mark hud-mark--bl" />
      <i className="hud-mark hud-mark--br" />
      <span className="hud-tele hud-tele--l">VANTARIS // LEDGER_01</span>
      <span className="hud-tele hud-tele--r">
        SCR <span ref={scr}>000</span> · LOCK <b className={locked ? 'is-on' : ''}>{locked ? '■' : '□'}</b>
      </span>
    </div>
  );
}
