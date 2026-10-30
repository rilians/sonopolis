/* ============================================================
   THE COLOUR CLOCK — one hour-by-hour palette drives the map
   paint, the HUD chrome and the neon signage at once.
   ============================================================ */

const hex = (h) => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const toHex = (c) =>
  '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));

/* keyframes of the day */
const STOPS = [
  {
    h: 0,
    bg: '#04060c',
    water: '#04161f',
    district: '#080e16',
    block: '#0f1822',
    blockMid: '#1a2734',
    blockHot: '#2b4356',
    street: '#1f2f3d',
    arterial: '#22d9f5',
    accent: '#2ff0ff',
    accent2: '#ff2e7e',
    ink: '#e9f7ff',
    muted: '#6d889a',
    panel: 'rgba(5,9,15,0.74)',
    line: 'rgba(120,220,255,0.18)',
    haze: 'rgba(4,10,22,0.10)',
    name: 'NIGHT',
  },
  {
    h: 4.6,
    bg: '#05070f',
    water: '#061423',
    district: '#0a0d18',
    block: '#101726',
    blockMid: '#1b2439',
    blockHot: '#2c3a57',
    street: '#1a2338',
    arterial: '#3d7bff',
    accent: '#5b8dff',
    accent2: '#ff3f96',
    ink: '#e7eeff',
    muted: '#6f7f9c',
    panel: 'rgba(6,9,18,0.75)',
    line: 'rgba(120,170,255,0.18)',
    haze: 'rgba(6,12,30,0.12)',
    name: 'PRE-DAWN',
  },
  {
    h: 7.2,
    bg: '#2b2434',
    water: '#39404c',
    district: '#2d2839',
    block: '#332d40',
    blockMid: '#4c4055',
    blockHot: '#6b5560',
    street: '#6a5e70',
    arterial: '#ff9a6b',
    accent: '#ffb08a',
    accent2: '#ff5f8d',
    ink: '#fff2e9',
    muted: '#b7a5ad',
    panel: 'rgba(38,30,42,0.72)',
    line: 'rgba(255,205,190,0.22)',
    haze: 'rgba(255,150,120,0.10)',
    name: 'DAWN',
  },
  {
    h: 12,
    bg: '#c9c3b6',
    water: '#a8b5b3',
    district: '#c0b8a9',
    block: '#b0a696',
    blockMid: '#d6cdbb',
    blockHot: '#efe7d6',
    street: '#948a7b',
    arterial: '#c8401f',
    accent: '#c93f1c',
    accent2: '#77294f',
    ink: '#17150f',
    muted: '#5f584d',
    panel: 'rgba(224,218,205,0.78)',
    line: 'rgba(30,26,20,0.16)',
    haze: 'rgba(255,246,225,0.18)',
    name: 'NOON',
  },
  {
    h: 16.2,
    bg: '#c2ae92',
    water: '#9fadaa',
    district: '#bda98c',
    block: '#a89273',
    blockMid: '#cbb28c',
    blockHot: '#f0dcb4',
    street: '#8a7659',
    arterial: '#e2551b',
    accent: '#d94a17',
    accent2: '#7d2a4b',
    ink: '#221a10',
    muted: '#6b5d48',
    panel: 'rgba(210,196,172,0.78)',
    line: 'rgba(40,30,16,0.18)',
    haze: 'rgba(255,180,90,0.16)',
    name: 'AFTERNOON',
  },
  {
    h: 18.6,
    bg: '#2a1220',
    water: '#291a2c',
    district: '#241322',
    block: '#2c1826',
    blockMid: '#4e2131',
    blockHot: '#8a3341',
    street: '#6a3143',
    arterial: '#ff5a2e',
    accent: '#ff4f6d',
    accent2: '#ffb03a',
    ink: '#ffe9ef',
    muted: '#bd8b9d',
    panel: 'rgba(28,12,24,0.74)',
    line: 'rgba(255,140,150,0.22)',
    haze: 'rgba(255,80,60,0.14)',
    name: 'DUSK',
  },
  {
    h: 20.4,
    bg: '#08060f',
    water: '#0b0f22',
    district: '#0d0a17',
    block: '#101422',
    blockMid: '#1b2233',
    blockHot: '#2c3a52',
    street: '#26313f',
    arterial: '#59b6ff',
    accent: '#7fd0ff',
    accent2: '#ff3d8b',
    ink: '#f1e9ff',
    muted: '#8b7cab',
    panel: 'rgba(8,5,15,0.74)',
    line: 'rgba(190,140,255,0.20)',
    haze: 'rgba(60,20,90,0.14)',
    name: 'NIGHTFALL',
  },
  {
    h: 24,
    bg: '#04060c',
    water: '#04161f',
    district: '#080e16',
    block: '#0f1822',
    blockMid: '#1a2734',
    blockHot: '#2b4356',
    street: '#1f2f3d',
    arterial: '#22d9f5',
    accent: '#2ff0ff',
    accent2: '#ff2e7e',
    ink: '#e9f7ff',
    muted: '#6d889a',
    panel: 'rgba(5,9,15,0.74)',
    line: 'rgba(120,220,255,0.18)',
    haze: 'rgba(4,10,22,0.10)',
    name: 'NIGHT',
  },
];

