import { motion } from 'motion/react';
import Visualizer from './Visualizer';
import { fmtClock } from '../lib/palette';

export default function Isolate({ loc, palette, hour, playing, onExit }) {
  return (
    <motion.div
      className="isolate"
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="isolate__stage">
        <Visualizer mode="sonar" playing={playing} palette={palette} />
      </div>
      <div className="isolate__meta">
        <div className="caps">{playing ? 'isolated channel · live' : 'isolated channel · paused'}</div>
        <div className="isolate__name glow">{loc?.name || 'NO CHANNEL'}</div>
        <div className="caps" style={{ marginTop: 10 }}>
          {loc?.sig} · {fmtClock(hour)} · {palette.name}
        </div>
      </div>
      <button className="isolate__exit" onClick={onExit}>
        ← return to the grid
      </button>
    </motion.div>
  );
}
