import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Music } from 'lucide-react';
import './MixerStrip.css';

/**
 * MixerStrip Pro v3.6 - Modo Fantasma y Resiliencia
 */
const MixerStrip = ({ stem, state, meter, onUpdate }) => {
  const [vuLevel, setVuLevel] = useState(-Infinity);
  const animRef = useRef();

  // Bucle de animación para el vúmetro (VU Meter)
  useEffect(() => {
    if (!meter) return;
    
    const updateLevel = () => {
      const val = meter.getValue();
      // El valor viene en dB (-Infinity a 0)
      setVuLevel(Array.isArray(val) ? val[0] : val);
      animRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
    return () => cancelAnimationFrame(animRef.current);
  }, [meter]);

  // Variables calculadas con salvaguarda (Modo Fantasma)
  const volume = state?.volume ?? -12;
  const isMuted = state?.muted ?? false;
  const isSoloed = state?.soloed ?? false;
  const trackName = state?.name || stem?.instrument_label || stem?.name || 'Track';
  const isClick = state?.isClickOrCue ?? false;

  // Normalización del nivel VU para la barra visual (de -60dB a +6dB)
  const normalizedHeight = Math.max(0, Math.min(100, (vuLevel + 60) * 1.6));

  return (
    <div className={`m32-strip ${isSoloed ? 'is-solo' : ''} ${isMuted ? 'is-muted' : ''} ${!state ? 'is-ghost' : ''}`}>
      
      {/* 1. Scribble Strip (LCD Screen) */}
      <div className="strip-header">
        <div className={`raw-badge ${isClick ? 'priority' : 'instrument'}`}>
          {isClick ? <Headphones size={12} /> : <Music size={12} />}
          <span>{trackName?.toUpperCase()}</span>
        </div>
      </div>

      {/* 2. LED Meter Bridge */}
      <div className="vu-meter-container">
        <div className="vu-scale">
          <span>0</span><span>-6</span><span>-12</span><span>-18</span><span>-30</span><span>-60</span>
        </div>
        <div className="vu-glass">
          <div 
            className="vu-fill" 
            style={{ height: `${normalizedHeight}%` }}
          ></div>
        </div>
      </div>

      {/* 3. M32 Controls (Solo / Mute) */}
      <div className="strip-controls">
        <button 
          className={`btn-m32 solo ${isSoloed ? 'active' : ''}`}
          onClick={() => onUpdate({ soloed: !isSoloed })}
          disabled={!state}
        >
          SOLO
        </button>
        
        <button 
          className={`btn-m32 mute ${isMuted ? 'active' : ''}`}
          onClick={() => onUpdate({ muted: !isMuted })}
          disabled={!state}
        >
          MUTE
        </button>
      </div>

      {/* 4. Midas Style Fader */}
      <div className="fader-track">
        <input 
          type="range"
          min="-60"
          max="6"
          step="0.1"
          value={volume}
          onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
          disabled={!state}
        />
        <div className="fader-db-value">
          {state ? `${volume > 0 ? '+' : ''}${volume.toFixed(1)} dB` : 'LOADING...'}
        </div>
      </div>

      {/* 5. Routing Info (Pequeña info visual) */}
      <div className="strip-footer-info">
        <span>OUT {isClick ? '1-2' : 'L-R'}</span>
      </div>
    </div>
  );
};

export default MixerStrip;
