import { makeRng } from '../lib/prng';
import {
  insidePolygon,
  polygonCentroid,
  voronoiCells,
  distToPath,
  segmentRuns,
  rot,
  clamp,
  closeRing,
} from '../lib/geo';

/* ------------------------------------------------------------------
   SONOPOLIS — a fictional coastal city, generated deterministically.
   Everything is hand-modelled GeoJSON so the app runs with zero
   network access (no tile server, no glyph server, no CDN).
-------------------------------------------------------------------*/

const CENTER = [12.4095, 41.9005];

export const DISTRICTS = [
  { id: 'old-grid', name: 'OLD GRID', code: 'A1', seed: [12.3775, 41.9185], tone: 'warm' },
  { id: 'neon-mile', name: 'NEON MILE', code: 'A2', seed: [12.4042, 41.9215], tone: 'hot' },
  { id: 'uplink', name: 'UPLINK', code: 'A3', seed: [12.4335, 41.9182], tone: 'cold' },
  { id: 'dockside', name: 'DOCKSIDE', code: 'B4', seed: [12.4505, 41.8765], tone: 'cold' },
  { id: 'lowtown', name: 'LOWTOWN', code: 'B1', seed: [12.3745, 41.8845], tone: 'warm' },
  { id: 'spine', name: 'THE SPINE', code: 'B2', seed: [12.4088, 41.8955], tone: 'hot' },
  { id: 'garden', name: 'GARDEN 04', code: 'C2', seed: [12.4395, 41.8925], tone: 'cold' },
  { id: 'static-yard', name: 'STATIC YARD', code: 'C1', seed: [12.3948, 41.8665], tone: 'warm' },
];

/* --- the coastline: an irregular blob with a bay bitten out of the SE --- */
function makeBoundary(rng) {
  const pts = [];
  const n = 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const wob = 0.74 + 0.3 * rng.next() + 0.12 * Math.sin(a * 3.1) + 0.07 * Math.sin(a * 7.7);
    let rx = 0.083 * wob;
    let ry = 0.048 * wob;
    // flatten the south-east so the bay can cut in
    if (Math.cos(a) > 0.35 && Math.sin(a) > 0.2) ry *= 0.82;
    pts.push([CENTER[0] + Math.cos(a) * rx, CENTER[1] + Math.sin(a) * ry]);
  }
  return pts;
}

/* --- the bay + the river that feeds it --- */
const BAY = [
  [12.4655, 41.8585],
  [12.4725, 41.8805],
  [12.4805, 41.9005],
  [12.4935, 41.9215],
  [12.5155, 41.9385],
  [12.5345, 41.9565],
  [12.5345, 41.8215],
  [12.4995, 41.8235],
  [12.4795, 41.8375],
  [12.4695, 41.8475],
];

export const RIVER = [
  [12.3265, 41.9475],
  [12.3485, 41.9335],
  [12.3655, 41.9185],
  [12.3795, 41.9045],
  [12.3995, 41.8955],
  [12.4185, 41.8885],
  [12.4385, 41.8845],
  [12.4565, 41.8795],
  [12.4715, 41.8725],
  [12.4805, 41.8665],
];

const inWater = (p) => insidePolygon(p, BAY) || distToPath(p, RIVER) < 0.0052;

