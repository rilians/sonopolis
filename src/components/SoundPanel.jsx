import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Visualizer from './Visualizer';
import { audio } from '../audio/engine';
import { signatureOf, dominantBand, bandwidth } from '../lib/signature';

const MODES = [
  ['wave', 'Wave'],
  ['spectrum', 'Spectrum'],
  ['sonar', 'Sonar'],
];

function DbRead({ playing }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (ref.current) {
        ref.current.textContent = playing ? `${audio.db()} dB` : '-∞';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return <span ref={ref}>-∞</span>;
}

export default function SoundPanel({
  loc,
  district,
  index,
  total,
  palette,
  playing,
  onToggle,
  mode,
  setMode,
  volume,
  setVolume,
  onClose,
  onLocate,
  onIsolate,
}) {
  if (!loc) {
    return (
      <motion.aside
        className="panel panel--empty"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p>
          No channel open
          <br />
          <b>select a beacon</b>
        </p>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      className="panel frame"
      key={loc.id}
      initial={{ opacity: 0, x: 30, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 30, filter: 'blur(6px)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="frame__b" />
      <div className="panel__head">
        <div>
          <div className="panel__idx">
            BEACON {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} ·{' '}
            {district?.code} {district?.name}
          </div>
          <h2 className="panel__title glow">{loc.name}</h2>
          <div className="panel__sub">{loc.sub}</div>
        </div>
        <button className="panel__close" onClick={onClose} aria-label="close channel">
          <svg width="9" height="9" viewBox="0 0 9 9" stroke="currentColor" strokeWidth="1.2">
            <path d="M1 1l7 7M8 1l-7 7" />
          </svg>
        </button>
      </div>

      <div className="viz">
        <Visualizer
          mode={mode}
          playing={playing}
          palette={palette}
          signature={signatureOf(loc.patch)}
        />
        <div className="viz__badge">
          <i /> {playing ? 'LIVE FEED' : 'STANDBY'}
        </div>
      </div>

      <div className="modes" role="tablist">
        {MODES.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={mode === id}
            className={mode === id ? 'is-on' : ''}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <dl className="meta-grid">
        <div>
          <dt>Level</dt>
          <dd>
            <DbRead playing={playing} />
          </dd>
        </div>
        <div>
          <dt>Tempo</dt>
          <dd>{loc.bpm} bpm</dd>
        </div>
        <div>
          <dt>Sig</dt>
          <dd>{loc.sig.split(' / ')[0]}</dd>
        </div>
      </dl>

      <div className={`sig-strip${playing ? ' is-live' : ''}`}>
        <div className="sig-strip__bars" aria-hidden>
          {signatureOf(loc.patch).map((v, i) => (
            <i key={i} style={{ height: `${8 + v * 88}%`, animationDelay: `${i * 0.07}s` }} />
          ))}
        </div>
        <div className="sig-strip__foot">
          <span className="caps">Spectral signature</span>
          <span className="caps sig-strip__peak">
            peak {dominantBand(loc.patch)} · {(bandwidth(loc.patch) * 100).toFixed(0)}% spread
          </span>
        </div>
      </div>

      <p className="panel__desc">{loc.desc}</p>

      <div className="panel__actions">
        <button className={`btn-listen${playing ? ' is-on' : ''}`} onClick={onToggle}>
          <span>{playing ? 'Pause feed' : 'Listen'}</span>
          <span className="btn-listen__eq">
            <i />
            <i />
            <i />
            <i />
          </span>
        </button>
        <button className="btn-ghost" onClick={onLocate}>
          Locate
        </button>
        <button className="btn-ghost btn-ghost--icon" onClick={onIsolate} title="isolate channel">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
      </div>

      <div className="volume">
        <span className="caps">Gain</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          aria-label="master gain"
        />
        <span className="caps" style={{ color: 'var(--ink)', minWidth: 26, textAlign: 'right' }}>
          {Math.round(volume * 100)}
        </span>
      </div>
    </motion.aside>
  );
}
