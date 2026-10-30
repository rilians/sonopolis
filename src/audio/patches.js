/* ============================================================
   THE AMBIENCE BANK — ten hand-tuned generative soundscapes.
   Each patch = a few looping beds + a 16th-note step function.
   ============================================================ */

import { midi } from './engine';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;

/* ------------------------------------------------------------ */
const arcade = {
  id: 'arcade',
  bpm: 132,
  build(e, out) {
    e.bed({ out, kind: 'white', filterType: 'highpass', freq: 3200, q: 0.5, gain: 0.045, lfoRate: 0.2, lfoDepth: 0.3 });
    e.drone({ out, freqs: [55, 110], type: 'sawtooth', gain: 0.045, filter: 480, q: 2 });
    const scale = [60, 63, 65, 67, 70, 72, 75, 79];
    let bar = 0;
    return {
      bpm: 132,
      step(e, i, t) {
        const s = i % 16;
        if (s % 2 === 0 && chance(0.55)) {
          e.tone({
            out,
            t,
            freq: midi(pick(scale) + (chance(0.2) ? 12 : 0)),
            type: 'square',
            dur: rnd(0.07, 0.13),
            gain: 0.035,
            filterType: 'lowpass',
            filterFreq: 4200,
            pan: rnd(-0.7, 0.7),
          });
        }
        if (s === 0 && chance(0.45)) {
          e.tone({ out, t, freq: midi(48), type: 'square', dur: 0.16, gain: 0.05, filterType: 'lowpass', filterFreq: 900 });
        }
        if (s === 8 && chance(0.3)) {
          // coin logic
          e.tone({ out, t, freq: 988, type: 'square', dur: 0.06, gain: 0.05 });
          e.tone({ out, t: t + 0.07, freq: 1319, type: 'square', dur: 0.18, gain: 0.05 });
        }
        if (s === 14 && chance(0.12)) {
          [70, 67, 63].forEach((n, k) =>
            e.tone({ out, t: t + k * 0.09, freq: midi(n), type: 'square', dur: 0.1, gain: 0.04 })
          );
        }
        if (s === 0) bar++;
      },
    };
  },
};

/* ------------------------------------------------------------ */
const market = {
  id: 'market',
  bpm: 88,
  build(e, out) {
    const rain = e.bed({ out, kind: 'pink', filterType: 'highpass', freq: 900, q: 0.4, gain: 0.13, lfoRate: 0.09, lfoDepth: 0.25 });
    const tram = e.bed({ out, kind: 'brown', filterType: 'lowpass', freq: 190, q: 1, gain: 0.12, lfoRate: 0.04, lfoDepth: 0.4 });
    e.bed({ out, kind: 'pink', filterType: 'bandpass', freq: 520, q: 0.9, gain: 0.06, lfoRate: 0.15, lfoDepth: 0.5 });
    return {
      bpm: 88,
      macro(b) {
        rain.g.gain.setTargetAtTime(0.06 + b * 0.06, e.ctx.currentTime, 1.2);
        tram.g.gain.setTargetAtTime(0.14 - b * 0.06, e.ctx.currentTime, 1.2);
      },
      step(e, i, t) {
        const s = i % 16;
        if (chance(0.4)) {
          e.burst({
            out,
            t: t + rnd(0, 0.1),
            kind: 'pink',
            filterType: 'bandpass',
            freq: rnd(320, 1100),
            q: rnd(1.5, 5),
            dur: rnd(0.08, 0.24),
            gain: rnd(0.03, 0.075),
            pan: rnd(-0.85, 0.85),
          });
        }
        if (s === 0 && chance(0.2)) {
          e.tone({ out, t, freq: 1480, type: 'sine', dur: 0.5, gain: 0.035, pan: -0.4 });
          e.tone({ out, t, freq: 2220, type: 'sine', dur: 0.42, gain: 0.022, pan: -0.4 });
        }
        if (s === 6 && chance(0.25)) {
          // crates / coin counting
          e.burst({ out, t, kind: 'white', filterType: 'bandpass', freq: 2400, q: 3, dur: 0.05, gain: 0.05, pan: rnd(-0.5, 0.5) });
        }
      },
    };
  },
};