export function buildCity() {
  const rng = makeRng(20261031);
  const boundary = makeBoundary(rng);
  const seeds = DISTRICTS.map((d) => d.seed);
  const cells = voronoiCells(seeds, boundary);

  const districts = DISTRICTS.map((d, i) => ({
    ...d,
    coords: cells[i],
    centroid: polygonCentroid(cells[i]),
  })).filter((d) => d.coords.length > 2);

  /* ---------------- city blocks ---------------- */
  const blockFeatures = [];
  districts.forEach((d, di) => {
    const angle = (di % 2 === 0 ? 1 : -1) * (0.18 + di * 0.09) + 0.35;
    const cellX = 0.0032;
    const cellY = 0.0021;
    const cx = d.centroid[0];
    const cy = d.centroid[1];
    for (let gx = -22; gx <= 22; gx++) {
      for (let gy = -20; gy <= 20; gy++) {
        const base = [cx + gx * cellX, cy + gy * cellY];
        const p = rot(base, [cx, cy], angle);
        if (!insidePolygon(p, d.coords)) continue;
        if (!insidePolygon(p, boundary)) continue;
        if (inWater(p)) continue;
        const w = cellX * rng.range(0.52, 0.86);
        const h = cellY * rng.range(0.5, 0.88);
        const ox = rng.range(-0.00035, 0.00035);
        const oy = rng.range(-0.00025, 0.00025);
        const corners = [
          [-w / 2, -h / 2],
          [w / 2, -h / 2],
          [w / 2, h / 2],
          [-w / 2, h / 2],
        ].map(([dx, dy]) => {
          const q = rot([base[0] + dx + ox, base[1] + dy + oy], [cx, cy], angle);
          return q;
        });
        const c = polygonCentroid(corners);
        const dist = Math.hypot(c[0] - CENTER[0], c[1] - CENTER[1]);
        const core = clamp(1 - dist / 0.075, 0, 1);
        const tall = rng.chance(0.06 + core * 0.16);
        const height = tall ? rng.range(55, 130) * (0.5 + core) : rng.range(8, 34);
        blockFeatures.push({
          type: 'Feature',
          properties: {
            district: d.id,
            h: Math.round(height),
            heat: +clamp(core * 0.7 + rng.next() * 0.5, 0, 1).toFixed(3),
            grain: +rng.next().toFixed(3),
          },
          geometry: { type: 'Polygon', coordinates: [closeRing(corners)] },
        });
      }
    }
  });

  /* ---------------- street network ---------------- */
  const streetLines = [];
  districts.forEach((d, di) => {
    const angle = (di % 2 === 0 ? 1 : -1) * (0.18 + di * 0.09) + 0.35;
    const cx = d.centroid[0];
    const cy = d.centroid[1];
    const cellX = 0.0032;
    const cellY = 0.0021;
    const test = (p) => insidePolygon(p, boundary) && !inWater(p);
    // longitudinal streets (run along Y) + cross streets
    for (let gx = -22; gx <= 22; gx++) {
      const x = cx + (gx + 0.5) * cellX;
      const a = rot([x, cy - 20 * cellY], [cx, cy], angle);
      const b = rot([x, cy + 20 * cellY], [cx, cy], angle);
      const runs = segmentRuns(a, b, test, 48);
      runs.forEach((r) => streetLines.push({ coords: r, kind: 'grid', weight: 0.42 }));
    }
    for (let gy = -20; gy <= 20; gy++) {
      const y = cy + (gy + 0.5) * cellY;
      const a = rot([cx - 22 * cellX, y], [cx, cy], angle);
      const b = rot([cx + 22 * cellX, y], [cx, cy], angle);
      const runs = segmentRuns(a, b, test, 48);
      runs.forEach((r) => streetLines.push({ coords: r, kind: 'grid', weight: 0.42 }));
    }
  });

  /* ---------------- arterials: the elevated spine + ring ---------------- */
  const arterials = [];
  const centrePoint = [12.4095, 41.8965];
  districts.forEach((d) => {
    const a = centrePoint;
    const b = d.seed;
    // a gentle S-curve so it doesn't look like a spider web
    const mid = [(a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.28, (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.12];
    const test = (p) => insidePolygon(p, boundary) && !inWater(p);
    const step = 40;
    let cur = [];
    for (let i = 0; i <= step; i++) {
      const t = i / step;
      const p = [
        (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * mid[0] + t * t * b[0],
        (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * mid[1] + t * t * b[1],
      ];
      if (test(p)) cur.push(p);
      else if (cur.length > 1) {
        arterials.push({ coords: cur, kind: 'spine', weight: 1.6 });
        cur = [];
      } else cur = [];
    }
    if (cur.length > 1) arterials.push({ coords: cur, kind: 'spine', weight: 1.6 });
  });

  // ring road
  const ring = [];
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const r = 0.0305 + 0.004 * Math.sin(t * 5) + 0.0022 * Math.cos(t * 9);
    ring.push([CENTER[0] + Math.cos(t) * r * 1.34, CENTER[1] + Math.sin(t) * r]);
  }
  const ringTest = (p) => insidePolygon(p, boundary) && !inWater(p);
  let run = [];
  ring.forEach((p) => {
    if (ringTest(p)) run.push(p);
    else {
      if (run.length > 2) arterials.push({ coords: run, kind: 'ring', weight: 1.15 });
      run = [];
    }
  });
  if (run.length > 2) arterials.push({ coords: run, kind: 'ring', weight: 1.15 });

  const lineFeature = (l) => ({
    type: 'Feature',
    properties: { kind: l.kind, w: l.weight },
    geometry: { type: 'LineString', coordinates: l.coords },
  });

  /* ---------------- transit spine (monorail) ---------------- */
  const monorail = [
    [12.3565, 41.9315],
    [12.3805, 41.9185],
    [12.4045, 41.9085],
    [12.4265, 41.9025],
    [12.4465, 41.8935],
    [12.4665, 41.8815],
  ];

  return {
    center: CENTER,
    boundary: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [closeRing(boundary)] },
    },
    water: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [closeRing(BAY)] },
    },
    river: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: RIVER },
    },
    monorail: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: monorail },
    },
    districts: {
      type: 'FeatureCollection',
      features: districts.map((d) => ({
        type: 'Feature',
        properties: { id: d.id, name: d.name, code: d.code, tone: d.tone },
        geometry: { type: 'Polygon', coordinates: [closeRing(d.coords)] },
      })),
    },
    blocks: { type: 'FeatureCollection', features: blockFeatures },
    streets: {
      type: 'FeatureCollection',
      features: [
        ...streetLines.map(lineFeature),
        ...arterials.map(lineFeature),
      ],
    },
    districtMeta: districts,
  };
}

