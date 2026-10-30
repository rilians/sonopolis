import { useCallback, useRef } from 'react';
import { fmtClock, phaseName } from '../lib/palette';

const CX = 88;
const CY = 88;
const R = 62;
const START = 135;
const SPAN = 270;

const pt = (deg, r) => {
  const a = (deg * Math.PI) / 180;
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
};

const arc = (from, to, r) => {
  const [x1, y1] = pt(from, r);
  const [x2, y2] = pt(to, r);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

export default function TimeDial({ hour, onChange }) {
  const ref = useRef(null);
  const dragging = useRef(false);

  const setFromEvent = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // map client px into the 168x150 viewBox space
      const x = ((e.clientX - r.left) / r.width) * 176;
      const y = ((e.clientY - r.top) / r.height) * 168;
      let a = (Math.atan2(y - CY, x - CX) * 180) / Math.PI;
      a = (a + 360) % 360;
      // the dial opens at the bottom (45°..135°)
      if (a > 45 && a < 135) a = a < 90 ? 45 : 135;
      let h = ((a - START + 360) % 360) / SPAN;
      h *= 24;
      if (h >= 23.98) h = 0;
      onChange(Math.round(h * 20) / 20);
    },
    [onChange]
  );

  const onDown = (e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFromEvent(e);
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    setFromEvent(e);
  };
  const onUp = (e) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const knobDeg = START + (hour / 24) * SPAN;
  const [kx, ky] = pt(knobDeg, R);
  const [hx, hy] = pt(knobDeg, R);

  return (
    <div className="dial interactive">
      <div className="dial__label">
        <span className="caps">SOLAR HOUR</span>
        <span className="caps" style={{ color: 'var(--accent)' }}>
          DRAG
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          className="dial__svg"
          viewBox="0 0 176 168"
          ref={ref}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="slider"
          aria-label="Time of day"
          aria-valuemin={0}
          aria-valuemax={24}
          aria-valuenow={hour}
        >
          <defs>
            <linearGradient id="dialGrad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent-2)" />
              <stop offset="55%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--arterial)" />
            </linearGradient>
          </defs>

          <path className="dial__track" d={arc(START, START + SPAN, R)} />

          {Array.from({ length: 25 }).map((_, i) => {
            const deg = START + (i / 24) * SPAN;
            const major = i % 6 === 0;
            const [x1, y1] = pt(deg, R - 4);
            const [x2, y2] = pt(deg, R - (major ? 13 : 8));
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={`dial__tick${major ? ' dial__tick--major' : ''}`}
              />
            );
          })}

          {[0, 6, 12, 18].map((h) => {
            const deg = START + (h / 24) * SPAN;
            const [x, y] = pt(deg, R + 13);
            return (
              <text
                key={h}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--muted)"
                fontSize="7"
                letterSpacing="1"
                fontFamily="var(--mono)"
              >
                {String(h).padStart(2, '0')}
              </text>
            );
          })}

          {hour > 0.02 && (
            <path
              className="dial__arc"
              d={arc(START, knobDeg, R)}
              strokeDasharray={Math.abs(knobDeg - START) > 359 ? '0' : undefined}
            />
          )}

          <circle className="dial__knob-halo" cx={hx} cy={hy} r="11" />
          <circle className="dial__knob" cx={kx} cy={ky} r="3.4" />
        </svg>

        <div className="dial__center">
          <div className="dial__time">{fmtClock(hour)}</div>
          <div className="dial__phase">{phaseName(hour)}</div>
          <svg className="dial__sun" viewBox="0 0 24 24" aria-hidden>
            {hour > 5.6 && hour < 19 ? (
              <>
                <circle cx="12" cy="12" r="4.4" fill="currentColor" />
                {Array.from({ length: 8 }).map((_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  return (
                    <line
                      key={i}
                      x1={12 + Math.cos(a) * 7.2}
                      y1={12 + Math.sin(a) * 7.2}
                      x2={12 + Math.cos(a) * 10.4}
                      y2={12 + Math.sin(a) * 10.4}
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  );
                })}
              </>
            ) : (
              <path
                d="M16.6 15.4A7 7 0 0 1 8.6 7a7.4 7.4 0 1 0 8 8.4z"
                fill="currentColor"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
