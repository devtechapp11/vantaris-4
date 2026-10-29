import { useId, useRef } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';

/*
  Vale (Vantaris Analytical Learning Entity): a geometric fox in a fitted navy
  suit with a gold V tie pin. Drawn as faceted flat shapes so it reads at 40px
  and at 400px. Each mood sets the face (lids, gaze, brows, mouth) and a pose.

    welcome  confident smirk, one eyebrow raised
    think    paw on chin, looking up and right, monocle appears
    correct  sharp nod, gold sparkle in the eyes, fist pump
    wrong    compassionate head tilt, encouraging smile
    streak   spinning a golden pen, flames behind
    levelup  adjusting the tie, standing taller, gold particles rising
    idle     reviewing documents, glancing up now and then
*/
export const VALE_MOODS = ['welcome', 'think', 'correct', 'wrong', 'streak', 'levelup', 'idle'];

// lid: how far the upper lid covers the eye (px); look: pupil offset; brows: [dx, dy, rotate]
const FACE = {
  welcome: { lid: 3, look: [0, 0], browL: [0, 0, 0], browR: [0, -6, -4], mouth: 'smirk', tilt: 0 },
  think: { lid: 3, look: [3.5, -3], browL: [0, -2, -6], browR: [0, -7, -4], mouth: 'hmm', tilt: 6 },
  correct: { lid: 5, look: [0, 0], browL: [0, -3, 0], browR: [0, -3, 0], mouth: 'grin', tilt: 0 },
  wrong: { lid: 4, look: [0, 1], browL: [0, -3, -14], browR: [0, -3, 14], mouth: 'soft', tilt: -9 },
  streak: { lid: 6, look: [-2, 1], browL: [0, 1, 8], browR: [0, 1, -8], mouth: 'grin', tilt: 0 },
  levelup: { lid: 2, look: [0, -1.5], browL: [0, -4, 0], browR: [0, -4, 0], mouth: 'proud', tilt: 0 },
  idle: { lid: 7, look: [0, 3.5], browL: [0, 0, 0], browR: [0, 0, 0], mouth: 'calm', tilt: 0 },
};

const MOUTH = {
  smirk: 'M120 143 L120 147 M107 147.5 Q113.5 152 120 147 Q127.5 151.5 135 143.5',
  grin: 'M106 145.5 Q120 163 134 145.5 Q120 151 106 145.5 Z',
  hmm: 'M120 143 L120 147 M110 150.5 Q118 148 128.5 151.5',
  soft: 'M120 143 L120 147 M108.5 148.5 Q120 155 131.5 148.5',
  proud: 'M120 143 L120 147 M105.5 147 Q120 158 134.5 147',
  calm: 'M120 143 L120 147 M111 149 Q120 152.5 129 149',
};

const EYE = {
  l: { shape: 'M80 92 Q92 86 108 98 Q94 104 80 92 Z', iris: [95, 95.5], lid: [74, 112] },
  r: { shape: 'M160 92 Q148 86 132 98 Q146 104 160 92 Z', iris: [145, 95.5], lid: [128, 166] },
};
const LID_TOP = 56; // lid rect is 30px tall; its bottom edge sits at 86 + lid
const BLINK_SHUT = 104 - 86;

