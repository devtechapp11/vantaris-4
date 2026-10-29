import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MASCOT, ONE_SHOT } from '../mascot/manifest';

/**
 * Mascot video slot. Plays the clip for `mood`, cross-fades when the mood
 * changes, returns to `idle` after one-shot moods, pauses when off screen,
 * and shows the poster frame when the player prefers reduced motion.
 * `masked` feathers the edges so a clip with a solid background blends into
 * any surface.
 */
export default function Mascot({ mood = 'idle', size = 96, masked = false, label = 'Vantaris mascot', className = '' }) {
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(mood);
  const [failed, setFailed] = useState({});
  const wrapRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => setCurrent(mood), [mood]);

  const clip = !failed[current] ? MASCOT[current] ?? null : null;

  // Pause off-screen to save battery.
  useEffect(() => {
    const el = wrapRef.current;
    const video = videoRef.current;
    if (!el || !video || reduce || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [clip, reduce]);

  const ended = () => {
    if (ONE_SHOT.has(current) && MASCOT.idle) setCurrent('idle');
  };

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={label}
      className={`mascot ${masked ? 'mascot--masked' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
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
            preload="auto"
            poster={clip.poster}
            onEnded={ended}
            onError={() => setFailed((f) => ({ ...f, [current]: true }))}
            disablePictureInPicture
          >
            {clip.webm && <source src={clip.webm} type="video/webm" />}
            {clip.mp4 && <source src={clip.mp4} type="video/mp4" />}
          </video>
        )
      ) : (
        <Placeholder mood={current} size={size} reduce={reduce} />
      )}
    </div>
  );
}

// Stand-in until the Higgsfield clips exist: a brass-and-malachite coin with
// a face that reacts to the mood. Deliberately simple so it's obviously temporary.
function Placeholder({ mood, size, reduce }) {
  const bounce = {
    cheer: { y: [0, -size * 0.08, 0], rotate: [0, -6, 6, 0] },
    celebrate: { y: [0, -size * 0.1, 0], scale: [1, 1.06, 1] },
    sad: { y: [0, size * 0.03, 0], rotate: [0, -3, 0] },
    wave: { rotate: [0, -8, 8, -4, 0] },
    think: { rotate: [0, 3, -3, 0] },
    idle: { y: [0, -size * 0.02, 0] },
  }[mood] ?? {};
  const mouth = {
    cheer: 'M38 60 Q50 72 62 60', celebrate: 'M36 58 Q50 76 64 58', sad: 'M39 66 Q50 58 61 66',
    think: 'M42 64 L58 62', wave: 'M39 61 Q50 70 61 61', idle: 'M40 62 Q50 68 60 62',
  }[mood];
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden="true"
      animate={reduce ? undefined : bounce}
      transition={{ duration: mood === 'idle' || mood === 'think' ? 3.2 : 0.9, repeat: mood === 'idle' || mood === 'think' ? Infinity : 0, ease: 'easeInOut' }}
    >
      <defs>
        <radialGradient id="mz-face" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#F3DC9A" />
          <stop offset="55%" stopColor="#C9A24E" />
          <stop offset="100%" stopColor="#8C6C26" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="34" fill="url(#mz-face)" />
      <circle cx="50" cy="52" r="28.5" fill="none" stroke="rgba(90,64,18,.45)" strokeWidth="2" />
      <ellipse cx="40" cy="48" rx="3.4" ry={mood === 'cheer' || mood === 'celebrate' ? 2 : 4} fill="#3A2A08" />
      <ellipse cx="60" cy="48" rx="3.4" ry={mood === 'cheer' || mood === 'celebrate' ? 2 : 4} fill="#3A2A08" />
      <path d={mouth} fill="none" stroke="#3A2A08" strokeWidth="3" strokeLinecap="round" />
      <path d="M33 30 Q50 20 67 30" fill="none" stroke="#0E6B52" strokeWidth="3.4" strokeLinecap="round" />
    </motion.svg>
  );
}
