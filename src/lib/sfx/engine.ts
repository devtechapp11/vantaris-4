import { getPrefs, setPref } from '../../app/prefs';

export type Combo = 1 | 2 | 3 | 5;

/**
 * FM sound engine, synthesised with Web Audio (no audio files): watch-movement
 * clicks, crystalline FM bells that climb with the combo, a soft low thud for a
 * miss, struck-platinum star impacts and a promotion arpeggio with reverb.
 * Muting is the app's « Sound » preference, so it persists on the device.
 */
class SfxEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private verbSend!: GainNode;
  private noiseBuf?: AudioBuffer;

  get muted() {
    return !getPrefs().sound;
  }
  set muted(v: boolean) {
    setPref('sound', !v);
  }

  /** Call on the first pointerdown/keydown (browser autoplay policy). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC({ latencyHint: 'interactive' });
      } catch {
        return;
      }
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(comp).connect(this.ctx.destination);
      const verb = this.ctx.createConvolver();
      verb.buffer = this.impulse(1.8, 2.5);
      this.verbSend = this.ctx.createGain();
      this.verbSend.gain.value = 0.18;
      this.verbSend.connect(verb).connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
  }

  private ready() {
    if (this.muted || typeof document === 'undefined' || document.hidden) return false;
    if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {});
    return !!this.ctx && this.ctx.state === 'running';
  }

  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private tone(freq: number, o: { type?: OscillatorType; a?: number; d?: number; peak?: number; when?: number; send?: number; glideTo?: number } = {}) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.when ?? 0);
    const a = o.a ?? 0.005;
    const d = o.d ?? 0.2;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + a + d);
    const g = ctx.createGain();
    this.env(g, t, a, o.peak ?? 0.3, d);
    osc.connect(g);
    g.connect(this.master);
    if (o.send) {
      const s = ctx.createGain();
      s.gain.value = o.send;
      g.connect(s);
      s.connect(this.verbSend);
    }
    osc.start(t);
    osc.stop(t + a + d + 0.05);
  }

  /** Crystalline FM bell (a glass/metal chord). */
  private bell(freq: number, when = 0, peak = 0.2, d = 0.9, send = 0.35) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + when;
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    car.frequency.value = freq;
    mod.frequency.value = freq * 3.5;
    modGain.gain.setValueAtTime(freq * 2.2, t);
    modGain.gain.exponentialRampToValueAtTime(1, t + d);
    mod.connect(modGain);
    modGain.connect(car.frequency);
    const g = ctx.createGain();
    this.env(g, t, 0.004, peak, d);
    car.connect(g);
    g.connect(this.master);
    const s = ctx.createGain();
    s.gain.value = send;
    g.connect(s);
    s.connect(this.verbSend);
    car.start(t);
    mod.start(t);
    car.stop(t + d + 0.1);
    mod.stop(t + d + 0.1);
  }

  /** Swiss-movement click (very short filtered noise). */
  private click(when = 0, freq = 2500, peak = 0.25, d = 0.025) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + when;
    if (!this.noiseBuf) {
      const len = (ctx.sampleRate * 0.1) | 0;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    this.env(g, t, 0.001, peak, d);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + d + 0.02);
  }

  // ---------- Public API ----------
  tick() {
    if (!this.ready()) return;
    this.click(0, 3200, 0.2, 0.018);
    this.tone(2400, { a: 0.001, d: 0.03, peak: 0.04 });
  }

  press() {
    if (!this.ready()) return;
    this.click(0, 1800, 0.16, 0.02);
    this.click(0.045, 4200, 0.1, 0.015);
  }

  /** A chord whose root climbs with the combo (1x → 2x → 3x → 5x). */
  correct(combo: Combo = 1) {
    if (!this.ready()) return;
    const steps = { 1: 0, 2: 2, 3: 5, 5: 9 }[combo];
    const root = 523.25 * Math.pow(2, steps / 12);
    [1, 1.5, 2.25].forEach((r, i) => this.bell(root * r, i * 0.035, 0.15 - i * 0.03, 0.9));
  }

  /** A miss: low, soft, never punitive. */
  wrong() {
    if (!this.ready()) return;
    this.tone(140, { type: 'triangle', glideTo: 90, d: 0.22, peak: 0.2 });
    this.click(0, 400, 0.1, 0.08);
  }

  comboUp(level: Exclude<Combo, 1>) {
    if (!this.ready()) return;
    const shift = { 2: 0, 3: 2, 5: 5 }[level];
    [0, 4, 7, 12].forEach((s, i) => this.bell(659.25 * Math.pow(2, (s + shift) / 12), i * 0.06, 0.13, 0.5));
  }

  /** A star docking: a low impact and a metallic ring, higher for each star. */
  starImpact(i: 0 | 1 | 2) {
    if (!this.ready()) return;
    this.tone(70, { glideTo: 38, a: 0.003, d: 0.35, peak: 0.5 });
    [1, 2.76, 5.4].forEach((r, k) =>
      this.tone(620 * Math.pow(2, (i * 3) / 12) * r, { a: 0.002, d: 0.6 - k * 0.15, peak: 0.08 / (k + 1), send: 0.4 }));
    this.click(0, 900, 0.18, 0.04);
  }

  /** Desk promotion: a rising arpeggio with a reverb tail. */
  promotion() {
    if (!this.ready()) return;
    [0, 7, 12, 16, 19, 24].forEach((s, i) => this.bell(261.63 * Math.pow(2, s / 12), i * 0.11, 0.14, 1.6, 0.6));
    this.tone(55, { glideTo: 40, a: 0.01, d: 1.2, peak: 0.3 });
  }
}

export const sfx = new SfxEngine();

/** The run of correct answers → the combo tier the server pays (3 → x2, 5 → x3, 10 → x5). */
export const comboOf = (run: number): Combo => (run >= 10 ? 5 : run >= 5 ? 3 : run >= 3 ? 2 : 1);
