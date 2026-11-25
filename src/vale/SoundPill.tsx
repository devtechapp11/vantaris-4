import { useSyncExternalStore } from 'react';
import { siteSound } from './siteSound';

/** « SOUND · OFF / ON », always visible on the site. Off on every visit. */
export default function SoundPill({ className = '' }: { className?: string }) {
  const on = useSyncExternalStore(siteSound.subscribe, siteSound.get, siteSound.get);
  return (
    <button type="button" className={`sound-pill kicker ${className}`} aria-pressed={on} onClick={() => siteSound.set(!on)}>
      Sound · {on ? 'On' : 'Off'}
    </button>
  );
}
