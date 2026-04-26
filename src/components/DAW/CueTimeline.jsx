import React, { useState, useEffect, memo } from 'react';
import { safeInvoke } from '../../utils/tauri';
import { Flag, ChevronRight, AlertCircle, Search, Plus, Trash2, Maximize2, Timer } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';

const CueTimeline = memo(({ 
  bpm = 120, 
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

  // Cálculos de barras y compás actual
  const samplesPerBeat = (sampleRate * 60) / bpm;
  const samplesPerBar = samplesPerBeat * 4;
  const currentBar = Math.floor(playbackSample / samplesPerBar) + 1;
  const totalLengthSamples = totalSamples > 0 ? totalSamples : (samplesPerBar * 128); 
  const progress = totalSamples > 0 ? playbackSample / totalLengthSamples : 0;
  const totalBars = Math.ceil(totalLengthSamples / samplesPerBar);

  const handleJump = async (marker) => {
    // Invocamos el conteo nativo en Rust para máxima precisión
    try {
      await safeInvoke('play_with_preroll', { 
        targetSample: marker.sample, 
        bars: 2  // 2 barras = 8 beats exactos de conteo
      });
    } catch (e) {
      console.error("[DAW] Error al iniciar pre-roll:", e);
    }
  };

  return (
    <div style={{ background: 'var(--daw-panel)', borderBottom: '1px solid var(--daw-border)', padding: '10px 0', position: 'relative' }}>
      
      {/* OVERLAY DE PRE-ROLL (Hito 60 - Conteo Visual) */}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
          <button 
            onClick={() => {
              const label = window.prompt("Nombre del marcador:", `Marker ${markers.length + 1}`);
              if (label && onAddMarker) {
                onAddMarker(currentBar, label, playbackSample);
              }
            }}
            className="tech-btn"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', 
              background: 'rgba(34, 211, 238, 0.1)', color: 'var(--daw-cyan)', 
              border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '4px'
            }}
          >
            <Plus size={16} />
            <span style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '1px' }}>AÑADIR MARKER</span>
          </button>

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

      {/* Área de Forma de Onda con Regla de Marcadores */}
      <div style={{ padding: '0 20px', marginBottom: '12px', position: 'relative', height: '100px' }}>
        <WaveformVisualizer 
          progress={progress} peaks={masterWaveform} onSeek={onSeek}
          zoom={zoom} scrollOffset={scrollOffset} setScrollOffset={setScrollOffset}
          vZoom={vZoom} totalBars={totalBars}
        />
        
        {/* Renderizado de Marcadores sobre la Forma de Onda */}
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

      {/* Navegación Rápida por Marcadores */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 20px', flexWrap: 'wrap' }}>
        {markers.map((m, idx) => (
          <div key={m.id} style={{ 
            display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', 
            borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)',
            transition: 'all 0.2s hover:bg-white/10'
          }}>
            <button 
              onClick={() => handleJump(m)}
              title={`Saltar a compás ${m.bar}`}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', 
                color: 'white', fontSize: '0.75rem', fontWeight: '900',
                background: 'transparent', border: 'none', cursor: 'pointer'
              }}
            >
              <Flag size={14} color={m.color} fill={m.color} />
              <span style={{ letterSpacing: '0.5px' }}>{m.label}</span>
              <span style={{ opacity: 0.4, fontSize: '0.65rem' }}>B{m.bar}</span>
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
          <div style={{ fontSize: '0.7rem', color: 'var(--daw-text-muted)', italic: true, padding: '10px 0' }}>
            No hay marcadores en esta secuencia. Pulsa "AÑADIR MARKER" para empezar.
          </div>
        )}
      </div>
    </div>
  );
});

export default CueTimeline;
