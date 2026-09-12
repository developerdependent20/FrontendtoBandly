import React, { useState, useEffect, useRef, memo } from 'react';
import { safeInvoke } from '../../utils/tauri';
import { Flag, ChevronRight, AlertCircle, Search, Plus, Trash2, Maximize2, Timer, Magnet } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';

function fmtClock(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Secciones típicas de una canción: un clic = marker con color consistente
const SECTION_PRESETS = [
  { label: 'INTRO', color: '#38bdf8' },
  { label: 'VERSO', color: '#10b981' },
  { label: 'PRE-CORO', color: '#fbbf24' },
  { label: 'CORO', color: '#ef4444' },
  { label: 'PUENTE', color: '#a855f7' },
  { label: 'SOLO', color: '#f97316' },
  { label: 'FINAL', color: '#64748b' },
];

// "6/8" -> 6, "4/4" -> 4, etc.
function beatsPerBarFromSignature(sig) {
  const n = parseInt((sig || '4/4').split('/')[0], 10);
  return Number.isFinite(n) && n > 0 ? n : 4;
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
  onSeek
}) => {

  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [vZoom, setVZoom] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [markerLabel, setMarkerLabel] = useState('');
  const [snapEnabled, setSnapEnabled] = useState(true);
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
  const currentBar = Math.floor(playbackSample / samplesPerBar) + 1;
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
  // Snap: a beats reales por compás con tempo, a ticks de tiempo sin tempo.
  const snapDivisions = gridMode === 'bars' ? gridTicks * beatsPerBar : gridTicks;

  // Sección activa: último marker cuyo sample ya pasó (markers viene ordenado)
  let activeMarkerIdx = -1;
  for (let i = 0; i < markers.length; i++) {
    if (markers[i].sample <= playbackSample) activeMarkerIdx = i;
    else break;
  }

  const handleJump = async (marker) => {
    try {
      await safeInvoke('play_with_preroll', {
        targetSample: marker.sample,
        bars: 2
      });
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
            width: '320px', background: '#0f172a', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)', padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.8rem', fontWeight: '900', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>NUEVO MARCADOR</h3>

            {/* Compás destino: editable. Escribe el número y el marker cae
                exacto en esa línea de compás, sin cazar la posición a mano. */}
            {gridMode === 'bars' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>COMPÁS</span>
                <button
                  onClick={() => setMarkerBar(String(Math.max(1, (parseInt(markerBar, 10) || 1) - 1)))}
                  style={{ width: '28px', height: '32px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: '900' }}
                >−</button>
                <input
                  type="number"
                  min="1"
                  value={markerBar}
                  onChange={(e) => setMarkerBar(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmMarker(); }}
                  style={{
                    width: '80px', textAlign: 'center', background: 'rgba(34,211,238,0.08)',
                    border: '1px solid rgba(34,211,238,0.4)', padding: '8px', borderRadius: '6px',
                    color: 'var(--daw-cyan)', fontSize: '1.1rem', fontWeight: '900', outline: 'none'
                  }}
                />
                <button
                  onClick={() => setMarkerBar(String((parseInt(markerBar, 10) || 0) + 1))}
                  style={{ width: '28px', height: '32px', borderRadius: '6px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: '900' }}
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
                    color: p.color, fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.5px'
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
                padding: '12px 16px', borderRadius: '8px', color: '#fff', fontSize: '1rem',
                outline: 'none', marginBottom: '20px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer' }}
              >
                CANCELAR
              </button>
              <button 
                onClick={confirmMarker}
                style={{ flex: 1, padding: '10px', background: 'var(--daw-cyan)', border: 'none', color: '#000', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '950', cursor: 'pointer' }}
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
          background: 'rgba(8,10,16,0.9)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out', border: '2px solid var(--daw-cyan)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <Timer size={64} color="var(--daw-cyan)" className="animate-pulse" />
            <span className="mono-data" style={{ fontSize: '7rem', fontWeight: '950', color: 'white', textShadow: '0 0 50px var(--daw-cyan)' }}>
              {prerollBars}
            </span>
          </div>
          <div style={{ marginTop: '1.5rem', letterSpacing: '8px', fontWeight: '900', color: 'var(--daw-cyan)', fontSize: '1.2rem', textTransform: 'uppercase' }}>
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
              title="Añadir marcador — atajo: tecla M (captura la posición exacta sin parar la canción)"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px',
                background: 'rgba(34, 211, 238, 0.1)', color: 'var(--daw-cyan)',
                border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '4px'
              }}
            >
              <Plus size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '1px' }}>AÑADIR MARKER</span>
              <span style={{
                fontSize: '0.55rem', fontWeight: '900', color: 'rgba(255,255,255,0.45)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px',
                padding: '1px 5px', lineHeight: 1.4
              }}>M</span>
            </button>
            {/* Compás actual en vivo: saber dónde vas sin adivinar en la onda */}
            {gridMode === 'bars' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px',
                background: 'rgba(255,255,255,0.03)', borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <span style={{ fontSize: '0.55rem', fontWeight: '900', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px' }}>COMPÁS</span>
                <span className="mono-data" style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--daw-cyan)', minWidth: '28px', textAlign: 'right' }}>{currentBar}</span>
              </div>
            )}
            <button
              onClick={() => setSnapEnabled(!snapEnabled)}
              className="tech-btn"
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: '0',
                background: snapEnabled ? 'rgba(34, 211, 238, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
                color: snapEnabled ? 'var(--daw-cyan)' : 'rgba(255, 255, 255, 0.3)', 
                border: `1px solid ${snapEnabled ? 'var(--daw-cyan)' : 'transparent'}`, 
                borderRadius: '6px', transition: 'all 0.2s'
              }}
              title={`Snap to Grid (${snapEnabled ? 'On' : 'Off'})`}
            >
              <Magnet size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '4px 15px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Search size={14} style={{ color: 'var(--daw-cyan)', opacity: 0.6 }} />
              <input 
                type="range" min="0" max="100" step="1" 
                value={( (Math.log10(zoom) - Math.log10(0.1)) / (Math.log10(20) - Math.log10(0.1)) ) * 100} 
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const newZoom = Math.pow(10, (val / 100) * (Math.log10(20) - Math.log10(0.1)) + Math.log10(0.1));
                    setZoom(newZoom);
                }}
                style={{ width: '120px', height: '4px', accentColor: 'var(--daw-cyan)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Maximize2 size={14} style={{ color: 'var(--daw-cyan)', opacity: 0.6 }} />
              <input 
                type="range" min="1" max="10" step="0.1" 
                value={vZoom} 
                onChange={(e) => setVZoom(parseFloat(e.target.value))}
                style={{ width: '80px', height: '4px', accentColor: 'var(--daw-cyan)' }}
              />
            </div>
          </div>
      </div>

      <div style={{ padding: '0 20px', marginBottom: '8px', position: 'relative', height: '70px' }}>
        <WaveformVisualizer
          progress={progress} peaks={masterWaveform} onSeek={onSeek}
          zoom={zoom} scrollOffset={scrollOffset} setScrollOffset={setScrollOffset}
          vZoom={vZoom} totalBars={gridTicks} snapToGrid={snapEnabled}
          gridMode={gridMode} secondsPerTick={secondsPerTick}
          majorEvery={majorEvery} snapDivisions={snapDivisions}
        />
        
        <div style={{ position: 'absolute', inset: '0 20px', pointerEvents: 'none', overflow: 'hidden' }}>
           {markers.map((m) => {
              const posProgress = totalSamples > 0 ? m.sample / totalSamples : 0;
              const left = `${(posProgress * 100 * zoom) - (scrollOffset * 100 * (zoom - 1))}%`;
              return (
                <div key={m.id} style={{ 
                  position: 'absolute', left, top: 0, bottom: 0, 
                  width: '2px', background: m.color || 'var(--daw-cyan)',
                  boxShadow: `0 0 15px ${m.color || 'var(--daw-cyan)'}`,
                  zIndex: 50, transition: 'left 0.1s linear'
                }}>
                  <div style={{ 
                    position: 'absolute', top: 0, left: '2px', 
                    background: m.color || 'var(--daw-cyan)', color: '#000',
                    fontSize: '0.65rem', fontWeight: '950', padding: '2px 8px',
                    borderRadius: '0 4px 4px 0', whiteSpace: 'nowrap',
                    boxShadow: '4px 0 10px rgba(0,0,0,0.3)'
                  }}>
                    {m.label.toUpperCase()}
                  </div>
                </div>
              );
           })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', padding: '0 20px', flexWrap: 'wrap' }}>
        {markers.map((m, idx) => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center',
            background: idx === activeMarkerIdx ? `${m.color}18` : 'rgba(255,255,255,0.03)',
            borderRadius: '4px',
            border: `1px solid ${idx === activeMarkerIdx ? m.color : 'rgba(255,255,255,0.08)'}`,
            boxShadow: idx === activeMarkerIdx ? `0 0 12px ${m.color}44` : 'none',
            transition: 'all 0.2s'
          }}>
            <button
              onClick={() => handleJump(m)}
              title={`${gridMode === 'bars' ? `Saltar a compás ${m.bar}` : `Saltar a ${fmtClock(m.sample / sampleRate)}`}${idx < 9 ? ` — Atajo: tecla ${idx + 1}` : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px',
                color: 'white', fontSize: '0.75rem', fontWeight: '900',
                background: 'transparent', border: 'none', cursor: 'pointer'
              }}
            >
              {idx < 9 && (
                <span style={{
                  fontSize: '0.55rem', fontWeight: '900', color: 'rgba(255,255,255,0.45)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '3px',
                  padding: '1px 5px', lineHeight: 1.4
                }}>{idx + 1}</span>
              )}
              <Flag size={14} color={m.color} fill={m.color} />
              <span style={{ letterSpacing: '0.5px' }}>{m.label}</span>
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
        {markers.length === 0 && (
          <div style={{ 
            width: '100%', padding: '15px 0', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.02)', borderRadius: '8px', 
            border: '1px dashed rgba(255,255,255,0.08)', marginTop: '4px'
          }}>
            <Flag size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700', margin: 0 }}>Aún no hay marcadores</p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>Agrega Intro, Verso, Coro o Puente para organizar tu secuencia.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default CueTimeline;
