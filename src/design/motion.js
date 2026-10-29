// Shared Framer Motion variants. Screens compose these instead of inventing
// their own timings, so every transition in the app feels like one system.
import { distance, duration, ease, spring, stagger } from './tokens';

/** Route transition: crossfade + rise in, fade + slight shrink out. Children stagger. */
export const page = {
  hidden: { opacity: 0, y: distance.enter },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.out, staggerChildren: stagger.children, delayChildren: duration.instant / 2 },
  },
  exit: { opacity: 0, scale: distance.exitScale, transition: { duration: duration.fast, ease: ease.inOut } },
};

/** A child of `page` (or any staggered parent): inherits the parent's timing. */
export const item = {
  hidden: { opacity: 0, y: distance.enter },
  show: { opacity: 1, y: 0, transition: { duration: duration.reveal, ease: ease.out } },
};

/** Container that staggers its children on its own (e.g. inside a scroll reveal). */
export const group = (gap = stagger.children, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

export const fade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.base } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
};

export const pop = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: spring.bouncy },
};

/** Gentle "no" for a wrong answer or a locked card. */
export const shake = { x: distance.shake, transition: { duration: duration.slow, ease: ease.inOut } };

/** Step change in multi-step flows: slides in from the right with spring physics. */
export const step = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 64 : -64 }),
  center: { opacity: 1, x: 0, transition: spring.step },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -48 : 48, transition: { duration: duration.fast } }),
};

/** In-view reveal props for sections below the fold. */
export const inView = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount: 0.2, margin: '0px 0px -60px 0px' },
};
