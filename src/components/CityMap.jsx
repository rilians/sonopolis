import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LOCATIONS } from '../data/city';
import { audio } from '../audio/engine';

// MapLibre ships its tile worker next to the bundle; Vite has to be told
// where that worker actually lives, both in dev and in the built app.
setWorkerUrl(workerUrl);

const zoomW = (a, b) => ['interpolate', ['linear'], ['zoom'], 11, a, 15, b];

function blockColorExpr(p) {
  return ['interpolate', ['linear'], ['get', 'heat'], 0, p.block, 0.45, p.blockMid, 1, p.blockHot];
}

function buildStyle(city, p) {
  return {
    version: 8,
    name: 'sonopolis',
    transition: { duration: 0, delay: 0 },
    light: {
      anchor: 'viewport',
      color: '#ffffff',
      intensity: 0.55,
      position: [1.6, 200, 26],
    },
    sources: {
      boundary: { type: 'geojson', data: city.boundary },
      water: { type: 'geojson', data: city.water },
      river: { type: 'geojson', data: city.river },
      districts: { type: 'geojson', data: city.districts },
      blocks: { type: 'geojson', data: city.blocks },
      streets: { type: 'geojson', data: city.streets },
      monorail: { type: 'geojson', data: city.monorail },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': p.bg } },
      {
        id: 'districts',
        type: 'fill',
        source: 'districts',
        paint: { 'fill-color': p.district, 'fill-opacity': 0.85 },
      },
      {
        id: 'district-lines',
        type: 'line',
        source: 'districts',
        paint: {
          'line-color': p.line,
          'line-width': zoomW(0.8, 1.6),
          'line-dasharray': [4, 6],
        },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'water',
        paint: { 'fill-color': p.water, 'fill-opacity': 1 },
      },
      {
        id: 'river',
        type: 'line',
        source: 'river',
        paint: { 'line-color': p.water, 'line-width': zoomW(7, 18), 'line-blur': 1.5 },
      },
      {
        id: 'coast',
        type: 'line',
        source: 'boundary',
        paint: { 'line-color': p.line, 'line-width': 1.2, 'line-blur': 2 },
      },
      {
        id: 'streets-glow',
        type: 'line',
        source: 'streets',
        filter: ['==', ['get', 'kind'], 'grid'],
        paint: {
          'line-color': p.arterial,
          'line-width': zoomW(3, 7),
          'line-blur': 9,
          'line-opacity': 0.16,
        },
      },
      {
        id: 'streets',
        type: 'line',
        source: 'streets',
        filter: ['==', ['get', 'kind'], 'grid'],
        paint: {
          'line-color': p.street,
          'line-width': zoomW(0.5, 2.1),
          'line-opacity': 0.9,
        },
      },
      {
        id: 'blocks',
        type: 'fill-extrusion',
        source: 'blocks',
        paint: {
          'fill-extrusion-color': blockColorExpr(p),
          'fill-extrusion-height': ['get', 'h'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.97,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'block-edges',
        type: 'line',
        source: 'blocks',
        paint: {
          'line-color': p.arterial,
          'line-width': zoomW(0.3, 0.9),
          'line-opacity': 0.26,
          'line-blur': 0.6,
        },
      },
      {
        id: 'arterial-glow',
        type: 'line',
        source: 'streets',
        filter: ['==', ['get', 'kind'], 'spine'],
        paint: {
          'line-color': p.arterial,
          'line-width': zoomW(7, 22),
          'line-blur': 14,
          'line-opacity': 0.42,
        },
      },
      {
        id: 'arterial-core',
        type: 'line',
        source: 'streets',
        filter: ['==', ['get', 'kind'], 'spine'],
        paint: { 'line-color': p.arterial, 'line-width': zoomW(1.1, 2.6), 'line-opacity': 0.95 },
      },
      {
        id: 'ring-glow',
        type: 'line',
        source: 'streets',
        filter: ['==', ['get', 'kind'], 'ring'],
        paint: {
          'line-color': p.accent,
          'line-width': zoomW(6, 16),
          'line-blur': 12,
          'line-opacity': 0.22,
        },
      },
      {
        id: 'ring-core',
        type: 'line',
        source: 'streets',
        filter: ['==', ['get', 'kind'], 'ring'],
        paint: {
          'line-color': p.accent,
          'line-width': zoomW(0.9, 1.8),
          'line-opacity': 0.7,
          'line-dasharray': [2, 2],
        },
      },
      {
        id: 'monorail-glow',
        type: 'line',
        source: 'monorail',
        paint: {
          'line-color': p.accent2,
          'line-width': zoomW(6, 14),
          'line-blur': 13,
          'line-opacity': 0.5,
        },
      },
      {
        id: 'monorail',
        type: 'line',
        source: 'monorail',
        paint: {
          'line-color': p.accent2,
          'line-width': zoomW(1.2, 2.4),
          'line-opacity': 1,
          'line-dasharray': [5, 4],
        },
      },
    ],
  };
}

const PAINT_UPDATE = (p) => [
  ['bg', 'background-color', p.bg],
  ['districts', 'fill-color', p.district],
  ['district-lines', 'line-color', p.line],
  ['water', 'fill-color', p.water],
  ['river', 'line-color', p.water],
  ['coast', 'line-color', p.line],
  ['streets-glow', 'line-color', p.arterial],
  ['streets', 'line-color', p.street],
  ['blocks', 'fill-extrusion-color', blockColorExpr(p)],
  ['block-edges', 'line-color', p.arterial],
  ['arterial-glow', 'line-color', p.arterial],
  ['arterial-core', 'line-color', p.arterial],
  ['ring-glow', 'line-color', p.accent],
  ['ring-core', 'line-color', p.accent],
  ['monorail-glow', 'line-color', p.accent2],
  ['monorail', 'line-color', p.accent2],
];

export default function CityMap({ city, palette, selectedId, onSelect, onReady, focus }) {
  const holder = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const selectRef = useRef(onSelect);
  const lensRef = useRef(null);
  const lensTextRef = useRef(null);
  const compassRef = useRef(null);
  const rafRef = useRef(0);
  const [ready, setReady] = useState(false);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  selectRef.current = onSelect;

  /* ---------- create the map ---------- */
  useEffect(() => {
    if (!holder.current || mapRef.current) return;
    /* portrait / phone framing: lift the island above the bottom sheet */
    const compact =
      typeof window !== 'undefined' &&
      (window.innerWidth <= 820 || window.innerHeight <= 640);
    const map = new MapLibreMap({
      container: holder.current,
      style: buildStyle(city, palette),
      center: compact
        ? [city.center[0], city.center[1] - 0.017]
        : city.center,
      zoom: compact ? 11.85 : 12.26,
      pitch: compact ? 34 : 44,
      bearing: -27,
      maxPitch: 72,
      minZoom: 11.1,
      maxZoom: 16.5,
      attributionControl: false,
      dragRotate: true,
      fadeDuration: 0,
      antialias: true,
    });
    if (import.meta.env.DEV) window.__map = map;
    mapRef.current = map;

    map.on('error', (e) => console.warn('[map]', e?.error?.message || e));

    map.on('load', () => {
      // district signage
      city.districtMeta.forEach((d) => {
        const el = document.createElement('div');
        el.className = 'district-tag';
        el.innerHTML = `<span class="district-tag__code">${d.code}</span><span class="district-tag__name">${d.name}</span>`;
        new Marker({ element: el, anchor: 'center' })
          .setLngLat(d.centroid)
          .addTo(map);
      });

      // sonic beacons
      LOCATIONS.forEach((loc, idx) => {
        const el = document.createElement('div');
        el.className = 'beacon';
        el.dataset.id = loc.id;
        el.innerHTML = `
          <div class="beacon__beam"></div>
          <div class="beacon__pulse"></div>
          <div class="beacon__dot"></div>
          <span class="beacon__idx">${String(idx + 1).padStart(2, '0')}</span>
          <div class="beacon__plate">
            <span class="beacon__name">${loc.name}</span>
            <span class="beacon__meta">${loc.tag}</span>
          </div>`;
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          selectRef.current?.(loc.id);
        });
        el.addEventListener('mouseenter', () => el.classList.add('is-hover'));
        el.addEventListener('mouseleave', () => el.classList.remove('is-hover'));
        const marker = new Marker({ element: el, anchor: 'bottom', offset: [0, 0] })
          .setLngLat(loc.coord)
          .addTo(map);
        markersRef.current[loc.id] = { marker, el };
      });

      Object.entries(markersRef.current).forEach(([id, { el }]) => {
        el.classList.toggle('is-active', id === selectedRef.current);
      });
      setReady(true);
      onReady?.();
    });

    // live compass
    const syncCompass = () => {
      if (compassRef.current) {
        compassRef.current.style.transform = `rotate(${-map.getBearing()}deg)`;
      }
    };
    map.on('rotate', syncCompass);
    map.on('move', syncCompass);

    // sonar ping anywhere on the map
    map.on('click', (e) => {
      const box = map.getContainer().getBoundingClientRect();
      const ring = document.createElement('div');
      ring.className = 'sonar';
      ring.style.left = `${e.point.x}px`;
      ring.style.top = `${e.point.y}px`;
      map.getContainer().appendChild(ring);
      setTimeout(() => ring.remove(), 1700);
      if (audio.ctx) {
        const d = Math.hypot(e.lngLat.lng - city.center[0], e.lngLat.lat - city.center[1]);
        const f = 1400 - Math.min(1000, d * 9000);
        audio.tone({ out: audio.bus, freq: f, type: 'sine', dur: 0.5, gain: 0.09, glide: 0.5 });
        audio.tone({ out: audio.bus, freq: f * 1.5, type: 'sine', dur: 0.3, gain: 0.03, glide: 0.6 });
        void box;
      }
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- palette reactive paint ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      PAINT_UPDATE(palette).forEach(([layer, prop, value]) => {
        try {
          map.setPaintProperty(layer, prop, value);
        } catch {
          /* layer not ready yet — the load/idle listeners below retry */
        }
      });
    };
    apply();
    map.on('load', apply);
    map.on('idle', apply);
    return () => {
      map.off('load', apply);
      map.off('idle', apply);
    };
  }, [palette]);

  /* ---------- selection state on beacons ---------- */
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { el }]) => {
      el.classList.toggle('is-active', id === selectedId);
    });
  }, [selectedId, ready]);

  /* ---------- fly to selection ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo({
      center: focus,
      zoom: Math.max(13.1, map.getZoom()),
      pitch: 62,
      bearing: map.getBearing() - 8,
      duration: 1500,
      curve: 1.3,
      essential: true,
    });
  }, [focus]);

  /* ---------- sound lens ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const el = lensRef.current;
    if (!el) return;
    let visible = false;
    const container = map.getContainer();
    const move = (e) => {
      if (e.target instanceof Element && e.target.closest('.hud')) {
        if (visible) {
          el.classList.remove('is-on');
          visible = false;
        }
        return;
      }
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (!visible) {
        el.classList.add('is-on');
        visible = true;
      }
      if (lensTextRef.current && audio.ctx) {
        lensTextRef.current.textContent = `${audio.db()} dB`;
      } else if (lensTextRef.current) {
        lensTextRef.current.textContent = '-- dB';
      }
    };
    const leave = () => {
      el.classList.remove('is-on');
      visible = false;
    };
    window.addEventListener('mousemove', move, { passive: true });
    container.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('mousemove', move);
      container.removeEventListener('mouseleave', leave);
    };
  }, []);

  return (
    <div className="map-shell">
      <div className="map-canvas" ref={holder} />
      <div className="map-vignette" aria-hidden />
      <div className="map-haze" aria-hidden />
      <div className="map-scan" aria-hidden />
      <div className="map-grid" aria-hidden />
      <div className="sound-lens" ref={lensRef} aria-hidden>
        <svg viewBox="0 0 120 120" className="sound-lens__ring">
          <circle cx="60" cy="60" r="44" />
          <circle cx="60" cy="60" r="58" strokeDasharray="2 8" />
        </svg>
        <span className="sound-lens__cross" />
        <span className="sound-lens__read" ref={lensTextRef}>
          -- dB
        </span>
      </div>
      <div className="compass" aria-hidden>
        <div className="compass__dial" ref={compassRef}>
          <svg viewBox="0 0 40 40">
            <path d="M20 4 L24 22 L20 19 L16 22 Z" fill="currentColor" />
          </svg>
        </div>
        <span>N</span>
      </div>
    </div>
  );
}
