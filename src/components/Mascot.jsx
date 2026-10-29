import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { MASCOT, ONE_SHOT } from '../mascot/manifest';
import Vale from './Vale';

const VIDEO_MIN_SIZE = 64;

/**
 * Vale in a slot. Plays the Higgsfield clip for `mood` when one exists (pausing
 * off screen), otherwise renders the animated SVG Vale. Small sizes and
 * reduced motion always use the SVG (or the clip's poster frame).
 */
export default function Mascot({ mood = 'welcome', size = 96, variant = 'bust', label = 'Vale, your Vantaris tutor', className = '', decorative = false }) {
  const reduce = useReducedMotion();
  const [failed, setFailed] = useState({});
  const [current, setCurrent] = useState(mood);
  const wrapRef = useRef(null);
  const videoRef = useRef(null);

  // Follow the mood prop; one-shot clips fall back to idle when they end.
  const [lastMood, setLastMood] = useState(mood);
  if (mood !== lastMood) {
    setLastMood(mood);
    setCurrent(mood);
  }

  const clip = size >= VIDEO_MIN_SIZE && !failed[current] ? MASCOT[current] ?? null : null;

  useEffect(() => {
    const el = wrapRef.current;
    const video = videoRef.current;
    if (!el || !video || reduce || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [clip, reduce]);

  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label };

  return (
    <div ref={wrapRef} {...a11y} className={`mascot ${clip ? 'mascot--video' : ''} ${className}`} style={{ width: size, height: size }}>
      {clip ? (
        reduce ? (
          <img src={clip.poster} alt="" />
        ) : (
          <video
            key={current}
            ref={videoRef}
            autoPlay
            muted
            playsInline
            loop={clip.loop ?? !ONE_SHOT.has(current)}
            preload="metadata"
            poster={clip.poster}
            onEnded={() => ONE_SHOT.has(current) && MASCOT.idle && setCurrent('idle')}
            onError={() => setFailed((f) => ({ ...f, [current]: true }))}
            disablePictureInPicture
          >
            {clip.webm && <source src={clip.webm} type="video/webm" />}
            {clip.mp4 && <source src={clip.mp4} type="video/mp4" />}
          </video>
        )
      ) : (
        <Vale mood={current} variant={variant} style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  );
}
