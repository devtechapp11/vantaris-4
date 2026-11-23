import { useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import MascotJS from '../MascotSVG';
import { valeBus, type ValeMood } from './valeBus';
import './vale.css';

// Vale's four expressions, drawn with the existing chrome mascot states.
// The SVG mascot is plain JS; give it the props it actually takes.
const MascotSVG = MascotJS as unknown as ComponentType<{ state: string; lookAt: 'pointer' | null; style?: CSSProperties }>;

const STATE: Record<ValeMood, string> = { idle: 'idle', celebrate: 'celebrate', combo: 'success', encourage: 'curious' };
const HOLD: Record<ValeMood, number> = { idle: 0, celebrate: 1600, combo: 1300, encourage: 1400 };

type Props = {
  mood?: ValeMood;
  size?: number;
  /** React to valeBus events (then fall back to `mood`). */
  live?: boolean;
  follow?: boolean;
  className?: string;
  label?: string;
};

/**
 * Vale, the Vantaris mentor: a chrome pebble with a smoked-glass visor that
 * breathes, follows the pointer and reacts to what happens on the desk.
 */
export default function Vale({ mood = 'idle', size = 72, live = true, follow = true, className = '', label }: Props) {
  const [flash, setFlash] = useState<ValeMood | null>(null);

  useEffect(() => {
    if (!live) return undefined;
    let timer = 0;
    const off = valeBus.subscribe((m) => {
      window.clearTimeout(timer);
      setFlash(m);
      if (HOLD[m]) timer = window.setTimeout(() => setFlash(null), HOLD[m]);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [live]);

  const now = flash ?? mood;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  return (
    <div {...a11y} className={`vale vale--${now} ${className}`} style={{ width: size, height: size * 1.1 }} data-mood={now}>
      <span className="vale-shadow" aria-hidden="true" />
      <span className="vale-body">
        <MascotSVG state={STATE[now]} lookAt={follow ? 'pointer' : null} style={{ width: '100%', height: '100%' }} />
      </span>
    </div>
  );
}
