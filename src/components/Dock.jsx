import { LOCATIONS } from '../data/city';
import { audio } from '../audio/engine';
import { useCanvasLoop } from './Visualizer';
import { signatureBars } from '../lib/signature';

const hexA = (hexColor, a) => {
  const s = (hexColor || '#2ff0ff').replace('#', '');
  if (s.length !== 6) return `rgba(255,255,255,${a})`;
  return `rgba(${parseInt(s.slice(0, 2), 16)},${parseInt(s.slice(2, 4), 16)},${parseInt(s.slice(4, 6), 16)},${a})`;
};

function RibbonCanvas({ playing, palette }) {
  const palRef = { current: palette };
  const playRef = { current: playing };
  const ref = useCanvasLoop((ctx, w, h, t) => {
    const p = palRef.current;
    const live = playRef.current;
    const mid = h / 2;
    audio.sample();

    // grid
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    for (let i = 1; i < 16; i++) {
      const x = Math.round((i / 16) * w) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.globalAlpha = i % 4 === 0 ? 0.7 : 0.28;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const data = live ? audio.wave() : null;
    const pts = Math.max(160, Math.floor(w / 3));
    const ys = new Array(pts + 1);
    for (let i = 0; i <= pts; i++) {
      let v;
      if (data) {
        const idx = Math.floor((i / pts) * data.length);
        v = Math.max(-1, Math.min(1, ((data[idx] - 128) / 128) * 2.4));
      } else {
        const x = i / pts;
        v =
          (Math.sin(x * 21 + t * 0.8) * 0.4 +
            Math.sin(x * 8.5 - t * 0.5) * 0.3 +
            Math.sin(x * 47 + t * 1.9) * 0.12) *
          0.22;
      }
      ys[i] = mid - v * (h * 0.44);
    }

    const path = new Path2D();
    path.moveTo(0, ys[0]);
    for (let i = 1; i <= pts; i++) {
      const x = (i / pts) * w;
      const xp = ((i - 1) / pts) * w;
      path.quadraticCurveTo((xp + x) / 2, ys[i - 1], x, ys[i]);
    }

    const fill = new Path2D(path);
    fill.lineTo(w, mid);
    fill.lineTo(0, mid);
    fill.closePath();
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, hexA(p.accent, 0.16));
    g.addColorStop(0.5, hexA(p.accent2, 0.14));
    g.addColorStop(1, hexA(p.accent, 0.16));
    ctx.fillStyle = g;
    ctx.fill(fill);

    ctx.save();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 1;
    ctx.shadowBlur = live ? 14 : 6;
    ctx.shadowColor = p.accent;
    ctx.globalAlpha = 0.95;
    ctx.stroke(path);
    ctx.restore();

    // scan head
    const hx = ((t * 0.12) % 1) * w;
    const hg = ctx.createLinearGradient(hx - 120, 0, hx + 2, 0);
    hg.addColorStop(0, hexA(p.accent2, 0));
    hg.addColorStop(0.72, hexA(p.accent2, live ? 0.09 : 0.05));
    hg.addColorStop(1, hexA(p.accent2, live ? 0.26 : 0.12));
    ctx.fillStyle = hg;
    ctx.fillRect(hx - 120, 0, 122, h);
    ctx.fillStyle = hexA(p.accent2, live ? 0.5 : 0.28);
    ctx.fillRect(hx, 0, 1, h);

    // centre line
    ctx.fillStyle = p.line;
    ctx.fillRect(0, mid, w, 1);
  });
  return <canvas ref={ref} />;
}

export default function Dock({
  selectedId,
  playing,
  palette,
  onPick,
  tour,
  tourStep,
  onToggleTour,
}) {
  return (
    <section className="dock">
      <div className="dock__top">
        <span className="caps">
          Master ribbon · <b style={{ color: 'var(--accent)' }}>{LOCATIONS.length}</b> beacons online
        </span>

        <button
          className={`tour${tour ? ' is-on' : ''}`}
          onClick={onToggleTour}
          aria-pressed={tour}
          title="walk every beacon in order (T)"
        >
          <i className="tour__dot" />
          {tour ? 'Stop scan' : 'Auto scan'}
          <span className="tour__count">
            {String(Math.min(tourStep + 1, LOCATIONS.length)).padStart(2, '0')}/
            {LOCATIONS.length}
          </span>
          {tour && <span className="tour__progress" key={tourStep} />}
        </button>

        <span className="caps">
          {playing ? 'transmitting' : 'receiving only'} · stereo · 48 k
        </span>
      </div>

      <div className="ribbon">
        <RibbonCanvas playing={playing} palette={palette} />
        <div className="ribbon__marks">
          {LOCATIONS.map((l, i) => (
            <div
              key={l.id}
              className={`ribbon__mark${l.id === selectedId ? ' is-on' : ''}`}
              style={{ left: `${((i + 0.5) / LOCATIONS.length) * 100}%` }}
            >
              <span>{l.tag}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="plates">
        {LOCATIONS.map((l, i) => (
          <button
            key={l.id}
            className={`plate${l.id === selectedId ? ' is-on' : ''}`}
            onClick={() => onPick(l.id)}
          >
            <div className="plate__row">
              <span className="plate__idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="plate__tag">{l.tag}</span>
            </div>
            <div className="plate__name">{l.name}</div>
            <div className="plate__bars">
              {signatureBars(l.patch, 14).map((v, k) => (
                <i
                  key={k}
                  style={{
                    height: `${Math.round(14 + v * 78)}%`,
                    animationDelay: `${(k % 5) * 0.12 + (i % 3) * 0.07}s`,
                  }}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
