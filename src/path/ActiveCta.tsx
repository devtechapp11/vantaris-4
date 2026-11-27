import { useEffect, useRef } from 'react';
import { ArrowRight, Play, Repeat2 } from 'lucide-react';

type Kind = 'start' | 'continue' | 'review';
const LABEL: Record<Kind, string> = { start: 'Start', continue: 'Continue', review: 'Review' };
const ICON = { start: Play, continue: ArrowRight, review: Repeat2 };

/**
 * The one dominant action of the app (the 0.5 s rule): visible in the first
 * render, centred on arrival, focused so Enter starts.
 */
export default function ActiveCta({ kind, title, onStart, prefetch }: { kind: Kind; title: string; onStart: () => void; prefetch?: Record<string, unknown> }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const r = el.getBoundingClientRect();
    if (r.top < 80 || r.bottom > innerHeight - 96) el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
  }, []);
  const Icon = ICON[kind];
  return (
    <button ref={ref} type="button" className="btn btn--primary btn--md path-cta midas-surface" onClick={onStart} aria-label={`${LABEL[kind]}: ${title}`} {...prefetch}>
      <Icon size={16} aria-hidden="true" /> <span className="path-cta-label">{LABEL[kind]}</span>
    </button>
  );
}

/** Phones and tablets: the way back to the active node when it scrolls off screen. */
export function ContinuePill({ title, onStart }: { title: string; onStart: () => void }) {
  return (
    <div className="continue-pill-wrap">
      <button type="button" className="continue-pill" onClick={onStart}>
        <span className="continue-pill-k">Continue</span>
        <span className="continue-pill-t">{title}</span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
