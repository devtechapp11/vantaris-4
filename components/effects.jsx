// Pointer effects, used sparingly. Both come from React Bits (see
// src/components/vendor/react-bits/LICENSE.md and THIRD_PARTY.md), tuned to
// the brief: the magnet moves at most 4px, the spotlight is platinum at 6%.
// Neither runs on touch or with reduced motion.
import { usePrefs } from '../app/prefs';
import Magnet from './vendor/react-bits/Magnet';
import SpotlightCard from './vendor/react-bits/SpotlightCard';

/** Primary call-to-action that leans toward the cursor (4px at most). */
export function Magnetic({ children, className = '', style }) {
  const { reduceMotion } = usePrefs();
  return (
    <Magnet padding={56} magnetStrength={8} maxOffset={4} disabled={reduceMotion} wrapperClassName={className} style={style}>
      {children}
    </Magnet>
  );
}

/** A flat panel with a faint platinum light that follows the cursor. */
export function Spotlight({ children, className = '', style, as }) {
  const { reduceMotion } = usePrefs();
  if (reduceMotion) return <div className={className} style={style}>{children}</div>;
  return (
    <SpotlightCard className={className} style={style} spotlightSize={280} intensity={0.06} softness={0.8} borderGlow={0.35} proximity={40} flare={false} data-as={as}>
      {children}
    </SpotlightCard>
  );
}
