/* tiny geometry toolbox — all coordinates are [lng, lat] */

export function insidePolygon(pt, poly) {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonCentroid(poly) {
  let sx = 0;
  let sy = 0;
  for (const p of poly) {
    sx += p[0];
    sy += p[1];
  }
  return [sx / poly.length, sy / poly.length];
}

/* clip polygon by half plane: keep the side where dot(p-normal, normal) <= offset */
function clipHalfPlane(poly, nx, ny, offset) {
  const out = [];
  const val = (p) => p[0] * nx + p[1] * ny - offset;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const va = val(a);
    const vb = val(b);
    if (va <= 0) out.push(a);
    if ((va <= 0) !== (vb <= 0)) {
      const t = va / (va - vb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

export function voronoiCells(seeds, boundary) {
  return seeds.map((s, i) => {
    let poly = boundary.map((p) => [p[0], p[1]]);
    for (let j = 0; j < seeds.length; j++) {
      if (i === j) continue;
      const o = seeds[j];
      const nx = o[0] - s[0];
      const ny = o[1] - s[1];
      const mx = (o[0] + s[0]) / 2;
      const my = (o[1] + s[1]) / 2;
      const offset = mx * nx + my * ny;
      poly = clipHalfPlane(poly, nx, ny, offset);
      if (poly.length < 3) break;
    }
    return poly;
  });
}

export function distToSegment(p, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = p[0] - a[0];
  const wy = p[1] - a[1];
  const len2 = vx * vx + vy * vy || 1e-12;
  let t = (wx * vx + wy * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = a[0] + vx * t - p[0];
  const dy = a[1] + vy * t - p[1];
  return Math.hypot(dx, dy);
}

export function distToPath(p, path) {
  let d = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    d = Math.min(d, distToSegment(p, path[i], path[i + 1]));
  }
  return d;
}

/* splits a segment into the sub-polylines that pass a predicate */
export function segmentRuns(a, b, test, steps = 26) {
  const runs = [];
  let cur = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    if (test(p)) {
      if (!cur) cur = [];
      cur.push(p);
    } else if (cur) {
      if (cur.length > 1) runs.push(cur);
      cur = null;
    }
  }
  if (cur && cur.length > 1) runs.push(cur);
  return runs;
}

export function rot(p, c, ang) {
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const x = p[0] - c[0];
  const y = p[1] - c[1];
  return [c[0] + x * cos - y * sin, c[1] + x * sin + y * cos];
}

export function bbox(poly) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function closeRing(poly) {
  if (!poly.length) return poly;
  const first = poly[0];
  const last = poly[poly.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return poly;
  return [...poly, first];
}