/* ------------------------------------------------------------ */
const transit = {
  id: 'transit',
  bpm: 96,
  build(e, out) {
    e.bed({ out, kind: 'brown', filterType: 'lowpass', freq: 230, q: 1.2, gain: 0.16, lfoRate: 0.07, lfoDepth: 0.45 });
    e.drone({ out, freqs: [100, 150], type: 'sawtooth', gain: 0.028, filter: 780, q: 2 });
    e.bed({ out, kind: 'white', filterType: 'bandpass', freq: 4200, q: 0.8, gain: 0.028, lfoRate: 0.3, lfoDepth: 0.4 });
    let announced = false;
    return {
      bpm: 96,
      step(e, i, t) {
        const s = i % 16;
        // the rails
        if (s % 4 === 0) {
          e.burst({ out, t, kind: 'white', filterType: 'bandpass', freq: 1750, q: 4, dur: 0.07, gain: 0.075, pan: s === 0 ? -0.5 : 0.5 });
          e.burst({ out, t: t + 0.085, kind: 'white', filterType: 'bandpass', freq: 1450, q: 5, dur: 0.06, gain: 0.055, pan: s === 0 ? 0.5 : -0.5 });
        }
        if (s === 12 && chance(0.5)) {
          e.burst({ out, t, kind: 'brown', filterType: 'lowpass', freq: 300, q: 1, dur: 0.9, gain: 0.09, attack: 0.28 });
        }
        // platform announcement motif, rarely
        if (s === 4 && !announced && chance(0.35)) {
          announced = true;
          const notes = [74, 71, 79];
          notes.forEach((n, k) =>
            e.tone({
              out,
              t: t + k * 0.22,
              freq: midi(n),
              type: 'triangle',
              dur: 0.5,
              gain: 0.03,
              filterType: 'bandpass',
              filterFreq: 1100,
              q: 3,
            })
          );
        }
        if (s === 15) announced = false;
      },
    };
  },
};

/* ------------------------------------------------------------ */
const docks = {
  id: 'docks',
  bpm: 64,
  build(e, out) {
    const waves = e.bed({ out, kind: 'brown', filterType: 'lowpass', freq: 460, q: 0.8, gain: 0.2, lfoRate: 0.055, lfoDepth: 0.55 });
    const hiss = e.bed({ out, kind: 'pink', filterType: 'highpass', freq: 2600, q: 0.4, gain: 0.05, lfoRate: 0.11, lfoDepth: 0.7 });
    e.drone({ out, freqs: [41.2, 61.7], type: 'sine', gain: 0.05, filter: 220, q: 1 });
    let bar = 0;
    return {
      bpm: 64,
      macro(b) {
        waves.g.gain.setTargetAtTime(0.16 + (1 - b) * 0.08, e.ctx.currentTime, 1.5);
        hiss.g.gain.setTargetAtTime(0.03 + b * 0.03, e.ctx.currentTime, 1.5);
      },
      step(e, i, t) {
        const s = i % 16;
        if (chance(0.14)) {
          e.burst({ out, t, kind: 'pink', filterType: 'bandpass', freq: rnd(1800, 4200), q: 6, dur: rnd(0.05, 0.14), gain: 0.05, pan: rnd(-0.9, 0.9) });
        }
        if (s === 0) {
          bar++;
          if (bar % 8 === 0) {
            // foghorn
            e.tone({ out, t, freq: 62, type: 'sawtooth', dur: 2.6, gain: 0.13, attack: 0.35, filterType: 'lowpass', filterFreq: 420, q: 2 });
            e.tone({ out, t: t + 0.04, freq: 93, type: 'triangle', dur: 2.4, gain: 0.05, attack: 0.4 });
          }
          if (bar % 8 === 5) {
            // gull
            e.tone({ out, t, freq: 1180, type: 'sine', dur: 0.16, gain: 0.03, glide: 1.4, pan: rnd(-0.8, 0.8) });
            e.tone({ out, t: t + 0.2, freq: 1080, type: 'sine', dur: 0.2, gain: 0.025, glide: 1.5, pan: rnd(-0.8, 0.8) });
          }
        }
        if (s === 10 && chance(0.3)) {
          e.burst({ out, t, kind: 'white', filterType: 'bandpass', freq: 900, q: 2, dur: 0.35, gain: 0.04, attack: 0.1 });
        }
      },
    };
  },
};

