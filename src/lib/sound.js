// Vantaris sound engine: a few synthesized, quiet sounds (no audio files).
// Felt clicks on taps, a glassy chime on a correct answer (brighter as the
// combo grows), a muted thud on a miss, and an arpeggio for a promotion.
// Respects the in-app "Sound" setting; nothing plays before a user gesture.
import { getPrefs } from '../app/prefs';

let ctx = null;
let master = null;
let noise = null;

function audio() {
  if (typeof window === 'undefined' || !getPrefs().sound || document.hidden) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.22;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function noiseBuffer(ac) {
  if (noise) return noise;
  noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.25), ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

/** One enveloped oscillator. */
function tone(ac, { freq, type = 'sine', at = 0, attack = 0.004, decay = 0.4, gain = 0.2, glideTo }) {
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + decay);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

/** A short band-passed noise tick: the "felt" part of a mechanical click. */
function tick(ac, { freq = 2400, q = 1.4, gain = 0.12, decay = 0.018, at = 0 }) {
  const t = ac.currentTime + at;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + decay + 0.02);
}

export const sound = {
  /** Felt click for taps and presses. */
  tap() {
    const ac = audio();
    if (!ac) return;
    tick(ac, { freq: 1900, gain: 0.16, decay: 0.022 });
    tone(ac, { freq: 820, type: 'triangle', decay: 0.03, gain: 0.035 });
  },
  /** Barely there: hover on primary controls (mouse only). */
  hover() {
    const ac = audio();
    if (!ac) return;
    tick(ac, { freq: 4200, q: 3, gain: 0.025, decay: 0.012 });
  },
  /** Glassy two-partial chime. `level` 0–3 lifts the pitch with the combo. */
  correct(level = 0) {
    const ac = audio();
    if (!ac) return;
    const k = 2 ** ((Math.min(level, 3) * 2) / 12);
    tone(ac, { freq: 1318.5 * k, decay: 0.9, gain: 0.16 });
    tone(ac, { freq: 1975.5 * k, at: 0.07, decay: 1.1, gain: 0.12 });
    tone(ac, { freq: 3951 * k, at: 0.07, decay: 0.35, gain: 0.025 });
  },
  /** Muted, low thud. */
  wrong() {
    const ac = audio();
    if (!ac) return;
    tone(ac, { freq: 140, glideTo: 62, type: 'sine', decay: 0.26, gain: 0.5 });
    tick(ac, { freq: 320, q: 0.8, gain: 0.18, decay: 0.08 });
  },
  /** Quick rising pair when a combo steps up. */
  combo(level = 1) {
    const ac = audio();
    if (!ac) return;
    const base = 1046.5 * 2 ** ((Math.min(level, 3) * 2) / 12);
    tone(ac, { freq: base, decay: 0.12, gain: 0.08, at: 0.32 });
    tone(ac, { freq: base * 1.5, decay: 0.28, gain: 0.08, at: 0.4 });
  },
  /** Promotion: a bright four-note arpeggio. */
  rankUp() {
    const ac = audio();
    if (!ac) return;
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
      tone(ac, { freq: f, at: i * 0.09, decay: 0.9 - i * 0.1, gain: 0.12 });
      tone(ac, { freq: f * 2, at: i * 0.09, decay: 0.3, gain: 0.02 });
    });
  },
};
