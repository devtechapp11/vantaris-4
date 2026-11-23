import { useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { springs } from '../motion/springs';
import type { CacheModel } from './model';

type Props = {
  cache: CacheModel;
  style: CSSProperties;
  onClaim: (cache: CacheModel, el: HTMLElement | null) => Promise<{ credited: boolean }>;
};

const REWARD = { xp: '+50 XP', freeze: '+1 streak freeze' } as const;

/**
 * A sealed chrome capsule after every third chapter. It unseals once the
 * chapter before it has a star; a tap opens it (no chance involved: the
 * reward is printed on the seal).
 */
export default function VaultCache({ cache, style, onClaim }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<'idle' | 'opening' | 'open'>(cache.opened ? 'open' : 'idle');
  const [note, setNote] = useState<string | null>(null);
  const state = phase === 'open' ? 'open' : cache.ready ? 'ready' : 'sealed';

  const tap = async () => {
    if (state !== 'ready' || phase !== 'idle') return;
    setPhase('opening');
    const res = await onClaim(cache, ref.current).catch(() => ({ credited: false }));
    setPhase('open');
    setNote(res.credited ? 'Added to your account' : 'Saved on this device · added at next sync');
  };

  const label = state === 'sealed'
    ? `Vault Cache, sealed. Earn a star on ${cache.afterTitle} to open it. Reward: ${REWARD[cache.reward]}.`
    : state === 'ready' ? `Vault Cache ready. Open it for ${REWARD[cache.reward]}.` : `Vault Cache opened: ${REWARD[cache.reward]}.`;

  return (
    <div className={`vc vc--${state}`} style={style}>
      <motion.button
        ref={ref}
        type="button"
        className="vc-capsule"
        onClick={tap}
        disabled={state !== 'ready'}
        aria-label={label}
        whileTap={state === 'ready' ? { scale: 0.94 } : undefined}
        animate={phase === 'opening' && !reduce ? { rotate: [0, -6, 6, -3, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
        transition={phase === 'opening' ? { duration: 0.5 } : springs.heavy}
      >
        <motion.span
          className="vc-lid"
          aria-hidden="true"
          animate={state === 'open' ? { y: reduce ? 0 : -18, rotate: reduce ? 0 : -14, opacity: 0.9 } : { y: 0, rotate: 0, opacity: 1 }}
          transition={springs.heavy}
        />
        <span className="vc-body" aria-hidden="true">
          {state === 'sealed' ? <Lock size={16} strokeWidth={1.8} /> : state === 'open' ? (cache.reward === 'xp' ? <Sparkles size={16} /> : <ShieldCheck size={16} />) : <i className="vc-seal" />}
        </span>
      </motion.button>
      <span className="vc-tag fig-mono">
        {state === 'sealed' ? 'VAULT CACHE · SEALED' : state === 'ready' ? `OPEN · ${REWARD[cache.reward].toUpperCase()}` : REWARD[cache.reward].toUpperCase()}
      </span>
      <AnimatePresence>
        {phase === 'open' && note && (
          <motion.span className="vc-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={springs.soft} role="status">
            {note}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