export default function Vale({ mood = 'welcome', variant = 'bust', className = '', style }) {
  const prefersReduced = useReducedMotion();
  const svgRef = useRef(null);
  const inView = useInView(svgRef, { margin: '120px 0px' });
  // Loops only run while Vale is on screen, and never with reduced motion.
  const reduce = prefersReduced || !inView;
  const uid = useId().replace(/:/g, '');
  const f = FACE[mood] ?? FACE.welcome;
  const face = variant === 'face';
  const viewBox = face ? '30 2 180 168' : '0 0 240 240';
  const loop = (duration, extra = {}) => (reduce ? { duration: 0 } : { duration, repeat: Infinity, ease: 'easeInOut', ...extra });

  return (
    <svg ref={svgRef} viewBox={viewBox} className={className} style={style} aria-hidden="true" overflow={face ? 'visible' : 'hidden'}>
      <defs>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold-300)" />
          <stop offset="0.55" stopColor="var(--gold-500)" />
          <stop offset="1" stopColor="var(--gold-700)" />
        </linearGradient>
        <radialGradient id={`${uid}-iris`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="var(--gold-300)" />
          <stop offset="0.45" stopColor="var(--vale-eye)" />
          <stop offset="1" stopColor="var(--vale-eye-deep)" />
        </radialGradient>
        <linearGradient id={`${uid}-flame`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--vale-flame)" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="var(--gold-400)" stopOpacity="0.8" />
          <stop offset="1" stopColor="var(--gold-300)" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${uid}-el`}><path d={EYE.l.shape} /></clipPath>
        <clipPath id={`${uid}-er`}><path d={EYE.r.shape} /></clipPath>
      </defs>

      {!face && mood === 'streak' && <Flames uid={uid} reduce={reduce} />}

      <motion.g
        animate={{ y: mood === 'levelup' ? -6 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        {!face && <Body uid={uid} reduce={reduce} loop={loop} />}

        {/* Head: tilts and nods around the neck */}
        <motion.g
          style={{ originX: 0.5, originY: 0.96 }}
          animate={
            mood === 'correct' && !reduce
              ? { rotate: 0, y: [0, 7, 0, 5, 0] }
              : { rotate: f.tilt, y: mood === 'levelup' ? -3 : 0 }
          }
          transition={
            mood === 'correct' && !reduce
              ? { y: { duration: 0.9, times: [0, 0.2, 0.45, 0.65, 1], ease: 'easeOut', repeat: Infinity, repeatDelay: 1.6 } }
              : { type: 'spring', stiffness: 160, damping: 14 }
          }
        >
          <Ears reduce={reduce} />
          <Head />
          <Brows f={f} />
          <Eye side="l" uid={uid} f={f} mood={mood} reduce={reduce} />
          <Eye side="r" uid={uid} f={f} mood={mood} reduce={reduce} />
          <Muzzle mood={f.mouth} />
          <AnimatePresence>
            {mood === 'think' && (
              <motion.g
                key="monocle"
                initial={reduce ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.15 }}
                style={{ originX: 0.5, originY: 0.5 }}
              >
                <circle cx="145" cy="95.5" r="15.5" fill="rgba(255,255,255,0.08)" stroke={`url(#${uid}-gold)`} strokeWidth="3.2" />
                <path d="M158 104 Q170 132 160 170" fill="none" stroke="var(--gold-500)" strokeWidth="1.3" strokeDasharray="2.4 2" />
              </motion.g>
            )}
            {mood === 'correct' && (
              <motion.g key="sparkle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Sparkle x={103} y={86} reduce={reduce} delay={0.1} uid={uid} />
                <Sparkle x={153} y={86} reduce={reduce} delay={0.35} uid={uid} />
              </motion.g>
            )}
          </AnimatePresence>
        </motion.g>

        {!face && (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.g
              key={mood}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <Pose mood={mood} uid={uid} reduce={reduce} />
            </motion.g>
          </AnimatePresence>
        )}
      </motion.g>

      {!face && mood === 'levelup' && <Particles reduce={reduce} />}
      {face && mood === 'levelup' && <Particles reduce={reduce} compact />}
    </svg>
  );
}

