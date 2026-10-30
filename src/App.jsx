import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import CityMap from './components/CityMap';
import Boot from './components/Boot';
import { TopBar, DistrictRail, LogLine } from './components/Hud';
import SoundPanel from './components/SoundPanel';
import Dock from './components/Dock';
import TimeDial from './components/TimeDial';
import Isolate from './components/Isolate';
import { buildCity, LOCATIONS, DISTRICT_BY_ID, DISTRICTS } from './data/city';
import { paletteAt, applyPaletteToRoot } from './lib/palette';
import { audio } from './audio/engine';
import { PATCHES } from './audio/patches';

const TOUR_MS = 9000;

export default function App() {
  const [phase, setPhase] = useState('boot');
  const [city] = useState(() => buildCity());
  const [hour, setHour] = useState(22.6);
  const [selectedId, setSelectedId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState('sonar');
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [solo, setSolo] = useState(false);
  const [focus, setFocus] = useState(null);
  const [tour, setTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [log, setLog] = useState([]);
  const logId = useRef(0);
  const tourIdx = useRef(0);

  const palette = useMemo(() => paletteAt(hour), [hour]);
  const selectedLoc = useMemo(
    () => LOCATIONS.find((l) => l.id === selectedId) || null,
    [selectedId]
  );
  const selectedIndex = useMemo(
    () => LOCATIONS.findIndex((l) => l.id === selectedId),
    [selectedId]
  );
  const selectedDistrict = selectedLoc ? DISTRICT_BY_ID[selectedLoc.district] : null;

  const pushLog = useCallback((text) => {
    logId.current += 1;
    const id = logId.current;
    setLog((prev) => [...prev.slice(-4), { id, text }]);
  }, []);

  /* -------- auto scan: walks the ten channels on a timer -------- */
  useEffect(() => {
    if (!tour) return;
    const startIdx = Math.max(0, LOCATIONS.findIndex((l) => l.id === selectedId));
    tourIdx.current = startIdx;
    setTourStep(startIdx);
    setPlaying(true);
    audio.unlock();

    const tick = () => {
      tourIdx.current = (tourIdx.current + 1) % LOCATIONS.length;
      const loc = LOCATIONS[tourIdx.current];
      setSelectedId(loc.id);
      setFocus({ coord: loc.coord, n: Math.random() });
      setPlaying(true);
      setTourStep(tourIdx.current);
      pushLog(`auto scan · ${String(tourIdx.current + 1).padStart(2, '0')} ${loc.name}`);
    };
    const id = setInterval(tick, TOUR_MS);
    return () => clearInterval(id);
    // deliberately keyed on `tour` only: the scan owns the selection while it runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, pushLog]);

  /* palette → css */
  useEffect(() => {
    applyPaletteToRoot(palette);
  }, [palette]);

  /* hour → audio macro */
  useEffect(() => {
    audio.setTimeOfDay(hour);
  }, [hour]);

  /* volume */
  useEffect(() => {
    audio.setVolume(muted ? 0 : volume);
  }, [volume, muted]);

  /* playback */
  useEffect(() => {
    let cancelled = false;
    if (!playing || !selectedLoc) {
      audio.stopScene();
      return;
    }
    audio.unlock().then(() => {
      if (cancelled) return;
      const patch = PATCHES[selectedLoc.patch];
      if (!patch) return;
      audio.playScene(patch);
      audio.setTimeOfDay(hour);
      audio.setVolume(muted ? 0 : volume);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, selectedLoc]);

  const pick = useCallback(
    (id) => {
      const loc = LOCATIONS.find((l) => l.id === id);
      if (!loc) return;
      setSelectedId(id);
      setFocus({ coord: loc.coord, n: Math.random() });
      setPlaying(true);
      audio.unlock();
      setTour(false);
      pushLog(`${loc.name} · channel opened`);
    },
    [pushLog]
  );

  const toggle = useCallback(() => {
    const next = !playing;
    setPlaying(next);
    if (next && selectedLoc) pushLog(`${selectedLoc.name} · feeding`);
    else if (!next) pushLog('feed paused · room tone only');
    audio.unlock();
  }, [playing, selectedLoc, pushLog]);

  const enter = useCallback(() => {
    setPhase('city');
    audio.unlock();
    audio.setTimeOfDay(hour);
    setSelectedId(LOCATIONS[0].id);
    pushLog('grid online · 10 beacons mapped');
    pushLog('channel 01 armed · press listen');
  }, [hour, pushLog]);

  /* keyboard */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const d = e.key === 'ArrowRight' ? 0.25 : -0.25;
        setHour((h) => (((h + d) % 24) + 24) % 24);
      } else if (e.key === 'n' || e.key === 'N') {
        setHour((h) => (h > 6 && h < 18 ? 22 : 12));
        pushLog('solar override · manual');
      } else if (e.key === 't' || e.key === 'T') {
        setTour((v) => !v);
      } else if (e.key === 'Escape') {
        setTour(false);
        setSolo(false);
      } else if (/^[0-9]$/.test(e.key)) {
        const idx = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        if (LOCATIONS[idx]) pick(LOCATIONS[idx].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, pick, pushLog]);

  const onDistrictPick = useCallback(
    (districtId) => {
      const loc = LOCATIONS.find((l) => l.district === districtId);
      if (loc) pick(loc.id);
    },
    [pick]
  );

  return (
    <div className="app">
      <CityMap
        city={city}
        palette={palette}
        selectedId={selectedId}
        onSelect={pick}
        focus={focus?.coord}
        onReady={() => {}}
      />

      <div className="hud">
        <TopBar
          hour={hour}
          playing={playing}
          selectedLoc={selectedLoc}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
        />

        <DistrictRail
          districts={DISTRICTS}
          activeId={selectedLoc?.district}
          onPick={onDistrictPick}
        />

        <LogLine items={log} />

        <AnimatePresence mode="wait">
          {phase === 'city' && (
            <SoundPanel
              key={selectedLoc ? selectedLoc.id : 'empty'}
              loc={selectedLoc}
              district={selectedDistrict}
              index={Math.max(0, selectedIndex)}
              total={LOCATIONS.length}
              palette={palette}
              playing={playing}
              onToggle={toggle}
              mode={mode}
              setMode={setMode}
              volume={volume}
              setVolume={setVolume}
              onClose={() => {
                setPlaying(false);
                setSelectedId(null);
                pushLog('channel closed');
              }}
              onLocate={() => {
                if (selectedLoc) setFocus({ coord: selectedLoc.coord, n: Math.random() });
              }}
              onIsolate={() => setSolo(true)}
            />
          )}
        </AnimatePresence>

        <TimeDial
          hour={hour}
          onChange={(h) => {
            setHour(h);
          }}
        />

        <Dock
          selectedId={selectedId}
          playing={playing}
          palette={palette}
          onPick={pick}
          tour={tour}
          tourStep={tourStep}
          onToggleTour={() => setTour((v) => !v)}
        />
      </div>

      <AnimatePresence>
        {solo && (
          <Isolate
            loc={selectedLoc}
            palette={palette}
            hour={hour}
            playing={playing}
            onExit={() => setSolo(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'boot' && <Boot key="boot" onEnter={enter} />}
      </AnimatePresence>
    </div>
  );
}