/* ------------------------------------------------------------ */
const uplink = {
  id: 'uplink',
  bpm: 72,
  build(e, out) {
    e.bed({ out, kind: 'white', filterType: 'bandpass', freq: 1350, q: 0.7, gain: 0.05, lfoRate: 0.06, lfoDepth: 0.2 });
    e.drone({ out, freqs: [50, 100, 150, 200], type: 'sine', gain: 0.05, filter: 900, q: 1 });
    e.drone({ out, freqs: [130.8, 196, 261.6], type: 'sawtooth', gain: 0.022, filter: 620, q: 4 });
    return {
      bpm: 72,
      step(e, i, t) {
        const s = i % 16;
        if (chance(0.5)) {
          // packets
          e.tone({
            out,
            t: t + rnd(0, 0.12),
            freq: rnd(1800, 5200),
            type: 'sine',
            dur: rnd(0.015, 0.045),
            gain: rnd(0.014, 0.04),
            pan: rnd(-0.9, 0.9),
          });
        }
        if (s === 8 && chance(0.3)) {
          e.tone({ out, t, freq: 120, type: 'square', dur: 0.06, gain: 0.03, filterType: 'lowpass', filterFreq: 700 });
        }
        if (s === 0 && chance(0.4)) {
          e.tone({ out, t, freq: rnd(220, 440), type: 'triangle', dur: 2.4, gain: 0.02, attack: 0.6, filterType: 'lowpass', filterFreq: 900 });
        }
      },
    };
  },
};

/* ------------------------------------------------------------ */
const rooftop = {
  id: 'rooftop',
  bpm: 70,
  build(e, out) {
    const wind = e.bed({ out, kind: 'white', filterType: 'bandpass', freq: 620, q: 0.9, gain: 0.1, lfoRate: 0.045, sweep: 460 });
    e.bed({ out, kind: 'pink', filterType: 'highpass', freq: 3000, q: 0.4, gain: 0.035, lfoRate: 0.09, lfoDepth: 0.6 });
    e.drone({ out, freqs: [100, 200], type: 'sine', gain: 0.025, filter: 1400, q: 1 });
    let bar = 0;
    return {
      bpm: 70,
      macro(b) {
        wind.g.gain.setTargetAtTime(0.06 + b * 0.08, e.ctx.currentTime, 1.4);
      },
      step(e, i, t) {
        const s = i % 16;
        if (s === 0) {
          bar++;
          if (bar % 6 === 3) {
            e.tone({ out, t, freq: 180, type: 'sine', dur: 0.4, gain: 0.035, glide: 1.6 });
            e.tone({ out, t: t + 0.5, freq: 240, type: 'sine', dur: 0.5, gain: 0.03, glide: 0.7 });
          }
          if (bar % 6 === 4) {
            // distant siren
            e.tone({ out, t, freq: 330, type: 'triangle', dur: 2.8, gain: 0.022, attack: 0.7, glide: 1.5, pan: rnd(-0.7, 0.7) });
          }
        }
        if (chance(0.18)) {
          e.burst({ out, t, kind: 'white', filterType: 'bandpass', freq: rnd(1600, 3600), q: 8, dur: rnd(0.04, 0.12), gain: rnd(0.02, 0.05), pan: rnd(-0.9, 0.9) });
        }
        if (s === 10 && chance(0.25)) {
          // carrier tone test
          e.tone({ out, t, freq: 1000, type: 'sine', dur: 0.4, gain: 0.03 });
        }
      },
    };
  },
};

