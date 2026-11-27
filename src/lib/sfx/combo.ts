/**
 * Combo chords in FM synthesis (no samples). The root climbs with the
 * multiplier AND the chord fills out, so the ear hears the climb.
 */
export type Multiplier = 1 | 2 | 3 | 5;

const ROOT_SEMITONES: Record<Multiplier, number> = { 1: 0, 2: 2, 3: 4, 5: 7 }; // C5 → D5 → E5 → G5
const CHORD: Record<Multiplier, number[]> = { 1: [0], 2: [0, 7], 3: [0, 4, 7], 5: [0, 4, 7, 12, 16] };
const C5 = 523.25;

const hz = (semitones: number) => C5 * Math.pow(2, semitones / 12);

function fmVoice(ctx: AudioContext, out: AudioNode, freq: number, t0: number, gain: number, bright: number) {
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const amp = ctx.createGain();
  car.type = 'sine';
  mod.type = 'sine';
  car.frequency.setValueAtTime(freq, t0);
  mod.frequency.setValueAtTime(freq * 2, t0); // 2:1 ratio: a glass-bell timbre
  modGain.gain.setValueAtTime(freq * bright, t0);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.05, t0 + 0.25);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
  mod.connect(modGain).connect(car.frequency);
  car.connect(amp).connect(out);
  mod.start(t0);
  car.start(t0);
  mod.stop(t0 + 0.45);
  car.stop(t0 + 0.45);
}

export function comboChord(ctx: AudioContext, out: AudioNode, mult: Multiplier) {
  const t0 = ctx.currentTime + 0.005;
  const root = ROOT_SEMITONES[mult];
  const notes = CHORD[mult];
  const each = 0.16 / Math.sqrt(notes.length); // same loudness whatever the chord
  // A 12 ms arpeggio reads as precision mechanics rather than a block chord.
  notes.forEach((n, i) => fmVoice(ctx, out, hz(root + n), t0 + i * 0.012, each, mult === 5 ? 2.2 : 1.4));
}

/** The Midas State layer: a high shimmering pad while the state lasts. Returns stop(). */
export function midasShimmer(ctx: AudioContext, out: AudioNode): () => void {
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.025, ctx.currentTime + 0.6);
  amp.connect(out);
  const oscs = [0, 7, 12].map((st, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(24 + st);
    o.detune.value = (i - 1) * 6; // a slight beat is what makes it shimmer
    o.connect(amp);
    o.start();
    return o;
  });
  return () => {
    const t = ctx.currentTime;
    amp.gain.cancelScheduledValues(t);
    amp.gain.setValueAtTime(Math.max(amp.gain.value, 0.0001), t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    oscs.forEach((o) => o.stop(t + 0.55));
  };
}
