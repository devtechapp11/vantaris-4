import { Vector3 } from 'three';
import { endMidasState, playMidas, type MidasMode } from './midas';
import { setMidasState } from '../lib/midas/midasTouch';
import { sfx } from '../lib/sfx/engine';
import { haptic } from '../lib/haptics';
import { valeBus } from '../components/vale/valeBus';
import { valeOutfit, type Desk } from './outfits/outfitRegistry';

/**
 * One switchboard for the three Midas levels, so a screen never talks to the
 * shader directly. ValeModel keeps `center` up to date (world space).
 * Sound goes through `play` so the landing can route it to its own pill.
 */
let stopShimmer: (() => void) | null = null;

export const valeMidas = {
  center: new Vector3(0, 0.2, 0),
  reduced: false,
  play: (fn: (s: typeof sfx) => void) => fn(sfx),
  /** Midas Touch: a right answer (or a tap on Vale at the given world point). */
  touch(at?: Vector3) {
    playMidas({ mode: 'touch', touch: at ?? this.center, reduced: this.reduced });
  },
  /** Midas State: x5 combo or the first lesson of a streak-milestone day. */
  state(on: boolean) {
    if (on) {
      playMidas({ mode: 'state', touch: this.center, reduced: this.reduced });
      setMidasState(true);
      stopShimmer?.();
      this.play((s) => {
        s.combo(5);
        stopShimmer = s.midasShimmer();
      });
      haptic('midas');
      valeBus.react('wow');
    } else {
      endMidasState(this.reduced);
      setMidasState(false);
      stopShimmer?.();
      stopShimmer = null;
    }
  },
  /** Gold Standard: promotion (2.4 s, new outfit at the peak) or the landing demo (1.4 s). */
  gold(mode: Extract<MidasMode, 'gold' | 'demo'> = 'gold', next?: Desk) {
    valeBus.react('wow');
    haptic('promotion');
    this.play((s) => s.promotion());
    return playMidas({ mode, touch: this.center, reduced: this.reduced, onPeak: next ? () => valeOutfit.set(next) : undefined });
  },
};