function Body({ uid, reduce, loop }) {
  return (
    <motion.g style={{ originX: 0.5, originY: 1 }} animate={reduce ? undefined : { scaleY: [1, 1.012, 1] }} transition={loop(3.6)}>
      {/* neck */}
      <path d="M100 146 L140 146 L141 166 L120 178 L99 166 Z" fill="var(--vale-fur-dark)" />
      {/* jacket, lit on the left */}
      <path d="M16 240 L25 204 C31 184 52 174 80 168 L100 161 L120 176 L140 161 L160 168 C188 174 209 184 215 204 L224 240 Z" fill="var(--vale-suit)" />
      <path d="M16 240 L25 204 C31 184 52 174 80 168 L100 161 L120 176 L120 240 Z" fill="var(--vale-suit-light)" opacity="0.55" />
      {/* shirt */}
      <path d="M99 159 L141 159 L120 224 Z" fill="var(--vale-shirt)" />
      <path d="M120 176 L141 159 L120 224 Z" fill="var(--vale-mask-shade)" opacity="0.35" />
      {/* collar points */}
      <path d="M98 157 L112 186 L120 172 Z" fill="var(--vale-shirt)" stroke="var(--vale-mask-shade)" strokeWidth="0.8" />
      <path d="M142 157 L128 186 L120 172 Z" fill="var(--vale-shirt)" stroke="var(--vale-mask-shade)" strokeWidth="0.8" />
      {/* tie */}
      <path d="M114 172 L126 172 L123.5 184 L116.5 184 Z" fill="var(--vale-tie-light)" />
      <path d="M116.5 184 L123.5 184 L130 226 L120 238 L110 226 Z" fill="var(--vale-tie)" />
      <path d="M120 184 L123.5 184 L130 226 L120 238 Z" fill="var(--vale-ink)" opacity="0.25" />
      {/* gold V tie pin */}
      <path d="M115.2 198 L120 207 L124.8 198" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* lapels */}
      <path d="M98 157 L76 170 L88 194 L80 200 L114 238 L120 224 Z" fill="var(--vale-lapel)" />
      <path d="M142 157 L164 170 L152 194 L160 200 L126 238 L120 224 Z" fill="var(--vale-lapel)" />
      <path d="M98 157 L76 170 L88 194 L80 200 L114 238" fill="none" stroke="var(--vale-lapel-edge)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M142 157 L164 170 L152 194 L160 200 L126 238" fill="none" stroke="var(--vale-lapel-edge)" strokeWidth="1.2" strokeLinejoin="round" opacity="0.6" />
      {/* pocket square */}
      <path d="M156 214 L184 208" stroke="var(--vale-lapel-edge)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M160 213 L168 202 L172 206 L178 200 L180 210 Z" fill={`url(#${uid}-gold)`} />
    </motion.g>
  );
}

function Ears({ reduce }) {
  return (
    <>
      <motion.g
        style={{ originX: 0.85, originY: 1 }}
        animate={reduce ? undefined : { rotate: [0, 0, -9, 0, 0] }}
        transition={{ duration: 0.6, times: [0, 0.1, 0.4, 0.7, 1], repeat: Infinity, repeatDelay: 5.5 }}
      >
        <path d="M68 68 L58 10 L108 46 Z" fill="var(--vale-fur)" />
        <path d="M73 59 L65 25 L98 46 Z" fill="var(--vale-ear-inner)" />
        <path d="M58 10 L61 27 L73 21 Z" fill="var(--vale-ink)" opacity="0.8" />
      </motion.g>
      <motion.g
        style={{ originX: 0.15, originY: 1 }}
        animate={reduce ? undefined : { rotate: [0, 0, 7, 0, 0] }}
        transition={{ duration: 0.6, times: [0, 0.1, 0.4, 0.7, 1], repeat: Infinity, repeatDelay: 7.2, delay: 2.4 }}
      >
        <path d="M172 68 L182 10 L132 46 Z" fill="var(--vale-fur-dark)" />
        <path d="M167 59 L175 25 L142 46 Z" fill="var(--vale-ear-inner)" />
        <path d="M182 10 L179 27 L167 21 Z" fill="var(--vale-ink)" opacity="0.8" />
      </motion.g>
    </>
  );
}

function Head() {
  return (
    <>
      <path d="M120 38 L148 44 L170 60 L182 84 L201 104 L176 114 L162 130 L140 148 L120 158 L100 148 L78 130 L64 114 L39 104 L58 84 L70 60 L92 44 Z" fill="var(--vale-fur)" />
      {/* facets: light from the upper left */}
      <path d="M92 44 L120 38 L148 44 L136 72 L120 80 L104 72 Z" fill="var(--vale-fur-light)" />
      <path d="M70 60 L92 44 L104 72 L84 92 L58 84 Z" fill="var(--vale-fur-light)" opacity="0.55" />
      <path d="M170 60 L148 44 L136 72 L156 92 L182 84 Z" fill="var(--vale-fur-dark)" />
      <path d="M182 84 L201 104 L176 114 L164 98 Z" fill="var(--vale-fur-dark)" />
      {/* white mask: cheeks and muzzle */}
      <path d="M39 104 L76 98 L102 116 L120 128 L138 116 L164 98 L201 104 L176 114 L162 130 L140 148 L120 158 L100 148 L78 130 L64 114 Z" fill="var(--vale-mask)" />
      <path d="M120 128 L138 116 L164 98 L201 104 L176 114 L162 130 L140 148 L120 158 Z" fill="var(--vale-mask-shade)" opacity="0.6" />
      {/* muzzle bridge */}
      <path d="M110.5 100 L129.5 100 L125 133 L115 133 Z" fill="var(--vale-fur)" />
      <path d="M120 100 L129.5 100 L125 133 L120 133 Z" fill="var(--vale-fur-dark)" opacity="0.5" />
      {/* whisker dots */}
      {[[103, 138], [99, 133], [105, 131], [137, 138], [141, 133], [135, 131]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" fill="var(--vale-mask-shade)" />
      ))}
    </>
  );
}

