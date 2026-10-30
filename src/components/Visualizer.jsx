import { useEffect, useRef } from 'react';
import { audio } from '../audio/engine';

/* a small canvas toolkit shared by every instrument in the HUD */
export function useCanvasLoop(draw) {
  const canvasRef = useRef(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return canvasRef;
}

/* the analyser sits behind a compressor, so the raw signal is quiet.
   give the visuals a fixed amount of makeup gain and clamp. */
const boost = (v, k = 3.6) => Math.max(-1, Math.min(1, v * k));

const idle = (x, t, seed = 0) => {
  const a =
    Math.sin(x * 7.1 + t * 0.9 + seed) * 0.5 +
    Math.sin(x * 13.7 - t * 0.55 + seed * 2) * 0.28 +
    Math.sin(x * 3.3 + t * 1.7) * 0.22;
  return a * 0.34;
};

export default function Visualizer({ mode, playing, palette, level, signature }) {
  const modeRef = useRef(mode);
  const playRef = useRef(playing);
  const palRef = useRef(palette);
  const lvlRef = useRef(level);
  const sigRef = useRef(signature);
  sigRef.current = signature;
  modeRef.current = mode;
  playRef.current = playing;
  palRef.current = palette;

  const canvasRef = useCanvasLoop((ctx, w, h, t) => {
    const p = palRef.current;
    const accent = p.accent;
    const accent2 = p.accent2;
    audio.sample();
    const amp = Math.min(1, audio.level * 3.4);
    lvlRef.current = amp;
    const live = playRef.current;

    const sig = sigRef.current;
    if (modeRef.current === 'sonar') {
      drawSonar(ctx, w, h, t, p, live, amp, sig);
    } else if (modeRef.current === 'spectrum') {
      drawSpectrum(ctx, w, h, t, p, live, accent, accent2, sig);
    } else {
      drawWave(ctx, w, h, t, p, live, accent, accent2, sig);
    }
  });

  return <canvas ref={canvasRef} />;
}

/* ---------------- radial instrument ---------------- */
function drawSonar(ctx, w, h, t, p, live, amp, sig) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w * 0.42, h * 0.46);
  const accent = p.accent;

  // rings
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // radial ticks
  ctx.save();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const long = i % 6 === 0;
    const r1 = R * (long ? 0.9 : 0.955);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.strokeStyle = long ? accent : p.line;
    ctx.globalAlpha = long ? 0.5 : 0.5;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  // fingerprint: a fixed, dashed polygonal ring — the channel's silhouette
  if (sig) {
    ctx.save();
    ctx.strokeStyle = hexA(accent, 0.45);
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * (sig.length - 1);
      const lo = Math.floor(u);
      const hi = Math.min(sig.length - 1, lo + 1);
      const v = sig[lo] + (sig[hi] - sig[lo]) * (u - lo);
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const rr = R * (0.44 + v * 0.5);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // rotating sweep
  const sweep = -Math.PI / 2 + t * 0.62;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, accent + '00');
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R, sweep - 0.5, sweep, false);
  ctx.closePath();
  const lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  lg.addColorStop(0, hexA(accent, 0));
  lg.addColorStop(1, hexA(accent, 0.3));
  ctx.fillStyle = lg;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
  ctx.strokeStyle = hexA(accent, 0.85);
  ctx.lineWidth = 1.2;
  ctx.shadowBlur = 14;
  ctx.shadowColor = accent;
  ctx.stroke();
  ctx.restore();

  // polar waveform
  const data = live ? audio.wave() : null;
  const N = 180;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    let v;
    if (data) {
      const idx = Math.floor((i / N) * data.length);
      v = boost((data[idx] - 128) / 128, 3.8);
    } else {
      v = idle(i / N, t);
    }
    const rr = R * (0.66 + v * 0.3 + (live ? amp * 0.06 : 0));
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = p.accent2;
  ctx.lineWidth = 1.1;
  ctx.shadowBlur = 16;
  ctx.shadowColor = p.accent2;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.restore();

  // level core
  const core = R * 0.16 + amp * R * 0.1;
  ctx.beginPath();
  ctx.arc(cx, cy, core, 0, Math.PI * 2);
  ctx.fillStyle = hexA(accent, 0.12 + amp * 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.6, core * 0.34), 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.shadowBlur = 20;
  ctx.shadowColor = accent;
  ctx.fill();
  ctx.shadowBlur = 0;

  // crosshair
  ctx.strokeStyle = p.line;
  ctx.beginPath();
  ctx.moveTo(cx - R, cy);
  ctx.lineTo(cx + R, cy);
  ctx.moveTo(cx, cy - R);
  ctx.lineTo(cx, cy + R);
  ctx.stroke();
}

