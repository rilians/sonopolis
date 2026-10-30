/* ============================================================
   SONOPOLIS AUDIO ENGINE
   Every sound in the city is synthesised at runtime with the
   Web Audio API. No samples, no downloads, no network.
   ============================================================ */

/* per-channel makeup gain so every district lands in the same loudness window
   (measured with audiotest3.mjs at gain 80 / master 1.4) */
const TRIM = {
  arcade: 1.3,
  market: 0.78,
  transit: 0.51,
  docks: 0.51,
  uplink: 0.95,
  rooftop: 1.82,
  noodle: 0.9,
  sublevel: 0.52,
  greenhouse: 0.72,
  signals: 1.72,
};

export const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function fillNoise(data, kind) {
  if (kind === 'white') {
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } else if (kind === 'pink') {
    // Paul Kellet's approximation
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.28;
    }
  } else {
    // brown
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.2;
    }
  }
}

export class SonopolisAudio {
  constructor() {
    this.ctx = null;
    this.scene = null;
    this.bus = null;
    this.step = 0;
    this.nextStepTime = 0;
    this.brightness = 0.16;
    this.volume = 0.85;
    this.level = 0;
    this.peak = 0;
    this._noise = {};
    this._nodes = [];
    this._timer = null;
    this._wave = null;
    this._freq = null;
    this.onSceneChange = null;
  }

  /* ---------------- lifecycle ---------------- */