function Brows({ f }) {
  const t = { type: 'spring', stiffness: 260, damping: 16 };
  return (
    <>
      <motion.path
        d="M83 81 L104 84.5"
        stroke="var(--vale-brow)" strokeWidth="4.2" strokeLinecap="round"
        style={{ originX: 0.5, originY: 0.5 }}
        animate={{ x: f.browL[0], y: f.browL[1], rotate: f.browL[2] }}
        transition={t}
      />
      <motion.path
        d="M157 81 L136 84.5"
        stroke="var(--vale-brow)" strokeWidth="4.2" strokeLinecap="round"
        style={{ originX: 0.5, originY: 0.5 }}
        animate={{ x: f.browR[0], y: f.browR[1], rotate: f.browR[2] }}
        transition={t}
      />
    </>
  );
}

function Eye({ side, uid, f, mood, reduce }) {
  const e = EYE[side];
  const [cx, cy] = e.iris;
  const lidY = LID_TOP + f.lid;
  const glance = mood === 'idle' && !reduce;
  return (
    <g>
      <path d={e.shape} fill="var(--vale-ink)" />
      <g clipPath={`url(#${uid}-e${side})`}>
        <motion.g
          animate={
            glance
              ? { x: [0, 0, 0, 0, 0], y: [f.look[1], f.look[1], -1, -1, f.look[1]] }
              : { x: f.look[0], y: f.look[1] }
          }
          transition={glance ? { duration: 6.5, times: [0, 0.55, 0.6, 0.85, 0.9], repeat: Infinity } : { type: 'spring', stiffness: 220, damping: 18 }}
        >
          <circle cx={cx} cy={cy} r="7.2" fill={`url(#${uid}-iris)`} />
          <ellipse cx={cx} cy={cy} rx="2.1" ry="4.9" fill="var(--vale-ink)" />
          <circle cx={cx + 2.6} cy={cy - 2.8} r="1.7" fill="var(--gold-300)" />
          <circle cx={cx + 2.9} cy={cy - 3.1} r="0.8" fill="#FFFFFF" />
        </motion.g>
        {/* upper lid: sets the "knowing" look and blinks */}
        <motion.rect
          x={e.lid[0]} width={e.lid[1] - e.lid[0]} height="30" fill="var(--vale-fur)"
          initial={false}
          animate={
            reduce
              ? { y: lidY }
              : glance
                ? { y: [lidY, lidY, LID_TOP + 1, LID_TOP + 1, lidY, lidY + BLINK_SHUT - f.lid, lidY] }
                : { y: [lidY, lidY, lidY + BLINK_SHUT - f.lid, lidY] }
          }
          transition={
            reduce
              ? { duration: 0 }
              : glance
                ? { duration: 6.5, times: [0, 0.55, 0.6, 0.85, 0.9, 0.95, 1], repeat: Infinity }
                : { duration: 4.6, times: [0, 0.93, 0.965, 1], repeat: Infinity, delay: side === 'l' ? 0 : 0.02 }
          }
        />
      </g>
      <path d={e.shape} fill="none" stroke="var(--vale-ink)" strokeWidth="1.8" strokeLinejoin="round" />
    </g>
  );
}

function Muzzle({ mood }) {
  return (
    <>
      <path d="M110 132 Q120 127 130 132 Q126 140 120 143 Q114 140 110 132 Z" fill="var(--vale-ink)" />
      <path d="M114.5 132 Q118 130.2 121.5 131" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <AnimatePresence initial={false}>
        <motion.path
          key={mood}
          d={MOUTH[mood]}
          fill={mood === 'grin' ? 'var(--vale-ink)' : 'none'}
          stroke="var(--vale-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        />
      </AnimatePresence>
    </>
  );
}