/* ------------------------------------------------------------------
   SONIC BEACONS
-------------------------------------------------------------------*/
export const LOCATIONS = [
  {
    id: 'arcade',
    name: 'NEON ARCADE',
    sub: 'Kiosk 7 · Game Hall',
    district: 'neon-mile',
    coord: [12.4075, 41.9235],
    patch: 'arcade',
    bpm: 132,
    sig: 'CABINET HUM / COIN LOGIC',
    desc: 'Forty cabinets, one power strip. The floor is sticky with sugar and the air is a wall of unresolved arpeggios.',
    tag: 'COMMERCE',
  },
  {
    id: 'market',
    name: 'RAIN MARKET',
    sub: 'Aisle 12 · Wet Deck',
    district: 'old-grid',
    coord: [12.3752, 41.9165],
    patch: 'market',
    bpm: 88,
    sig: 'PRECIPITATION / HUMAN CHORUS',
    desc: 'A canopy of tarpaulin and a thousand overlapping transactions. Rain gets in through the middle of everything.',
    tag: 'COMMONS',
  },
  {
    id: 'transit',
    name: 'TRANSIT SPINE',
    sub: 'Platform 4 · Monorail',
    district: 'spine',
    coord: [12.4092, 41.9072],
    patch: 'transit',
    bpm: 96,
    sig: 'RAIL CLACK / VENTILATION',
    desc: 'The city’s only artery. Trains arrive every ninety seconds and the concrete remembers all of them.',
    tag: 'MOBILITY',
  },
  {
    id: 'docks',
    name: 'RUST DOCKS',
    sub: 'Berth 9 · Container Yard',
    district: 'dockside',
    coord: [12.4622, 41.8805],
    patch: 'docks',
    bpm: 64,
    sig: 'SURGE / FOGHORN',
    desc: 'Water against steel, steel against water. Fog signals roll in from somewhere further out than the map goes.',
    tag: 'INFRA',
  },
  {
    id: 'uplink',
    name: 'UPLINK CATHEDRAL',
    sub: 'Sub-level 2 · Server Nave',
    district: 'uplink',
    coord: [12.4372, 41.9212],
    patch: 'uplink',
    bpm: 72,
    sig: 'FAN ARRAY / DATA CHORALE',
    desc: 'Fourteen thousand machines praying in a cold room. You can hear the packets if you stand still long enough.',
    tag: 'DATA',
  },
  {
    id: 'rooftop',
    name: 'STATIC ROOFTOP',
    sub: 'Tower 21 · Antenna Deck',
    district: 'lowtown',
    coord: [12.3708, 41.8882],
    patch: 'rooftop',
    bpm: 70,
    sig: 'WIND SHEAR / CARRIER TONE',
    desc: 'Eleven floors above the noise floor. The wind has a pitch, and the antennas answer it in a lower register.',
    tag: 'ELEVATION',
  },
  {
    id: 'noodle',
    name: 'BLACK NOODLE BAR',
    sub: 'Stall 3 · Back Alley',
    district: 'lowtown',
    coord: [12.3832, 41.8818],
    patch: 'noodle',
    bpm: 92,
    sig: 'WOK SIZZLE / LOW MURMUR',
    desc: 'Six stools, one fan, no sign. The broth has been on since before the district had a name.',
    tag: 'NOCTURNE',
  },
  {
    id: 'sublevel',
    name: 'SUBLEVEL 9',
    sub: 'Club · Unlicensed',
    district: 'static-yard',
    coord: [12.3972, 41.8692],
    patch: 'sublevel',
    bpm: 124,
    sig: 'SUBBASS / PRESSURE',
    desc: 'A room with no clock. The low end arrives through your feet about forty milliseconds before you hear it.',
    tag: 'AFTERHOURS',
  },
  {
    id: 'greenhouse',
    name: 'GREENHOUSE 04',
    sub: 'Sector C · Hydroponics',
    district: 'garden',
    coord: [12.4418, 41.8932],
    patch: 'greenhouse',
    bpm: 76,
    sig: 'DRIP / INSECT BAND',
    desc: 'The quietest square kilometre in the city — if you discount eleven thousand insects running a very tight set.',
    tag: 'BIOSPHERE',
  },
  {
    id: 'signals',
    name: 'TOWER OF SIGNALS',
    sub: 'Summit · Relay 88',
    district: 'uplink',
    coord: [12.4292, 41.9298],
    patch: 'signals',
    bpm: 108,
    sig: 'MORSE / SHORTWAVE',
    desc: 'The last tower that still speaks to the old network. It repeats the same eleven syllables, endlessly.',
    tag: 'BROADCAST',
  },
];

export const DISTRICT_BY_ID = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));

export function nearestDistrict(coord) {
  let best = DISTRICTS[0];
  let bd = Infinity;
  for (const d of DISTRICTS) {
    const dd = Math.hypot(coord[0] - d.seed[0], coord[1] - d.seed[1]);
    if (dd < bd) {
      bd = dd;
      best = d;
    }
  }
  return best;
}
