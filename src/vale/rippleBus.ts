/** Shockwaves on the pool: anything can drop one, the Ripples pool draws it. */
type Ripple = { x: number; z: number; strength: number; at: number };
const queue: Ripple[] = [];

export const rippleBus = {
  /** x, z in world units on the pool; strength 0..1. */
  emit(x = 0, z = 0, strength = 1) {
    queue.push({ x, z, strength, at: performance.now() });
    if (queue.length > 12) queue.shift();
  },
  /** Ripples.tsx takes the pending drops each frame. */
  drain() {
    return queue.splice(0, queue.length);
  },
};
