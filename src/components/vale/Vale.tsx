import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import MascotJS from '../MascotSVG';
import { usePrefs } from '../../app/prefs';
import { valeBus, valeSplash, type ValeMood } from './valeBus';
import './vale.css';

type Gaze = { x: number; y: number };
const MascotSVG = MascotJS as unknown as ComponentType<{ state: string; lookAt: 'pointer' | Gaze | null; style?: CSSProperties }>;

// Vale's expressions, drawn with the existing chrome mascot states.
const STATE: Record<ValeMood, string> = {
  idle: 'idle', focus: 'idle', delight: 'celebrate', wow: 'success', concern: 'curious',
  celebrate: 'celebrate', combo: 'success', encourage: 'curious',
};
const HOLD: Partial<Record<ValeMood, number>> = { delight: 1600, wow: 1500, concern: 1800 };

type Props = {
  mood?: ValeMood;
  size?: number;
  /** React to valeBus events (then fall back to `mood`). */
  live?: boolean;
  follow?: boolean;
  className?: string;
  label?: string;
  /** Shares the avatar with the app-start splash (layout continuity). */
  avatar?: boolean;
  /** Shown even when « Show Vale » is off (the splash itself). */
  force?: boolean;
};

/**
 * Vale, the Vantaris mentor: a chrome pebble with a smoked-glass visor that
 * breathes, follows the pointer, reacts to the desk and, on a miss, looks at
 * the right answer.
 */
export default function Vale({ mood = 'idle', size = 72, live = true, follow = true, className = '', label, avatar = false, force = false }: Props) {
  const prefs = usePrefs() as { showVale?: boolean };
  const splash = useSyncExternalStore(valeSplash.subscribe, valeSplash.get, valeSplash.get);
  const root = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<ValeMood | null>(null);
  const [gaze, setGaze] = useState<Gaze | null>(null);

  useEffect(() => {
    if (!live) return undefined;
    let timer = 0;
    const off = valeBus.subscribe(({ mood: m, gaze: target }) => {
      window.clearTimeout(timer);
      setFlash(m === 'idle' ? null : m);
      const r = root.current?.getBoundingClientRect();
      const t = target?.getBoundingClientRect();
      if (r && t) {
        const span = Math.max(240, innerWidth / 3);
        setGaze({
          x: Math.max(-1, Math.min(1, (t.left + t.width / 2 - (r.left + r.width / 2)) / span)),
          y: Math.max(-1, Math.min(1, (t.top + t.height / 2 - (r.top + r.height * 0.4)) / span)),
        });
      } else setGaze(null);
      const hold = HOLD[m];
      if (hold) timer = window.setTimeout(() => { setFlash(null); setGaze(null); }, hold);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [live]);

  if (!force && prefs.showVale === false) return null;
  const box = { width: size, height: size * 1.1 };
  // While the splash holds the avatar, keep the seat empty so it can land here.
  if (avatar && splash && !force) return <div className={`vale ${className}`} style={box} aria-hidden="true" />;

  const now = flash ?? mood;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  const body = (
    <>
      <span className="vale-shadow" aria-hidden="true" />
      <span className="vale-body">
        <MascotSVG state={STATE[now]} lookAt={gaze ?? (follow ? 'pointer' : null)} style={{ width: '100%', height: '100%' }} />
      </span>
    </>
  );
  return avatar ? (
    <motion.div ref={root} layoutId="vale-avatar" {...a11y} className={`vale vale--${now} ${className}`} style={box} data-mood={now}>{body}</motion.div>
  ) : (
    <div ref={root} {...a11y} className={`vale vale--${now} ${className}`} style={box} data-mood={now}>{body}</div>
  );
}
