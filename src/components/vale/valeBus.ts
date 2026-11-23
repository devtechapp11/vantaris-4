export type ValeMood = 'idle' | 'celebrate' | 'combo' | 'encourage';

type Listener = (mood: ValeMood) => void;
const listeners = new Set<Listener>();

/** Lets any screen make Vale react (a solved question, a combo, a miss, an opened cache). */
export const valeBus = {
  react(mood: ValeMood) {
    listeners.forEach((l) => l(mood));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