/* ---------------- spectral slats ---------------- */
function drawSpectrum(ctx, w, h, t, p, live, accent, accent2, sig) {
  const data = live ? audio.spectrum() : null;
  const bars = Math.max(28, Math.min(64, Math.floor(w / 7)));
  const bw = w / bars;

  /* the channel's fixed fingerprint, drawn first as a ghost reference */
  if (sig) {
    ctx.save();
    ctx.strokeStyle = hexA(accent, 0.3);
    ctx.fillStyle = hexA(accent, 0.05);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < bars; i++) {
      const at = (i / (bars - 1)) * (sig.length - 1);
      const lo = Math.floor(at);
      const hi = Math.min(sig.length - 1, lo + 1);
      const v = sig[lo] + (sig[hi] - sig[lo]) * (at - lo);
      const x = i * bw + bw * 0.18;
      const bh = Math.max(2, v * (h - 22));
      if (i === 0) ctx.moveTo(x, h - bh);
      else ctx.lineTo(x, h - bh);
    }
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }
  for (let i = 0; i < bars; i++) {
    let v;
    if (data) {
      const lo = Math.floor(Math.pow(i / bars, 1.7) * data.length * 0.55);
      const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / bars, 1.7) * data.length * 0.55));
      let m = 0;
      for (let k = lo; k < hi; k++) m = Math.max(m, data[k]);
      v = Math.pow(m / 255, 0.9);
    } else {
      v = 0.14 + Math.abs(idle(i / bars, t * 0.6)) * 1.1;
    }
    const bh = Math.max(2, v * (h - 22));
    const x = i * bw + bw * 0.18;
    const bwidth = bw * 0.64;
    const grad = ctx.createLinearGradient(0, h - bh, 0, h);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, accent2);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, h - bh, bwidth, bh);
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.fillRect(x, h - bh, bwidth, 1.5);
    // reflection
    ctx.globalAlpha = 0.14;
    ctx.fillRect(x, h, bwidth, Math.min(14, bh * 0.3));
    ctx.globalAlpha = 1;
  }
  // baseline
  ctx.fillStyle = p.line;
  ctx.fillRect(0, h - 1, w, 1);
}

/* ---------------- mirrored waveform ---------------- */
function drawWave(ctx, w, h, t, p, live, accent, accent2, sig) {
  const data = live ? audio.wave() : null;
  const mid = h / 2;

  /* fingerprint as a soft envelope across the top edge */
  if (sig) {
    ctx.save();
    ctx.strokeStyle = hexA(accent, 0.28);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const at = (i / 48) * (sig.length - 1);
      const lo = Math.floor(at);
      const hi = Math.min(sig.length - 1, lo + 1);
      const v = sig[lo] + (sig[hi] - sig[lo]) * (at - lo);
      const x = (i / 48) * w;
      const y = 6 + (1 - v) * Math.min(18, h * 0.16);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  const pts = 220;
  const ys = [];
  for (let i = 0; i <= pts; i++) {
    let v;
    if (data) {
      const idx = Math.floor((i / pts) * data.length);
      v = boost((data[idx] - 128) / 128, 3.2);
    } else {
      v = idle(i / pts, t);
    }
    ys.push(mid - v * (h * 0.42));
  }

  const path = new Path2D();
  path.moveTo(0, ys[0]);
  for (let i = 1; i <= pts; i++) {
    const x = (i / pts) * w;
    const xp = ((i - 1) / pts) * w;
    const cx = (xp + x) / 2;
    path.quadraticCurveTo(cx, ys[i - 1], x, ys[i]);
  }

  const fill = new Path2D(path);
  fill.lineTo(w, mid);
  fill.lineTo(0, mid);
  fill.closePath();
  const fg = ctx.createLinearGradient(0, 0, 0, h);
  fg.addColorStop(0, hexA(accent, 0.16));
  fg.addColorStop(1, hexA(accent, 0.015));
  ctx.fillStyle = fg;
  ctx.fill(fill);

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.2;
  ctx.shadowBlur = 12;
  ctx.shadowColor = accent;
  ctx.stroke(path);
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = accent2;
  ctx.translate(0, mid);
  ctx.scale(1, -0.55);
  ctx.translate(0, -mid);
  ctx.stroke(path);
  ctx.restore();

  ctx.fillStyle = p.line;
  ctx.fillRect(0, mid, w, 1);
}

function hexA(hexColor, a) {
  const s = hexColor.replace('#', '');
  if (s.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
