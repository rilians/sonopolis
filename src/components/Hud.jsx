import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { audio } from '../audio/engine';
import { fmtClock } from '../lib/palette';

/* -------- live signal meter -------- */
export function SignalMeter({ bars = 16 }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    const vals = new Array(bars).fill(0.05);
    const loop = () => {
      const spec = audio.spectrum();
      const holder = ref.current;
      if (holder) {
        for (let i = 0; i < bars; i++) {
          let target;
          if (spec) {
            const idx = Math.floor(Math.pow(i / bars, 1.6) * 220) + 1;
            target = Math.pow(spec[idx] / 255, 0.8) * 1.15 + 0.06;
          } else {
            target = 0.06 + Math.random() * 0.05;
          }
          vals[i] = Math.max(target, vals[i] * 0.86);
          const el = holder.children[i];
          if (el) el.style.height = `${Math.max(2, Math.min(1, vals[i]) * 22)}px`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bars]);

  return (
    <div className="sig" ref={ref}>
      {Array.from({ length: bars }).map((_, i) => (
        <i key={i} style={{ height: 2 }} />
      ))}
    </div>
  );
}

/* -------- top bar -------- */
export function TopBar({ hour, playing, selectedLoc, onToggleMute, muted }) {
  const lvlRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (lvlRef.current) {
        lvlRef.current.textContent = playing ? `${audio.db()} dB` : '-∞ dB';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand__mark" />
        <div>
          <div className="brand__title">Sonopolis</div>
          <div className="brand__sub">
            <span>Acoustic cartography</span>
            <i />
            <span>sector 07</span>
          </div>
        </div>
      </div>

      <div className="topbar__right">
        <div className="read-block">
          <div className="caps">Channel</div>
          <div className="read-block__v">{selectedLoc ? selectedLoc.name : 'IDLE'}</div>
        </div>
        <div className="read-block">
          <div className="caps">Signal</div>
          <div className="read-block__v" ref={lvlRef}>
            -∞ dB
          </div>
          <SignalMeter />
        </div>
        <div className="read-block">
          <div className="caps">City time</div>
          <div className="read-block__v read-block__v--big">{fmtClock(hour)}</div>
        </div>
        <button
          className="panel__close"
          onClick={onToggleMute}
          title={muted ? 'unmute' : 'mute'}
          aria-label="toggle audio"
          style={{ marginTop: 4 }}
        >
          {muted ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
              <path d="m16 9 5 6M21 9l-5 6" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5 6 9H3v6h3l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

/* -------- district rail -------- */
export function DistrictRail({ districts, activeId, onPick }) {
  return (
    <nav className="rail" aria-label="Districts">
      <div className="rail__head">Districts</div>
      <div className="rail__list">
        {districts.map((d) => (
          <button
            key={d.id}
            className={`rail__item interactive${d.id === activeId ? ' is-on' : ''}`}
            onClick={() => onPick(d.id)}
            title={d.name}
          >
            <span className="rail__code">{d.code}</span>
            <span className="rail__name">{d.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

/* -------- log ticker -------- */
export function LogLine({ items }) {
  return (
    <div className="logline">
      <AnimatePresence initial={false}>
        {items.slice(-2).map((it) => (
          <motion.span
            key={it.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
          >
            <b>↳</b> {it.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