/* ------------------------------------------------------------ */
const noodle = {
  id: 'noodle',
  bpm: 92,
  build(e, out) {
    const sizzle = e.bed({ out, kind: 'white', filterType: 'highpass', freq: 4200, q: 0.5, gain: 0.07, lfoRate: 7.5, lfoDepth: 0.55 });
    e.bed({ out, kind: 'pink', filterType: 'bandpass', freq: 380, q: 0.8, gain: 0.09, lfoRate: 0.2, lfoDepth: 0.4 });
    e.drone({ out, freqs: [73.4, 110], type: 'triangle', gain: 0.03, filter: 320, q: 1 });
    let bar = 0;
    return {
      bpm: 92,
      step(e, i, t) {
        const s = i % 16;
        if (chance(0.35)) {
          e.burst({ out, t, kind: 'white', filterType: 'bandpass', freq: rnd(2600, 6200), q: 2, dur: rnd(0.03, 0.07), gain: rnd(0.02, 0.055), pan: rnd(-0.5, 0.5) });
        }
        if (s === 0) {
          bar++;
          if (bar % 4 === 0) {
            e.burst({ out, t, kind: 'pink', filterType: 'bandpass', freq: 2400, q: 3, dur: 0.09, gain: 0.05, pan: 0.4 });
          }
          if (bar % 8 === 2) {
            e.tone({ out, t, freq: 2093, type: 'sine', dur: 0.9, gain: 0.018, pan: -0.4 });
            e.tone({ out, t, freq: 3136, type: 'sine', dur: 0.7, gain: 0.01, pan: -0.4 });
          }
        }
        if (s === 6 && chance(0.3)) {
          e.tone({ out, t, freq: rnd(240, 420), type: 'triangle', dur: 0.32, gain: 0.025, filterType: 'bandpass', filterFreq: 800, q: 4, pan: rnd(-0.6, 0.6) });
        }
        if (chance(0.05)) sizzle.g.gain.setTargetAtTime(0.11, t, 0.05);
      },
    };
  },
};

/* ------------------------------------------------------------ */
const sublevel = {
  id: 'sublevel',
  bpm: 124,
  build(e, out) {
    e.drone({ out, freqs: [41.2, 82.4], type: 'sawtooth', gain: 0.05, filter: 260, q: 3 });
    e.bed({ out, kind: 'pink', filterType: 'bandpass', freq: 2400, q: 0.8, gain: 0.02, lfoRate: 0.12, lfoDepth: 0.6 });
    const pattern = [0, 0, 12, 0, 0, 7, 0, 3];
    return {
      bpm: 124,
      step(e, i, t) {
        const s = i % 16;
        if (s % 4 === 0) {
          e.thump({ out, t, freq: 120, gain: 0.42, dur: 0.32, glide: 0.28 });
        }
        if (s === 4 || s === 12) {
          e.burst({ out, t, kind: 'white', filterType: 'highpass', freq: 5200, q: 0.7, dur: 0.14, gain: 0.09 });
        }
        if (s % 2 === 1) {
          e.burst({ out, t, kind: 'white', filterType: 'highpass', freq: 8200, q: 0.8, dur: 0.035, gain: 0.045, pan: 0.3 });
        }
        if (s % 2 === 0) {
          const n = pattern[(s / 2) % pattern.length] + 28;
          e.tone({
            out,
            t,
            freq: midi(n),
            type: 'sawtooth',
            dur: 0.16,
            gain: 0.11,
            filterType: 'lowpass',
            filterFreq: 420 + (bar % 4) * 120,
            q: 6,
            glide: 0.92,
          });
        }
        if (s === 14 && bar % 8 === 7) {
          // riser
          e.tone({ out, t, freq: 180, type: 'sawtooth', dur: 1.2, gain: 0.05, glide: 6, filterType: 'lowpass', filterFreq: 3200, q: 5 });
        }
      },
    };
  },
};

