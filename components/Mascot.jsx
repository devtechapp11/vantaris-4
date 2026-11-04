import MascotSVG from './MascotSVG';
import Scene3D from './three/Scene3D';

/** Older call sites pass a `mood`; each maps onto one of Vale's states. */
const MOOD_STATE = {
  welcome: 'idle',
  idle: 'idle',
  streak: 'idle',
  think: 'thinking',
  correct: 'success',
  wrong: 'curious',
  levelup: 'celebrate',
};

// States that drift gently up and down (a CSS animation, so it costs no JavaScript).
const FLOAT = new Set(['idle', 'typing', 'privacy']);

export const MASCOT_STATES = ['idle', 'curious', 'typing', 'privacy', 'success', 'error', 'thinking', 'celebrate'];

/**
 * <Mascot state lookAt /> — Vale, the chrome mascot.
 *
 * In the app it is a light SVG. With `mode="3d"` (website hero, sign-in) it
 * loads the WebGL version on capable devices and crossfades over the SVG,
 * which stays as the fallback (low power, Save-Data, no WebGL, reduced motion).
 *
 *   state        idle | curious | typing | privacy | success | error | thinking | celebrate
 *   lookAt       'pointer' | { x, y } in -1..1 | null
 *   pulse        bump to nod once (typing)
 *   interactive  tap to squash; drag to spin (3D)
 */
export default function Mascot({
  state, mood, lookAt = null, pulse = 0, size = 96, mode = '2d', interactive = false,
  label = 'Vale, the Vantaris mascot', decorative = false, className = '', style,
}) {
  const s = state ?? MOOD_STATE[mood] ?? 'idle';
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label };
  const svg = <MascotSVG state={s} lookAt={lookAt} pulse={pulse} interactive={interactive} style={{ width: '100%', height: '100%' }} />;
  return (
    <div {...a11y} className={`mascot ${mode !== '3d' && FLOAT.has(s) ? 'mascot-float' : ''} ${className}`} style={{ width: size, height: size * 1.18, ...style }}>
      {mode === '3d' ? (
        <Scene3D scene="mascot" fallback={svg} state={s} lookAt={lookAt} pulse={pulse} interactive={interactive} />
      ) : svg}
    </div>
  );
}
