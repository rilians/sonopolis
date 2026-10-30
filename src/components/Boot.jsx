import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

const LINES = [
  ['mounting spectral grid', 'ok'],
  ['calibrating ambience bank', 'ok'],
  ['linking 10 sonic beacons', 'ok'],
  ['render in headphones', 'warn'],
];

export default function Boot({ onEnter }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const timers = LINES.map((_, i) =>
      setTimeout(() => setN((v) => Math.max(v, i + 1)), 420 + i * 430)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="boot"
      exit={{ y: '-100%' }}
      transition={{ duration: 1.05, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="boot__grid" />
      <div className="boot__inner">
        <motion.div
          className="boot__eyebrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 1 }}
        >
          <span>FIELD UNIT / SECTOR 07</span>
          <span>v2.4.1 — ACOUSTIC CARTOGRAPHY DIVISION</span>
        </motion.div>

        <motion.h1
          className="boot__title"
          initial={{ opacity: 0, letterSpacing: '0.3em' }}
          animate={{ opacity: 1, letterSpacing: '0.06em' }}
          transition={{ delay: 0.2, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Sonopolis
          <em>the city has a sound</em>
        </motion.h1>

        <div className="boot__lines">
          {LINES.slice(0, n).map(([label, kind], i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span>{'> '}</span>
              <b>{label}</b>
              <span>{' ' + '.'.repeat(Math.max(4, 30 - label.length)) + ' '}</span>
              <i className={kind === 'warn' ? 'warn' : ''}>
                {kind === 'warn' ? '⚠ REQUIRED' : 'OK'}
              </i>
              {i === n - 1 ? null : null}
            </motion.div>
          ))}
        </div>

        <div className="boot__enter">
          <button className="boot__btn" onClick={onEnter}>
            Enter the city
          </button>
          <div className="boot__hint">
            interactive sound map · 10 live channels
            <br />
            drag the solar dial to re-light the grid
          </div>
        </div>
      </div>
    </motion.div>
  );
}