/* ------------------------------------------------------------ */
const greenhouse = {
  id: 'greenhouse',
  bpm: 76,
  build(e, out) {
    e.bed({ out, kind: 'pink', filterType: 'lowpass', freq: 1500, q: 0.6, gain: 0.07, lfoRate: 0.05, lfoDepth: 0.3 });
    const bug = e.bed({ out, kind: 'white', filterType: 'bandpass', freq: 5200, q: 6, gain: 0.02, lfoRate: 11, lfoDepth: 0.9 });
    e.drone({ out, freqs: [196, 261.6, 392], type: 'sine', gain: 0.022, filter: 1200, q: 1 });
    return {
      bpm: 76,
      macro(b) {
        bug.g.gain.setTargetAtTime(0.006 + (1 - b) * 0.03, e.ctx.currentTime, 1.2);
      },
      step(e, i, t) {
        const s = i % 16;
        if (chance(0.34)) {
          // water drip
          e.tone({
            out,
            t: t + rnd(0, 0.2),
            freq: rnd(880, 1900),
            type: 'sine',
            dur: rnd(0.1, 0.22),
            gain: rnd(0.02, 0.055),
            glide: 0.55,
            pan: rnd(-0.8, 0.8),
          });
        }
        if (chance(0.3)) {
          // insects
          const f = rnd(3400, 6200);
          [0, 0.045, 0.09].forEach((d) =>
            e.tone({ out, t: t + d, freq: f, type: 'sine', dur: 0.03, gain: 0.012, pan: rnd(-0.9, 0.9) })
          );
        }
        if (s === 0 && chance(0.22)) {
          e.tone({ out, t, freq: midi(72), type: 'triangle', dur: 1.6, gain: 0.016, attack: 0.3, filterType: 'lowpass', filterFreq: 1400 });
        }
      },
    };
  },
};

/* ------------------------------------------------------------ */
const signals = {
  id: 'signals',
  bpm: 108,
  build(e, out) {
    e.bed({ out, kind: 'white', filterType: 'bandpass', freq: 2200, q: 1.4, gain: 0.03, lfoRate: 0.08, lfoDepth: 0.5 });
    e.drone({ out, freqs: [130.8, 65.4], type: 'sawtooth', gain: 0.028, filter: 700, q: 2 });
    let msg = '... --- -. --- .--. --- .-.. .. ... ';
    let idx = 0;
    return {
      bpm: 108,
      step(e, i, t) {
        const s = i % 16;
        if (s % 2 === 0) {
          const ch = msg[idx % msg.length];
          idx++;
          if (ch === '.') e.tone({ out, t, freq: 760, type: 'sine', dur: 0.07, gain: 0.055 });
          if (ch === '-') e.tone({ out, t, freq: 760, type: 'sine', dur: 0.2, gain: 0.055 });
          if (ch === ' ' && chance(0.3)) {
            e.burst({ out, t, kind: 'white', filterType: 'bandpass', freq: rnd(1600, 3400), q: 4, dur: 0.1, gain: 0.05 });
          }
        }
        if (chance(0.06)) {
          e.tone({ out, t, freq: rnd(600, 1400), type: 'triangle', dur: 1.1, gain: 0.02, attack: 0.4, glide: rnd(0.7, 1.4), pan: rnd(-0.9, 0.9) });
        }
      },
    };
  },
};

export const PATCHES = { arcade, market, transit, docks, uplink, rooftop, noodle, sublevel, greenhouse, signals };