const COLOR_KEYS = [
  'bg', 'water', 'district', 'block', 'blockMid', 'blockHot', 'street',
  'arterial', 'accent', 'accent2', 'ink', 'muted',
];
/* these are rgba() strings, interpolated channel-wise */
const RAW_KEYS = ['panel', 'line', 'haze'];

function parseRGBA(v) {
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 1];
  const p = m[1].split(',').map((s) => parseFloat(s));
  return [p[0], p[1], p[2], p[3] ?? 1];
}
function rgbaStr(c) {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${(c[3] ?? 1).toFixed(3)})`;
}

/* ---- legibility guard -------------------------------------
   the day/night crossfade passes through mid-tones where the
   hand-tuned ink would sit at ~3:1 on its own background, so
   the palette re-picks a legible ink whenever that happens. */
const LIGHT_INK = '#eef3ff';
const LIGHT_MUTED = '#93a4bd';
const DARK_INK = '#14120e';
const DARK_MUTED = '#5c5449';

const relLum = (h) => {
  const [r, g, b] = hex(h).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const l1 = relLum(a);
  const l2 = relLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

export function paletteAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < STOPS.length - 2 && STOPS[i + 1].h <= h) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const span = b.h - a.h || 1;
  const t = Math.max(0, Math.min(1, (h - a.h) / span));
  const out = {};
  for (const k of COLOR_KEYS) out[k] = mix(a[k], b[k], t);
  for (const k of RAW_KEYS) {
    const ca = parseRGBA(a[k]);
    const cb = parseRGBA(b[k]);
    out[k] = rgbaStr(ca.map((v, idx) => v + ((cb[idx] ?? 1) - v) * t));
  }
  const dark = relLum(out.bg) > 0.3;
  if (ratio(out.bg, out.ink) < 5.5) out.ink = dark ? DARK_INK : LIGHT_INK;
  if (ratio(out.bg, out.muted) < 2.6) out.muted = dark ? DARK_MUTED : LIGHT_MUTED;

  out.name = t < 0.5 ? a.name : b.name;
  out.hour = h;
  out.night = Math.max(0, Math.min(1, 1 - (0.5 + 0.5 * Math.cos(((h - 12) / 24) * Math.PI * 2)) * 1.15));
  return out;
}

export function phaseName(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h < 4.6) return 'NIGHT';
  if (h < 7.2) return 'PRE-DAWN';
  if (h < 10.5) return 'DAWN';
  if (h < 15.5) return 'NOON';
  if (h < 17.8) return 'AFTERNOON';
  if (h < 19.6) return 'DUSK';
  if (h < 21.5) return 'NIGHTFALL';
  return 'NIGHT';
}

export function fmtClock(hour) {
  const total = Math.round(((hour % 24) + 24) % 24 * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* write the palette into CSS custom properties so the whole HUD follows */
export function applyPaletteToRoot(p) {
  const r = document.documentElement.style;
  r.setProperty('--bg', p.bg);
  r.setProperty('--water', p.water);
  r.setProperty('--district', p.district);
  r.setProperty('--ink', p.ink);
  r.setProperty('--muted', p.muted);
  r.setProperty('--line', p.line);
  r.setProperty('--panel', p.panel);
  r.setProperty('--accent', p.accent);
  r.setProperty('--accent-2', p.accent2);
  r.setProperty('--arterial', p.arterial);
  r.setProperty('--haze', p.haze);
  document.documentElement.dataset.phase = p.name.toLowerCase().replace(/\s/g, '-');
}
