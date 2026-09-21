import React, { useState, useEffect, useRef, memo } from 'react';
import { safeInvoke } from '../../utils/tauri';
import { Flag, Search, Plus, Trash2, Maximize2, Timer, Magnet, Rows3, Crosshair } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';
import NowNextPanel from './NowNextPanel';
import TimelineLanes, { LANE_GUTTER } from './TimelineLanes';
import { SECTION_PRESETS, beatsPerBarFromSignature, displayName, sectionTone } from '../../utils/timelineLanes';

const MAX_ZOOM = 32;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Color con transparencia solo si es un hex (#rrggbb); si no, nada.
const hexA = (color, alpha) => (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : null);

function fmtClock(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const CueTimeline = memo(({
  bpm = 120,
  hasTempo = true,
  timeSignature = '4/4',
  markers = [],
  sampleRate = 44100,
  masterWaveform = [],
  totalSamples = 0,
  playbackSample = 0,
  isPrerollActive = false,
  prerollBars = 0,
  onAddMarker,
  onRemoveMarker,
  onSeek,
  // Líneas de Secciones / Letras / Luces (ver TimelineLanes.jsx)
  lanes = null,
  // (posición, { immediate }) — con conteo por defecto; lo provee ProMixer
  onJumpTo = null,
  // Texto de la diapositiva que está sonando (para el panel AHORA)
  currentLyric = null
}) => {

  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [vZoom, setVZoom] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [markerLabel, setMarkerLabel] = useState('');
  const [snapEnabled, setSnapEnabled] = useState(true);
  // Con zoom, la vista sigue al cursor mientras suena (como en cualquier DAW).
  const [follow, setFollow] = useState(true);
  const [showLanes, setShowLanes] = useState(() => {
    try { return localStorage.getItem('bandly_timeline_lanes') !== '0'; } catch { return true; }
  });
  const toggleLanes = () => {
    setShowLanes(v => {
      try { localStorage.setItem('bandly_timeline_lanes', v ? '0' : '1'); } catch { /* sin storage */ }
      return !v;
    });
  };
  // Compás donde va a caer el marker. Es el dato que manda: se precarga con el
  // compás donde estabas, pero puedes escribirlo a mano y armar toda la canción
  // desde el chart sin tener que cazar la posición exacta en la forma de onda.
  const [markerBar, setMarkerBar] = useState('');
  // Posición congelada al abrir el modal (para canciones sin tempo, donde no
  // hay compases y el marker va al punto exacto en el que estabas).
  const [capturedSample, setCapturedSample] = useState(0);

  // Cálculos de barras y compás actual — respeta la métrica real (4/4, 3/4, 6/8...)
  const beatsPerBar = beatsPerBarFromSignature(timeSignature);
  const samplesPerBeat = (sampleRate * 60) / bpm;
  const samplesPerBar = samplesPerBeat * beatsPerBar;
  const progress = totalSamples > 0 ? playbackSample / totalSamples : 0;
  const durationSec = totalSamples > 0 ? totalSamples / sampleRate : 0;

  // Modo de grilla: compases si la canción tiene tempo real; tiempo fijo si no.
  // Sin datos reales (totalSamples=0) no se dibuja grilla — evita el "recálculo"
  // visible al abrir mientras llegan BPM/SR/duración de forma asíncrona.
  const gridMode = hasTempo ? 'bars' : 'time';
  let gridTicks = 0;
  let secondsPerTick = 0;
  let majorEvery = 4;
  if (totalSamples > 0) {
    if (gridMode === 'bars') {
      gridTicks = Math.ceil(totalSamples / samplesPerBar);
    } else {
      const candidates = [1, 2, 5, 10, 15, 30, 60];
      secondsPerTick = candidates.find(s => durationSec / s <= 120) || 60;
      gridTicks = Math.ceil(durationSec / secondsPerTick);
      majorEvery = 5;
    }
  }
  // Posición exacta de cada línea de la grilla como fracción de la canción.
  // (Antes se repartían `gridTicks` líneas parejas en todo el ancho, y como la
  // canción casi nunca dura compases exactos, la grilla se corría respecto de
  // los markers a medida que avanzaba la canción.)
  const samplesPerTick = gridMode === 'bars' ? samplesPerBar : secondsPerTick * sampleRate;
  const tickFraction = totalSamples > 0 && samplesPerTick > 0 ? samplesPerTick / totalSamples : 0;
  // Snap: a tiempos reales con tempo, a ticks de tiempo sin tempo.
  const snapFraction = totalSamples > 0 ? (gridMode === 'bars' ? samplesPerBeat : samplesPerTick) / totalSamples : 0;

  // Ventana visible (fracción de la canción). Es el mismo mapeo con el que
  // WaveformVisualizer dibuja, así los markers y las líneas caen justo encima.
  const view = zoom > 1
    ? { start: scrollOffset * (1 - 1 / zoom), span: 1 / zoom }
    : { start: 0, span: 1 / zoom };
  const pctOf = (sample) => (((totalSamples > 0 ? sample / totalSamples : 0) - view.start) / view.span) * 100;

  // Snap de las líneas: letras y luces al tiempo, secciones al compás.
  const canSnap = snapEnabled && gridMode === 'bars' && samplesPerBar > 0;
  const snap = {
    beat: (t) => (canSnap ? Math.round(t / samplesPerBeat) * samplesPerBeat : Math.round(t)),
    bar: (t) => (canSnap ? Math.round(t / samplesPerBar) * samplesPerBar : Math.round(t)),
    toBar: (t) => (gridMode === 'bars' ? Math.max(1, Math.round(t / samplesPerBar) + 1) : 0),
  };

  // ── Área de pistas: ancho real, rueda del mouse y seguimiento ──────────
  const lanesVisible = showLanes && !!lanes;
  const gutter = lanesVisible ? LANE_GUTTER : 0;
  const areaRef = useRef(null);
  const rulerRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);
  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTrackWidth(el.getBoundingClientRect().width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lastManualScroll = useRef(0);
  const wheelState = useRef({});
  wheelState.current = { zoom, scrollOffset, gutter };
  const setView = (z, start) => {
    const zz = clamp(z, 1, MAX_ZOOM);
    const span = 1 / zz;
    const offset = zz > 1 ? clamp(start, 0, 1 - span) / (1 - span) : 0;
    // Actualizar ya el ref: una rueda rápida manda varios eventos antes del
    // próximo render, y cada uno debe partir del zoom que dejó el anterior.
    wheelState.current = { ...wheelState.current, zoom: zz, scrollOffset: offset };
    setZoom(zz);
    setScrollOffset(offset);
  };
  // Nativo y no pasivo: con el onWheel de React no se puede cancelar el
  // scroll, y Ctrl+rueda terminaba haciendo zoom a toda la ventana.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const st = wheelState.current;
      const r = el.getBoundingClientRect();
      const trackW = Math.max(1, r.width - st.gutter);
      const f = clamp((e.clientX - r.left - st.gutter) / trackW, 0, 1);
      const span = 1 / st.zoom;
      const start = st.zoom > 1 ? st.scrollOffset * (1 - span) : 0;
      if (e.ctrlKey || e.metaKey) {
        // Zoom anclado al mouse: lo que está bajo el puntero se queda ahí.
        e.preventDefault();
        const z = clamp(st.zoom * Math.exp(-e.deltaY * 0.0015), 1, MAX_ZOOM);
        const p = start + f * span;
        setView(z, p - f / z);
        lastManualScroll.current = Date.now();
      } else if (st.zoom > 1) {
        e.preventDefault();
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        setView(st.zoom, start + (d / trackW) * span);
        lastManualScroll.current = Date.now();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Seguir al cursor: solo cuando el cursor se MUEVE (sonando o tras un
  // salto) y se sale de la vista. Si acabas de mover la vista a mano, espera
  // un momento antes de volver — si no, sería imposible mirar otra parte.
  const prevSampleRef = useRef(playbackSample);
  useEffect(() => {
    const moved = playbackSample !== prevSampleRef.current;
    prevSampleRef.current = playbackSample;
    if (!moved || !follow || zoom <= 1 || totalSamples <= 0) return;
    if (Date.now() - lastManualScroll.current < 2500) return;
    const p = playbackSample / totalSamples;
    if (p < view.start || p > view.start + view.span * 0.92) {
      setView(zoom, p - view.span * 0.08);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackSample, follow, zoom, totalSamples]);

  // Regla: números de compás (o de tiempo) con densidad según el zoom.
  const rulerTicks = [];
  if (tickFraction > 0 && trackWidth > 0) {
    const pxPerTick = (trackWidth / view.span) * tickFraction;
    const labelStep = [1, 2, 4, 8, 16, 32, 64, 128].find(st => pxPerTick * st >= 38) || 128;
    const first = Math.max(0, Math.floor(view.start / tickFraction));
    const last = Math.ceil((view.start + view.span) / tickFraction);
    for (let i = first; i <= last; i++) {
      const labeled = i % labelStep === 0;
      if (!labeled && pxPerTick < 7) continue;
      rulerTicks.push({ i, left: ((i * tickFraction - view.start) / view.span) * 100, labeled });
    }
  }
  const onRulerClick = (e) => {
    if (!onSeek || totalSamples <= 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    let p = clamp(view.start + ((e.clientX - r.left) / r.width) * view.span, 0, 1);
    // En la regla se apunta a compases: con snap cae justo en el "1".
    if (snapEnabled && tickFraction > 0) p = Math.round(p / tickFraction) * tickFraction;
    onSeek(clamp(p, 0, 1));
  };

  // Sección activa: último marker cuyo sample ya pasó (markers viene ordenado)
  let activeMarkerIdx = -1;
  for (let i = 0; i < markers.length; i++) {
    if (markers[i].sample <= playbackSample) activeMarkerIdx = i;
    else break;
  }

  const handleJump = async (marker, opts = {}) => {
    if (onJumpTo) return onJumpTo(marker.sample, opts);
    try {
      await safeInvoke('play_with_preroll', { targetSample: marker.sample, bars: 2 });
    } catch (e) {
      console.error("[DAW] Error al iniciar pre-roll:", e);
    }
  };

  // ── Marcadores por compás ──────────────────────────────────────────────
  // Antes el marker caía en el sample crudo donde quedó el cursor: quedaba a
  // mitad de compás y el número "B33" era solo una etiqueta calculada después.
  // Ahora el compás es la entrada real y el sample se deriva de él.
  const barToSample = (bar) => Math.max(0, Math.round((bar - 1) * samplesPerBar));
  // Mismo criterio que el indicador "COMPÁS" de la barra: el compás en el que
  // estás parado, no el más cercano — si difirieran, el modal abriría con un
  // número distinto al que estás viendo en vivo y se sentiría un bug.
  const sampleToBar = (sample) => Math.max(1, Math.floor(sample / samplesPerBar) + 1);

  // Dónde va a caer el marker según lo que hay ahora en el modal.
  const parsedBar = parseInt(markerBar, 10);
  const hasValidBar = gridMode === 'bars' && Number.isFinite(parsedBar) && parsedBar >= 1;
  const targetSample = hasValidBar ? barToSample(parsedBar) : capturedSample;
  const targetBar = gridMode === 'bars' ? (hasValidBar ? parsedBar : sampleToBar(capturedSample)) : 0;

  const openMarkerModal = (fromSample) => {
    const s = fromSample ?? playbackSample;
    setCapturedSample(s);
    setMarkerBar(gridMode === 'bars' ? String(sampleToBar(s)) : '');
    setMarkerLabel('');
    setShowModal(true);
  };

  const addMarkerAt = (label, color) => {
    if (!onAddMarker || !label.trim()) return;
    onAddMarker(targetBar, label.trim(), targetSample, color);
    setShowModal(false);
    setMarkerLabel('');
  };

  const confirmMarker = () => addMarkerAt(markerLabel, undefined);

  // Atajo "M": congela la posición en el instante exacto en que lo presionas,
  // sin tener que parar la canción ni atinarle al botón — el retraso entre
  // escuchar el coro y hacer clic era justo lo que descuadraba el marker.
  const liveRef = useRef({});
  useEffect(() => {
    liveRef.current = { playbackSample, showModal, openMarkerModal };
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'KeyM' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (liveRef.current.showModal) return;
      e.preventDefault();
      liveRef.current.openMarkerModal(liveRef.current.playbackSample);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={{ background: 'var(--daw-panel)', borderBottom: '1px solid var(--daw-border)', padding: '6px 0', position: 'relative' }}>
      
      {/* MODAL INTERNO PREMIUM PARA NOMBRE DE MARCADOR */}
      {showModal && (
        <div style={{ 
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ 
            width: '320px', background: '#17171a', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)', padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.8rem', fontWeight: '500', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>NUEVO MARCADOR</h3>

            {/* Compás destino: editable. Escribe el número y el marker cae
                exacto en esa línea de compás, sin cazar la posición a mano. */}
            {gridMode === 'bars' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '500', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>COMPÁS</span>
                <button
                  onClick={() => setMarkerBar(String(Math.max(1, (parseInt(markerBar, 10) || 1) - 1)))}
                  style={{ width: '28px', height: '32px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: '500' }}
                >−</button>
                <input
                  type="number"
                  min="1"
                  value={markerBar}
                  onChange={(e) => setMarkerBar(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmMarker(); }}
                  style={{
                    width: '80px', textAlign: 'center', background: 'rgba(247, 244, 239, 0.04)',
                    border: '1px solid rgba(247, 244, 239, 0.3)', padding: '8px', borderRadius: '6px',
                    color: 'var(--daw-cyan)', fontSize: '1.1rem', fontWeight: '500', outline: 'none'
                  }}
                />
                <button
                  onClick={() => setMarkerBar(String((parseInt(markerBar, 10) || 0) + 1))}
                  style={{ width: '28px', height: '32px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: '500' }}
                >+</button>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
                  {fmtClock(targetSample / sampleRate)}
                </span>
              </div>
            )}

            {/* Presets de sección: un clic agrega y cierra */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {SECTION_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => addMarkerAt(p.label, p.color)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
                    background: `${p.color}22`, border: `1px solid ${p.color}66`,
                    color: p.color, fontSize: '0.65rem', fontWeight: '500', letterSpacing: '0.5px'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmMarker();
                if (e.key === 'Escape') setShowModal(false);
              }}
              placeholder={`Marker ${markers.length + 1}`}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '12px 16px', borderRadius: '12px', color: '#fff', fontSize: '1rem',
                outline: 'none', marginBottom: '20px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '500', cursor: 'pointer' }}
              >
                CANCELAR
              </button>
              <button 
                onClick={confirmMarker}
                style={{ flex: 1, padding: '10px', background: 'var(--daw-gradient)', border: 'none', color: '#fff', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '500', cursor: 'pointer' }}
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {isPrerollActive && (
        <div style={{ 
          position: 'absolute', inset: 0, zIndex: 200,
          background: 'rgba(16, 16, 18,0.9)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out', border: '2px solid var(--daw-cyan)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <Timer size={64} color="var(--daw-cyan)" className="animate-pulse" />
            <span className="mono-data" style={{ fontSize: '7rem', fontWeight: '500', color: 'white', textShadow: '0 0 50px var(--daw-cyan)' }}>
              {prerollBars}
            </span>
          </div>
          <div style={{ marginTop: '1.5rem', letterSpacing: '0.5px', fontWeight: '500', color: 'var(--daw-cyan)', fontSize: '1.2rem', textTransform: 'uppercase' }}>
            Get Ready
          </div>
        </div>
      )}

      {/* Barra de Herramientas de Timeline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => openMarkerModal()}
              className="tech-btn"
              title="Añadir marcador (M)"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.88)',
                border: '1px solid rgba(255,255,255,0.14)', borderRadius: '6px'
              }}
            >
              <Plus size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: '500', letterSpacing: '1px' }}>AÑADIR MARKER</span>
              <span style={{
                fontSize: '0.55rem', fontWeight: '500', color: 'rgba(255,255,255,0.45)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                padding: '1px 5px', lineHeight: 1.4
              }}>M</span>
            </button>
            {lanes && (
              <button
                onClick={toggleLanes}
                className="tech-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 10px',
                  background: showLanes ? 'rgba(255,255,255,0.10)' : 'rgba(255, 255, 255, 0.04)',
                  color: showLanes ? '#fff' : 'rgba(255, 255, 255, 0.45)',
                  border: `1px solid ${showLanes ? 'rgba(255,255,255,0.22)' : 'transparent'}`,
                  borderRadius: '6px', transition: 'all 0.2s'
                }}
                title="Líneas"
              >
                <Rows3 size={15} />
                <span style={{ fontSize: '0.6rem', fontWeight: '500', letterSpacing: '1px' }}>LÍNEAS</span>
              </button>
            )}
            <button
              onClick={() => setSnapEnabled(!snapEnabled)}
              className="tech-btn"
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: '0',
                background: snapEnabled ? 'rgba(255,255,255,0.10)' : 'rgba(255, 255, 255, 0.04)', 
                color: snapEnabled ? '#fff' : 'rgba(255, 255, 255, 0.4)', 
                border: `1px solid ${snapEnabled ? 'rgba(255,255,255,0.22)' : 'transparent'}`, 
                borderRadius: '6px', transition: 'all 0.2s'
              }}
              title="Imán"
            >
              <Magnet size={16} />
            </button>
            {lanes?.detectStatus && (
              <span
                className={lanes.isDetecting ? 'animate-pulse' : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
                  fontSize: '0.76rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 6, whiteSpace: 'nowrap', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {lanes.detectStatus}
              </span>
            )}
            <button
              onClick={() => setFollow(!follow)}
              className="tech-btn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: '0',
                background: follow ? 'rgba(255,255,255,0.10)' : 'rgba(255, 255, 255, 0.04)',
                color: follow ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                border: `1px solid ${follow ? 'rgba(255,255,255,0.22)' : 'transparent'}`,
                borderRadius: '6px', transition: 'all 0.2s'
              }}
              title="Seguir cursor"
            >
              <Crosshair size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '4px 15px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Search size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
              <input 
                type="range" min="0" max="100" step="1" 
                                value={(Math.log(zoom) / Math.log(MAX_ZOOM)) * 100}
                title="Zoom (Ctrl + rueda)"
                onChange={(e) => {
                    // Zoom desde el slider: centrado en el cursor de reproducción.
                    const z = Math.pow(MAX_ZOOM, parseFloat(e.target.value) / 100);
                    const p = totalSamples > 0 ? playbackSample / totalSamples : 0;
                    setView(z, p - 0.5 / z);
                }}
                style={{ width: '120px', height: '4px', accentColor: '#a8a8a6' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Maximize2 size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
              <input 
                type="range" min="1" max="10" step="0.1" 
                value={vZoom} 
                onChange={(e) => setVZoom(parseFloat(e.target.value))}
                style={{ width: '80px', height: '4px', accentColor: '#a8a8a6' }}
              />
            </div>
          </div>
      </div>

      <NowNextPanel
        markers={markers}
        playbackSample={playbackSample}
        sampleRate={sampleRate}
        samplesPerBar={samplesPerBar}
        samplesPerBeat={samplesPerBeat}
        beatsPerBar={beatsPerBar}
        hasTempo={gridMode === 'bars'}
        currentLyric={currentLyric}
      />

      <div style={{ padding: '0 20px', marginBottom: '8px' }}>
        <div ref={areaRef} style={{ position: 'relative' }}>
          {/* REGLA */}
          <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 3 }}>
            {lanesVisible && <div style={{ width: LANE_GUTTER, flexShrink: 0 }} />}
            <div
              ref={rulerRef}
              onClick={onRulerClick}
              title="Ir al compás"
              style={{
                flex: 1, minWidth: 0, height: 20, position: 'relative', overflow: 'hidden', cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)', borderRadius: 6, userSelect: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {rulerTicks.map(t => (
                <div key={t.i} style={{ position: 'absolute', left: `${t.left}%`, bottom: 0, height: t.labeled ? '100%' : 5, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', left: 0, bottom: 0, width: 1, height: '100%', background: t.labeled ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)' }} />
                  {t.labeled && (
                    <span className="mono-data" style={{ position: 'absolute', left: 4, top: 2, fontSize: '0.66rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                      {gridMode === 'time' ? fmtClock(t.i * secondsPerTick) : t.i + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ONDA */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {lanesVisible && (
              <div style={{ width: LANE_GUTTER, flexShrink: 0, fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>
                MASTER
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, position: 'relative', height: '80px' }}>
              <WaveformVisualizer
                progress={progress} peaks={masterWaveform} onSeek={onSeek}
                zoom={zoom} scrollOffset={scrollOffset}
                vZoom={vZoom} totalBars={gridTicks} tickFraction={tickFraction}
                snapToGrid={snapEnabled} snapFraction={snapFraction}
                majorEvery={majorEvery}
              />

              {/* Secciones como franjas de color: la forma de la canción de un vistazo */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 12 }}>
                 {markers.map((m, i) => {
                    const color = sectionTone(m);
                    const end = i + 1 < markers.length ? markers[i + 1].sample : totalSamples;
                    const left = pctOf(m.sample), right = pctOf(end);
                    if (right < 0 || left > 100) return null;
                    return (
                      <React.Fragment key={m.id}>
                        {hexA(color, '0d') && (
                          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `${Math.max(0, right - left)}%`, background: hexA(color, '0d') }} />
                        )}
                        <div style={{ position: 'absolute', top: 0, height: 3, left: `${left}%`, width: `${Math.max(0, right - left)}%`, background: color, opacity: 0.8 }} />
                        <div style={{ position: 'absolute', left: `${left}%`, top: 0, bottom: 0, width: '1px', background: color, opacity: 0.6 }}>
                          {/* Con las líneas visibles el nombre ya se lee en SECCIONES */}
                          {!lanesVisible && (
                            <div style={{
                              position: 'absolute', top: 3, left: '2px',
                              background: color, color: '#fff',
                              fontSize: '0.74rem', fontWeight: 500, padding: '2px 8px',
                              borderRadius: '0 4px 4px 0', whiteSpace: 'nowrap',
                            }}>
                              {displayName(m.label)}
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                 })}
              </div>
            </div>
          </div>

          {lanesVisible && (
            <TimelineLanes
              view={view}
              totalSamples={totalSamples}
              playbackSample={playbackSample}
              sampleRate={sampleRate}
              snap={snap}
              sections={markers}
              sectionsEditable={lanes.sectionsEditable}
              lyricEvents={lanes.lyricEvents}
              lightEvents={lanes.lightEvents}
              slides={lanes.slides}
              hasCueTrack={lanes.hasCueTrack}
              isDetecting={lanes.isDetecting}
              lightScenes={lanes.lightScenes || []}
              actions={lanes.actions}
              onSeek={onSeek}
              onJump={(sample, opts) => handleJump({ sample }, opts)}
              midi={lanes.midi}
              midiUid={lanes.midiUid}
            />
          )}

          {/* CURSOR: una sola línea que cruza regla, onda y todas las líneas */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: gutter, right: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 40 }}>
            {totalSamples > 0 && (() => {
              const x = pctOf(playbackSample);
              if (x < -1 || x > 101) return null;
              return (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${x}%`, width: 2, transform: 'translateX(-1px)', background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }}>
                  <div style={{ position: 'absolute', top: 0, left: -5, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #fff' }} />
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Sin las líneas, los botones de sección son la forma de saltar/borrar */}
      {!lanesVisible && (
      <div style={{ display: 'flex', gap: '8px', padding: '0 20px', flexWrap: 'wrap' }}>
        {markers.map((m, idx) => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center',
            background: idx === activeMarkerIdx ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
            borderRadius: '6px',
            border: `1px solid ${idx === activeMarkerIdx ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
            borderLeft: `3px solid ${sectionTone(m)}`,
            transition: 'all 0.2s'
          }}>
            <button
              onClick={(e) => handleJump(m, { immediate: e.shiftKey })}
              title={`${gridMode === 'bars' ? `Compás ${m.bar}` : fmtClock(m.sample / sampleRate)} — clic: con conteo · Shift+clic: directo${idx < 9 ? ` · tecla ${idx + 1}` : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px',
                color: 'white', fontSize: '0.82rem', fontWeight: 500,
                background: 'transparent', border: 'none', cursor: 'pointer'
              }}
            >
              {idx < 9 && (
                <span style={{
                  fontSize: '0.55rem', fontWeight: '500', color: 'rgba(255,255,255,0.45)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                  padding: '1px 5px', lineHeight: 1.4
                }}>{idx + 1}</span>
              )}
              <Flag size={13} color={sectionTone(m)} fill={sectionTone(m)} />
              <span>{displayName(m.label)}</span>
              <span style={{ opacity: 0.4, fontSize: '0.65rem' }}>
                {gridMode === 'bars' ? `B${m.bar}` : fmtClock(m.sample / sampleRate)}
              </span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemoveMarker(idx); }}
              style={{ 
                border: 'none', background: 'rgba(239, 68, 68, 0.05)', 
                padding: '8px 12px', color: 'var(--daw-red)', 
                opacity: 0.6, cursor: 'pointer', borderLeft: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      )}
    </div>
  );
});

export default CueTimeline;
