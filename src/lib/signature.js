/* ============================================================
   SONOPOLIS — SPECTRAL SIGNATURES
   Every district has a fixed spectral fingerprint: 18 bands,
   30 Hz → 16 kHz, normalised 0..1. It is drawn under the live
   analyser in the panel, printed on the dock plates, and used
   by the visualiser as a "ghost" reference shape — so a channel
   is recognisable even before it is switched on.
   ============================================================ */

export const BANDS = 18;

/* band centre frequencies (Hz), roughly logarithmic */
export const BAND_HZ = [
  30, 45, 65, 95, 140, 200, 290, 420, 600, 850, 1200, 1700, 2400, 3400, 4800,
  6800, 9600, 14000,
];

export const SIGNATURES = {
  /* cabinet hum + coin logic */
  arcade: [
    0.86, 0.74, 0.52, 0.34, 0.22, 0.18, 0.2, 0.3, 0.46, 0.56, 0.64, 0.52, 0.38,
    0.3, 0.44, 0.58, 0.36, 0.2,
  ],
  /* voiced crowd, cooked food, coin trays */
  market: [
    0.3, 0.42, 0.56, 0.68, 0.8, 0.88, 0.78, 0.66, 0.72, 0.82, 0.7, 0.55, 0.42,
    0.34, 0.26, 0.2, 0.16, 0.12,
  ],
  /* rail rhythm, steel on steel */
  transit: [
    0.62, 0.8, 0.9, 0.7, 0.5, 0.34, 0.28, 0.4, 0.54, 0.46, 0.3, 0.22, 0.18,
    0.24, 0.3, 0.22, 0.14, 0.1,
  ],
  /* hull resonance, chains, water slap */
  docks: [
    0.9, 0.82, 0.62, 0.44, 0.3, 0.26, 0.32, 0.38, 0.46, 0.58, 0.66, 0.6, 0.52,
    0.44, 0.5, 0.42, 0.3, 0.22,
  ],
  /* detuned choir, antenna air */
  uplink: [
    0.2, 0.26, 0.34, 0.4, 0.46, 0.56, 0.68, 0.78, 0.72, 0.62, 0.54, 0.6, 0.7,
    0.78, 0.66, 0.5, 0.38, 0.28,
  ],
  /* wind over the roof deck */
  rooftop: [
    0.24, 0.3, 0.36, 0.4, 0.46, 0.52, 0.58, 0.62, 0.66, 0.7, 0.72, 0.7, 0.66,
    0.6, 0.56, 0.5, 0.44, 0.38,
  ],
  /* rain on a tin roof, one electric kettle */
  noodle: [
    0.18, 0.22, 0.28, 0.3, 0.34, 0.38, 0.44, 0.52, 0.62, 0.74, 0.82, 0.86,
    0.8, 0.7, 0.6, 0.5, 0.42, 0.34,
  ],
  /* almost everything below 120 Hz */
  sublevel: [
    1, 0.92, 0.72, 0.5, 0.34, 0.24, 0.16, 0.12, 0.1, 0.12, 0.14, 0.1, 0.08,
    0.06, 0.06, 0.05, 0.04, 0.03,
  ],
  /* glass, water, leaves */
  greenhouse: [
    0.26, 0.36, 0.5, 0.62, 0.7, 0.64, 0.56, 0.5, 0.56, 0.64, 0.72, 0.66, 0.54,
    0.44, 0.36, 0.3, 0.24, 0.18,
  ],
  /* carriers, bursts, dead air between them */
  signals: [
    0.3, 0.2, 0.14, 0.3, 0.44, 0.26, 0.5, 0.34, 0.62, 0.28, 0.46, 0.2, 0.54,
    0.3, 0.18, 0.4, 0.24, 0.12,
  ],
};

const FLAT = new Array(BANDS).fill(0.25);

export const signatureOf = (patchId) => SIGNATURES[patchId] || FLAT;

/** resample a signature to n bars — used by the dock plates */
export function signatureBars(patchId, n = 14) {
  const sig = signatureOf(patchId);
  const out = [];
  for (let i = 0; i < n; i++) {
    const at = (i / (n - 1)) * (sig.length - 1);
    const lo = Math.floor(at);
    const hi = Math.min(sig.length - 1, lo + 1);
    const f = at - lo;
    out.push(sig[lo] * (1 - f) + sig[hi] * f);
  }
  return out;
}

/** strongest band of a signature, as a readable label */
export function dominantBand(patchId) {
  const sig = signatureOf(patchId);
  let best = 0;
  for (let i = 1; i < sig.length; i++) if (sig[i] > sig[best]) best = i;
  const hz = BAND_HZ[best];
  return hz >= 1000 ? `${(hz / 1000).toFixed(1).replace('.0', '')} kHz` : `${hz} Hz`;
}

/** how "spread" a signature is — 0 = one narrow peak, 1 = broadband */
export function bandwidth(patchId) {
  const sig = signatureOf(patchId);
  const mean = sig.reduce((a, b) => a + b, 0) / sig.length;
  const varc = sig.reduce((a, b) => a + (b - mean) ** 2, 0) / sig.length;
  const sd = Math.sqrt(varc);
  return Math.max(0, Math.min(1, 1 - sd * 3.2));
}
