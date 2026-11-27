import { useEffect, useState } from 'react';
import { useApp } from '../app/AppContext';
import { deskOf } from '../vale/outfits/outfitRegistry';
import './rituals.css';

const LIMIT = 45 * 60_000;
const GAP = 10 * 60_000; // away this long and the session starts over

/**
 * After 45 minutes of continuous play, Vale yawns and suggests a break.
 * Non-blocking: a small card, never over a question, one per session.
 */
export default function BreakNudge() {
  const { me } = useApp() as unknown as { me: { profile: { level: string } } | null };
  const [show, setShow] = useState(false);
  useEffect(() => {
    let start = Date.now();
    let hiddenAt: number | null = null;
    let done = false;
    const vis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else {
        if (hiddenAt && Date.now() - hiddenAt > GAP) start = Date.now();
        hiddenAt = null;
      }
    };
    document.addEventListener('visibilitychange', vis);
    const id = window.setInterval(() => {
      if (done || document.hidden) return;
      if (Date.now() - start >= LIMIT) {
        done = true;
        setShow(true);
      }
    }, 30_000);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      window.clearInterval(id);
    };
  }, []);
  if (!show || !me) return null;
  return (
    <aside className="yawn" role="status" aria-live="polite">
      <img className="yawn-vale" src={`/vale/poster-${deskOf(me.profile.level)}.webp`} alt="" width={56} height={56} />
      <p className="yawn-text"><b>45 minutes in.</b> A short break helps it stick.</p>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShow(false)}>Keep going</button>
    </aside>
  );
}
