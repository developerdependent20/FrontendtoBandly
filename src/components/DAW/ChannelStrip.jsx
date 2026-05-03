import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Headphones } from 'lucide-react';

// Constantes físicas del Fader
const FADER_HEIGHT = 140;

const ChannelStrip = memo(({ track, peak = 0, onVolumeChange, onMuteToggle, onSoloToggle, onOutputToggle, onPanModeToggle, onSelect, isSelected, deviceChannels = 2 }) => {
  const [localVol, setLocalVol] = useState(track.volume !== undefined ? Math.round(track.volume * 100) : 100);
  const [isMuted, setIsMuted] = useState(track.muted || false);
  const [isSolo, setIsSolo] = useState(track.solo || false);
  const [isStereo, setIsStereo] = useState(true);
  const [localOutputIdx, setLocalOutputIdx] = useState(track.outputIdx || 0);

  // Sincronizar estado local cuando cambia la prop (vital para ruteo simultáneo)
  useEffect(() => {
    setLocalOutputIdx(track.outputIdx || 0);
  }, [track.outputIdx]);

  // Sincronizar volumen inicial al cambiar de canción
  useEffect(() => {
    if (track.volume !== undefined) {
      setLocalVol(Math.round(track.volume * 100));
    }
    setIsMuted(track.muted || false);
    setIsSolo(track.solo || false);
  }, [track.volume, track.muted, track.solo]);
  
  // Sincronización Senior: Validar límites de salida al cambiar modo de paneo
  useEffect(() => {
    const maxIdx = isStereo ? Math.ceil(deviceChannels / 2) - 1 : deviceChannels - 1;
    if (localOutputIdx > maxIdx) {
      const safeIdx = 0; // Fallback al Master 1-2
      setLocalOutputIdx(safeIdx);
      onOutputToggle && onOutputToggle(track.id, safeIdx);
    }
  }, [isStereo, deviceChannels]);

  // --- DRAGGABLE FADER LOGIC ---
  const faderRef = useRef(null);
  const isDragging = useRef(false);

  const rafId = useRef(null);

  const calculateVolumeFromY = useCallback((clientY) => {
    if (!faderRef.current) return;
    const rect = faderRef.current.getBoundingClientRect();
    // Invertir Y (0 arriba, FADER_HEIGHT abajo) -> Volumen (0 abajo, 120 arriba)
    let newY = rect.bottom - clientY; 
    newY = Math.max(0, Math.min(newY, FADER_HEIGHT)); // Clamp
    
    // Escala del Fader: 0 a 120
    const calculatedVol = Math.round((newY / FADER_HEIGHT) * 120);
    
    // Solo actualizar si el valor cambió para reducir la carga en React y Tauri
    setLocalVol((prev) => {
      if (prev !== calculatedVol) {
        onVolumeChange(track.id, calculatedVol / 100);
        return calculatedVol;
      }
      return prev;
    });
  }, [track.id, onVolumeChange]);

  const handlePointerDown = (e) => {
    isDragging.current = true;
    calculateVolumeFromY(e.clientY);
    
    // Capturar eventos de mouse a nivel global para un arrastre fluido profesional
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = useCallback((e) => {
    if (isDragging.current) {
      e.preventDefault(); 
      // Throttle con requestAnimationFrame para evitar IPC flooding a Tauri
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => calculateVolumeFromY(e.clientY));
    }
  }, [calculateVolumeFromY]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    window.removeEventListener('pointermove', handlePointerMove);

    window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove]);

  // Clic doble = Reset a 100
  const handleDoubleClick = () => {
    setLocalVol(100);
    onVolumeChange(track.id, 1.0);
  };

  // --- INTEGRATED VU METER LOGIC (CSS Based) ---
  const [smoothedLevel, setSmoothedLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const lastPeakTime = useRef(0);
  
  useEffect(() => {
    // Nivel suavizado (Se actualizará mediante la transición CSS de 80ms)
    setSmoothedLevel(peak);

    // Lógica de Peak Hold (Pico se mantiene 1.5 segundos)
    if (peak >= peakLevel) {
      setPeakLevel(peak);
      lastPeakTime.current = Date.now();
    } else {
      // Si el nivel baja, esperamos 1.5s antes de soltar el pico
      const timer = setTimeout(() => {
        const timeDiff = Date.now() - lastPeakTime.current;
        if (timeDiff >= 1500) {
          setPeakLevel(prev => {
            const next = prev * 0.94;
            return next < 1 ? 0 : next; // Detiene el renderizado infinito
          }); 
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [peak, peakLevel]);

  // Color dinámico según umbrales DAW standard
  const getVUColor = (lvl) => {
    if (lvl > 90) return '#ef4444'; // Rojo (Clip > 90%)
    if (lvl > 70) return '#fbbf24'; // Ámbar (Precaución 70-90%)
    return '#10b981'; // Verde (Nivel óptimo < 70%)
  };


  return (
    <div 
      className={`channel-strip ${isSelected ? 'selected' : ''}`} 
      style={{ 
        borderTop: `3px solid ${track.color || 'var(--daw-cyan)'}`, 
        filter: isSelected ? 'none' : 'saturate(0.4)',
        background: isSelected ? 'rgba(34, 211, 238, 0.05)' : 'transparent',
        transition: 'all 0.2s'
      }}
    >
      <div 
        className="channel-name" 
        onClick={(e) => onSelect && onSelect(e.shiftKey)}
        style={{ 
          color: isSelected ? 'var(--daw-cyan)' : '#ffffff', 
          minHeight: '44px', 
          flexShrink: 0, 
          padding: '0 4px', 
          fontSize: '11px', 
          fontWeight: isSelected ? '900' : '400', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center', 
          letterSpacing: '0.5px',
          cursor: 'pointer',
          background: isSelected ? 'rgba(34, 211, 238, 0.1)' : 'transparent'
        }}
      >
        {track.name || 'Inst'}
      </div>
      
      <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center' }}>
        {/* Contenedor Unificado: Fader Draggable + VU Overlay */}
        <div 
          ref={faderRef}
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          style={{ 
            position: 'relative', 
            height: `${FADER_HEIGHT}px`, 
            width: '36px',
            cursor: 'ns-resize',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 0 14px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.4)'
          }}

          title={`Vol: ${Math.round((localVol / 120) * 100)}%  •  Doble clic = Reset`}
        >
          {/* Capa Base: VU Meter Integrado (Divs Senior) */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: '#060a14',
            zIndex: 1
          }}>
            {/* Barra de Señal Viva */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: `${Math.min(100, smoothedLevel)}%`,
              background: getVUColor(smoothedLevel),
              transition: 'height 80ms ease-out',
              boxShadow: `0 0 10px ${getVUColor(smoothedLevel)}44`
            }} />

            {/* Marca de Peak Hold */}
            <div style={{
              position: 'absolute',
              bottom: `${Math.min(100, peakLevel)}%`,
              left: 0,
              width: '100%',
              height: '2px',
              background: 'white',
              boxShadow: '0 0 8px white',
              zIndex: 4,
              transition: 'bottom 150ms ease-out'
            }} />

            {/* Rejilla técnica */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {[...Array(11)].map((_, i) => (
                <div key={i} style={{ 
                  position: 'absolute', 
                  bottom: `${(i / 10) * 100}%`, 
                  width: '100%', 
                  height: '1px', 
                  background: 'rgba(255,255,255,0.05)' 
                }} />
              ))}
            </div>
          </div>

          {/* Carril de arrastre central visual */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: 0,
            bottom: 0,
            width: '4px',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 2 // Encima del canvas
          }}></div>

          {/* Knob Profesional */}
          <div 
            className="fader-knob" 
            style={{ 
              position: 'absolute',
              bottom: `${(localVol / 120) * 100}%`, 
              left: '50%',
              transform: 'translateX(-50%)',
              height: '24px',
              marginTop: '-12px', // Centrar knob basado en su altura (24px std)
              zIndex: 3, // Siempre al frente
              transition: 'box-shadow 0.1s ease',
              width: '40px', // Hacerlo sobresalir un poco a los lados
              background: 'linear-gradient(to bottom, #333, #111)',
              borderRadius: '4px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.2), 0 0 0 1px rgba(0,0,0,0.8)'
            }}
          >
            {/* Línea horizontal en el medio del knob para precisión visual */}
            <div style={{ width: '100%', height: '2px', background: 'var(--daw-bg)', position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)' }}></div>
            <div style={{ width: '80%', height: '1px', background: 'var(--daw-cyan)', opacity: 0.6, position: 'absolute', top: '50%', left: '10%', transform: 'translateY(-50%)' }}></div>
          </div>
        </div>
      </div>

      <div className="button-grid">
        <button 
          className={`tech-btn ${isMuted ? 'active-mute' : ''}`}
          onClick={() => { setIsMuted(!isMuted); onMuteToggle(track.id, !isMuted); }}
        >
          M
        </button>
        <button 
          className={`tech-btn ${isSolo ? 'active-solo' : ''}`}
          onClick={() => { setIsSolo(!isSolo); onSoloToggle(track.id, !isSolo); }}
        >
          S
        </button>
        <button 
          className={`tech-btn ${isStereo ? 'active-stereo' : ''}`}
          style={{ gridColumn: 'span 2', fontSize: '0.55rem', letterSpacing: '1px' }}
          onClick={() => { 
            const next = !isStereo;
            setIsStereo(next); 
            onPanModeToggle && onPanModeToggle(track.id, next);
          }}
        >
          {isStereo ? 'STEREO' : 'MONO'}
        </button>
      </div>

      <div style={{ padding: '6px 8px 8px', borderTop: '1px solid var(--daw-border)' }}>
        <select 
           value={localOutputIdx}
           onChange={(e) => {
             const val = parseInt(e.target.value);
             setLocalOutputIdx(val);
             onOutputToggle && onOutputToggle(track.id, val);
           }}
           className="mono-data"
           style={{ 
             background: 'rgba(0,0,0,0.35)', 
             color: 'var(--daw-cyan)', 
             border: '1px solid rgba(255,255,255,0.08)', 
             fontSize: '0.62rem', 
             padding: '5px 4px', 
             borderRadius: '6px', 
             cursor: 'pointer', 
             outline: 'none',
             width: '100%',
             fontWeight: '700',
             textAlign: 'center',
             letterSpacing: '0.04em'
           }}

           title="ASIO Output Bus"
        >
           {Array.from({ length: isStereo ? Math.ceil(deviceChannels / 2) : deviceChannels }).map((_, idx) => {
              const label = isStereo ? `OUT ${idx * 2 + 1}-${idx * 2 + 2}` : `OUT ${idx + 1}`;
              return <option key={idx} value={idx}>{label}</option>;
           })}
        </select>
      </div>
    </div>
  );
});

export default ChannelStrip;