  async unlock() {
    if (this.ctx) {
      if (this.ctx.state !== 'running') await this.ctx.resume();
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -15;
    this.comp.knee.value = 12;
    this.comp.ratio.value = 5;
    this.comp.attack.value = 0.006;
    this.comp.release.value = 0.25;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.78;
    this._wave = new Uint8Array(this.analyser.fftSize);
    this._freq = new Uint8Array(this.analyser.frequencyBinCount);

    this.air = ctx.createBiquadFilter();
    this.air.type = 'lowpass';
    this.air.frequency.value = 4600;
    this.air.Q.value = 0.35;

    this.shelf = ctx.createBiquadFilter();
    this.shelf.type = 'highshelf';
    this.shelf.frequency.value = 5200;
    this.shelf.gain.value = -2;

    this.bus = ctx.createGain();
    this.bus.gain.value = 1;

    this.bus.connect(this.air);
    this.air.connect(this.shelf);
    this.shelf.connect(this.master);
    this.master.connect(this.comp);
    this.comp.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // procedural plate reverb
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = this._impulse(3.4, 2.7);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.42;
    this.send = ctx.createGain();
    this.send.gain.value = 1;
    this.bus.connect(this.send);
    this.send.connect(this.convolver);
    this.convolver.connect(this.wet);
    this.wet.connect(this.master);

    this.master.gain.setValueAtTime(0, ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(this.volume * 1.4, ctx.currentTime + 1.6);

    this._timer = setInterval(() => this._tick(), 25);
    await ctx.resume();
    return ctx;
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const n = Math.random() * 2 - 1;
        lp = lp * 0.42 + n * 0.58; // gently darkened tail
        d[i] = lp * Math.pow(1 - t, decay) * (ch === 0 ? 1 : 0.94);
      }
    }
    return buf;
  }

  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    if (this.master) {
      this.master.gain.setTargetAtTime(this.volume * 1.4, this.ctx.currentTime, 0.08);
    }
  }

  /* ---------------- time-of-day macro ---------------- */

  // t: 0..24 hours
  setTimeOfDay(t) {
    const b = clamp(0.5 + 0.5 * Math.cos(((t - 12) / 24) * Math.PI * 2), 0, 1);
    this.brightness = b;
    this.hour = t;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.air.frequency.setTargetAtTime(2600 + b * 15000, now, 0.5);
    this.shelf.gain.setTargetAtTime(-4 + b * 4, now, 0.5);
    this.wet.gain.setTargetAtTime(0.52 - b * 0.24, now, 0.5);
    if (this.scene && this.scene.macro) this.scene.macro(b, t);
  }

  /* ---------------- noise helpers ---------------- */

  noise(kind = 'white') {
    if (this._noise[kind]) return this._noise[kind];
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * 4);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    fillNoise(buf.getChannelData(0), kind);
    this._noise[kind] = buf;
    return buf;
  }

  src(kind = 'white', loop = true) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise(kind);
    s.loop = loop;
    s.loopStart = Math.random() * 2;
    s.loopEnd = s.loopStart + 1.8;
    return s;
  }

  /* ---------------- building blocks ---------------- */

  // looping filtered noise "bed"
  bed({
    out,
    kind = 'pink',
    filterType = 'lowpass',
    freq = 700,
    q = 0.7,
    gain = 0.12,
    lfoRate = 0.08,
    lfoDepth = 0.4,
    sweep = 0,
    pan = 0,
    attack = 1.2,
  }) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const s = this.src(kind);
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(gain, t, attack / 3);
    let dest = s.connect(f).connect(g);
    if (pan !== 0 && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      dest = g.connect(p);
    }
    dest.connect(out);
    let lfo = null;
    let lfoGain = null;
    if (lfoRate > 0 && (lfoDepth > 0 || sweep > 0)) {
      lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = lfoRate;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = sweep > 0 ? sweep : Math.max(0.0005, gain * lfoDepth);
      lfo.connect(lfoGain);
      lfoGain.connect(sweep > 0 ? f.frequency : g.gain);
      lfo.start(t);
    }
    s.start(t, Math.random() * 2);
    this.track(s);
    if (lfo) this.track(lfo);
    return { s, f, g, lfo, lfoGain };
  }

  // sustained drone cluster
  drone({ out, freqs = [55, 82.5], type = 'sawtooth', gain = 0.08, detune = 6, filter = 420, q = 3 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(gain, t, 1.4);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    f.Q.value = q;
    f.connect(g);
    g.connect(out);
    const oscs = [];
    freqs.forEach((hz, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz;
      o.detune.value = (i % 2 ? 1 : -1) * detune * (1 + i * 0.3);
      const og = ctx.createGain();
      og.gain.value = 0.5 / (i + 1);
      o.connect(og).connect(f);
      o.start(t);
      this.track(o);
      oscs.push(o);
    });
    // slow filter breathing
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05 + Math.random() * 0.06;
    const lg = ctx.createGain();
    lg.gain.value = filter * 0.35;
    lfo.connect(lg).connect(f.frequency);
    lfo.start(t);
    this.track(lfo);
    return { g, f, oscs };
  }

  // one-shot tone
  tone({
    out,
    freq = 440,
    type = 'sine',
    t = null,
    dur = 0.3,
    gain = 0.15,
    attack = 0.004,
    filterType = null,
    filterFreq = 2400,
    q = 1,
    glide = 0,
    pan = 0,
  }) {
    const ctx = this.ctx;
    const at = t ?? ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(24, freq * glide), at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    let head = o;
    if (filterType) {
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = filterFreq;
      f.Q.value = q;
      o.connect(f);
      head = f;
    }
    head.connect(g);
    let outNode = g;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      outNode = p;
    }
    outNode.connect(out);
    o.start(at);
    o.stop(at + dur + 0.05);
    return o;
  }

  // one-shot filtered noise burst (hits, clacks, clanks)
  burst({
    out,
    t = null,
    kind = 'white',
    filterType = 'bandpass',
    freq = 1200,
    q = 2,
    dur = 0.12,
    gain = 0.2,
    attack = 0.002,
    pan = 0,
    sweep = 0,
  }) {
    const ctx = this.ctx;
    const at = t ?? ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.noise(kind);
    s.playbackRate.value = 0.6 + Math.random() * 0.9;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, at);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * sweep), at + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    let outNode = s.connect(f).connect(g);
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      outNode = g.connect(p);
    }
    outNode.connect(out);
    s.start(at, Math.random() * 2, dur + 0.1);
    return s;
  }

  // kick / sub thump
  thump({ out, t = null, freq = 110, gain = 0.5, dur = 0.34, glide = 0.32 }) {
    return this.tone({
      out,
      t,
      freq,
      type: 'sine',
      dur,
      gain,
      attack: 0.006,
      glide,
    });
  }

  /* ---------------- scene management ---------------- */

  track(node) {
    this._nodes.push(node);
    return node;
  }

  playScene(patch) {
    if (!this.ctx) return;
    if (this.scene && this.scene.id === patch.id) return;
    this.stopScene();
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.setTargetAtTime(4.0 * (TRIM[patch.id] ?? 1), ctx.currentTime, 0.45);
    out.connect(this.bus);

    this._nodes = [];
    const sc = patch.build(this, out);
    sc.id = patch.id;
    sc.out = out;
    this.scene = sc;
    this.step = 0;
    this.nextStepTime = ctx.currentTime + 0.06;
    if (sc.macro) sc.macro(this.brightness, this.hour ?? 22);
    if (this.onSceneChange) this.onSceneChange(patch.id);
  }

  stopScene(fade = 0.7) {
    if (!this.scene) return;
    const sc = this.scene;
    const ctx = this.ctx;
    this.scene = null;
    try {
      sc.out.gain.cancelScheduledValues(ctx.currentTime);
      sc.out.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 3);
    } catch {
      /* noop */
    }
    const nodes = this._nodes;
    this._nodes = [];
    setTimeout(
      () => {
        try {
          sc.dispose?.();
          nodes.forEach((n) => {
            try {
              n.stop?.();
            } catch {
              /* noop */
            }
            try {
              n.disconnect?.();
            } catch {
              /* noop */
            }
          });
          sc.out.disconnect();
        } catch {
          /* noop */
        }
      },
      fade * 1000 + 220,
    );
  }

  _tick() {
    if (!this.ctx || !this.scene) return;
    const ctx = this.ctx;
    const lookahead = ctx.currentTime + 0.14;
    const bpm = this.scene.bpm || 100;
    const stepDur = 60 / bpm / 4;
    let guard = 0;
    while (this.nextStepTime < lookahead && guard++ < 32) {
      try {
        this.scene.step?.(this, this.step, this.nextStepTime);
      } catch (err) {
        console.warn('step error', err);
      }
      this.step++;
      this.nextStepTime += stepDur;
    }
  }

  /* ---------------- analysis ---------------- */

  sample() {
    if (!this.analyser) return 0;
    this.analyser.getByteTimeDomainData(this._wave);
    let sum = 0;
    for (let i = 0; i < this._wave.length; i += 4) {
      const v = (this._wave[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / (this._wave.length / 4));
    this.level = this.level * 0.82 + rms * 0.18;
    this.peak = Math.max(this.peak * 0.94, this.level);
    return this.level;
  }

  wave() {
    if (!this.analyser) return null;
    this.analyser.getByteTimeDomainData(this._wave);
    return this._wave;
  }

  spectrum() {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this._freq);
    return this._freq;
  }

  db() {
    const v = this.level;
    if (v <= 0.0005) return -60;
    return Math.max(-60, Math.round(20 * Math.log10(v)));
  }
}

export const audio = new SonopolisAudio();

// handy debug handle (and useful for anyone poking at the engine in devtools)
if (typeof window !== 'undefined') window.__sonopolis = audio;