function Sparkle({ x, y, reduce, delay, uid }) {
  return (
    <motion.path
      d={`M${x} ${y - 6} L${x + 1.6} ${y - 1.6} L${x + 6} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 6} L${x - 1.6} ${y + 1.6} L${x - 6} ${y} L${x - 1.6} ${y - 1.6} Z`}
      fill={`url(#${uid}-gold)`}
      style={{ originX: 0.5, originY: 0.5 }}
      animate={reduce ? { scale: 1 } : { scale: [0, 1.25, 0.9, 0], rotate: [0, 45, 90] }}
      transition={reduce ? { duration: 0 } : { duration: 1.4, repeat: Infinity, delay, repeatDelay: 0.6 }}
    />
  );
}

/* ---------- Poses ---------- */
function Paw({ x, y, r = 0, fist = false }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      {fist ? (
        <>
          <path d="M-12 -4 C-13 8 -6 13 1 13 C9 13 13 7 12 -4 C11 -12 -11 -12 -12 -4 Z" fill="var(--vale-fur)" stroke="var(--vale-fur-light)" strokeWidth="1.4" />
          <path d="M-9 -7 C-6 -11 6 -11 9 -7 L5 -3 L-5 -3 Z" fill="var(--vale-fur-light)" opacity="0.8" />
          <path d="M-6 -8 L-6 -2 M0 -9 L0 -3 M6 -8 L6 -2" stroke="var(--vale-fur-dark)" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M-11 -6 C-12 6 -6 12 0 12 C7 12 12 6 11 -6 C10 -14 -10 -14 -11 -6 Z" fill="var(--vale-fur)" stroke="var(--vale-fur-light)" strokeWidth="1.4" />
          <path d="M-8 -9 C-5 -13 5 -13 8 -9 L4 -5 L-4 -5 Z" fill="var(--vale-fur-light)" opacity="0.8" />
          <path d="M-4.5 -11 L-4.5 -5 M2 -12 L2 -6" stroke="var(--vale-fur-dark)" strokeWidth="1.7" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function Sleeve({ d, wx, wy }) {
  return (
    <>
      <path d={d} fill="none" stroke="var(--vale-suit)" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="var(--vale-suit-light)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" transform="translate(-3 -3)" />
      <circle cx={wx} cy={wy} r="11" fill="var(--vale-shirt)" />
      <circle cx={wx + 5} cy={wy + 4} r="2.6" fill="var(--gold-400)" />
    </>
  );
}

function Pose({ mood, uid, reduce }) {
  if (mood === 'think') {
    return (
      <g>
        <Sleeve d="M200 252 L192 208 L152 174" wx={152} wy={174} />
        <Paw x={136} y={161} r={-28} />
      </g>
    );
  }
  if (mood === 'correct') {
    return (
      <motion.g
        animate={reduce ? undefined : { y: [0, -10, 0, -8, 0] }}
        transition={{ duration: 0.9, times: [0, 0.2, 0.45, 0.65, 1], repeat: Infinity, repeatDelay: 1.6, ease: 'easeOut' }}
      >
        <Sleeve d="M206 252 L226 200 L214 156" wx={214} wy={156} />
        <Paw x={212} y={142} fist />
        {!reduce && (
          <g stroke="var(--gold-400)" strokeWidth="2" strokeLinecap="round" opacity="0.85">
            <path d="M196 128 L189 120" /><path d="M212 122 L212 112" /><path d="M228 128 L235 120" />
          </g>
        )}
      </motion.g>
    );
  }
  if (mood === 'streak') {
    return (
      <g>
        <Sleeve d="M36 252 L50 214 L88 202" wx={88} wy={202} />
        <motion.g
          style={{ originX: 0.5, originY: 0.5 }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={reduce ? undefined : { duration: 1.2, repeat: Infinity, ease: 'linear' }}
        >
          <rect x="74" y="188.5" width="44" height="6" rx="3" fill={`url(#${uid}-gold)`} />
          <path d="M118 188.5 L126 191.5 L118 194.5 Z" fill="var(--gold-700)" />
          <rect x="74" y="188.5" width="8" height="6" rx="2" fill="var(--vale-ink)" />
        </motion.g>
        <Paw x={98} y={198} r={10} fist />
      </g>
    );
  }
  if (mood === 'levelup') {
    return (
      <motion.g
        animate={reduce ? undefined : { x: [0, 1.5, -1.5, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.2 }}
      >
        <Sleeve d="M28 252 L60 222 L102 190" wx={102} wy={190} />
        <Sleeve d="M212 252 L180 222 L138 190" wx={138} wy={190} />
        <Paw x={111} y={180} r={-40} />
        <Paw x={129} y={180} r={40} />
      </motion.g>
    );
  }
  if (mood === 'idle') {
    return (
      <motion.g
        animate={reduce ? undefined : { y: [0, -1.5, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sleeve d="M30 252 L52 226 L80 214" wx={80} wy={214} />
        <Sleeve d="M210 252 L188 226 L160 214" wx={160} wy={214} />
        <g transform="rotate(-4 120 222)">
          <rect x="72" y="196" width="96" height="58" rx="4" fill="var(--vale-paper)" />
          <rect x="72" y="196" width="96" height="9" rx="4" fill="var(--vale-tie)" />
          <path d="M80 214 L122 214 M80 221 L114 221 M80 228 L118 228" stroke="var(--vale-mask-shade)" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="134" y="222" width="6" height="12" fill="var(--gold-500)" />
          <rect x="143" y="215" width="6" height="19" fill="var(--gold-500)" />
          <rect x="152" y="209" width="6" height="25" fill="var(--cyan)" />
        </g>
        <Paw x={84} y={208} r={-12} />
        <Paw x={156} y={208} r={12} />
      </motion.g>
    );
  }
  return null;
}

function Flames({ uid, reduce }) {
  const flames = [
    { x: 30, y: 226, s: 1.2, d: 0 },
    { x: 210, y: 226, s: 1.25, d: 0.25 },
    { x: 8, y: 236, s: 0.8, d: 0.5 },
    { x: 232, y: 236, s: 0.85, d: 0.15 },
  ];
  return (
    <g opacity="0.85">
      {flames.map((fl) => (
        <g key={fl.x} transform={`translate(${fl.x} ${fl.y}) scale(${fl.s})`}>
          <motion.g
            style={{ originX: 0.5, originY: 1 }}
            animate={reduce ? undefined : { scaleY: [1, 1.16, 0.92, 1.08, 1], scaleX: [1, 0.9, 1.06, 0.95, 1], opacity: [0.9, 1, 0.82, 1, 0.9] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: fl.d, ease: 'easeInOut' }}
          >
            <path d="M0 0 C-19 -10 -21 -42 -5 -78 C-1 -58 17 -53 17 -30 C17 -14 11 -4 0 0 Z" fill={`url(#${uid}-flame)`} />
            <path d="M0 0 C-9 -6 -10 -24 -1 -44 C1 -32 9 -29 9 -17 C9 -8 5 -2 0 0 Z" fill="var(--gold-300)" opacity="0.85" />
          </motion.g>
        </g>
      ))}
    </g>
  );
}

function Particles({ reduce, compact = false }) {
  if (reduce) return null;
  const dots = compact
    ? [[70, 3, 0], [120, 2.5, 0.5], [170, 3, 1.0], [95, 2, 1.4], [150, 2, 0.8]]
    : [[40, 3, 0], [70, 2.2, 0.6], [100, 3.4, 1.2], [140, 2.4, 0.3], [172, 3, 0.9], [204, 2.4, 1.5], [56, 2, 1.8], [188, 2, 0.15]];
  const from = compact ? 170 : 240;
  const to = compact ? 10 : 30;
  return (
    <g>
      {dots.map(([x, r, delay]) => (
        <motion.circle
          key={x}
          cx={x} r={r}
          fill="var(--gold-400)"
          style={{ filter: 'drop-shadow(0 0 3px rgba(241,210,122,0.9))' }}
          initial={{ cy: from, opacity: 0 }}
          animate={{ cy: [from, to], opacity: [0, 1, 1, 0] }}
          transition={{
            cy: { duration: 2.6, repeat: Infinity, delay, ease: 'easeOut' },
            opacity: { duration: 2.6, repeat: Infinity, delay, times: [0, 0.15, 0.7, 1] },
          }}
        />
      ))}
    </g>
  );
}
