import React, { useState, memo, useRef, useEffect, useCallback } from 'react';
import ChannelStrip from './ChannelStrip';
import { Settings, Music, Layers } from 'lucide-react';

const ProMixerConsole = memo(({ tracks = [], peaks = {}, onTrackUpdate, deviceChannels = 2 }) => {
  const [selectedTracks, setSelectedTracks] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      // Si mueve la rueda verticalmente, transformarlo en scroll horizontal
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const toggleSelection = (trackId, isShift) => {
    setSelectedTracks(prev => {
      if (isShift) {
        return prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId];
      }
      return [trackId];
    });
  };

  // useCallback: referencia estable entre renders (solo cambia si selectedTracks u
  // onTrackUpdate cambian) para que ChannelStrip (memo) no se re-renderice de más
  // en cada latido del VU meter (100ms) por culpa de props de función "nuevas".
  const handleVolumeChange = useCallback((trackId, volume) => {
    if (selectedTracks.includes(trackId)) {
      selectedTracks.forEach(id => onTrackUpdate('volume', { trackId: id, volume }));
    } else {
      onTrackUpdate('volume', { trackId, volume });
    }
  }, [selectedTracks, onTrackUpdate]);

  const handleMute = useCallback((trackId, muted) => {
    if (selectedTracks.includes(trackId)) {
      selectedTracks.forEach(id => onTrackUpdate('mute', { trackId: id, muted }));
    } else {
      onTrackUpdate('mute', { trackId, muted });
    }
  }, [selectedTracks, onTrackUpdate]);

  const handleSolo = useCallback((trackId, solo) => {
    if (selectedTracks.includes(trackId)) {
      selectedTracks.forEach(id => onTrackUpdate('solo', { trackId: id, solo }));
    } else {
      onTrackUpdate('solo', { trackId, solo });
    }
  }, [selectedTracks, onTrackUpdate]);

  const handleOutput = useCallback((trackId, output) => {
    // Si la pista cambiada está seleccionada, aplicamos a todas las seleccionadas
    if (selectedTracks.includes(trackId)) {
      selectedTracks.forEach(id => onTrackUpdate('output', { trackId: id, output }));
    } else {
      onTrackUpdate('output', { trackId, output });
    }
  }, [selectedTracks, onTrackUpdate]);

  const handlePanMode = useCallback((trackId, isStereo) => {
    if (selectedTracks.includes(trackId)) {
      selectedTracks.forEach(id => onTrackUpdate('panMode', { trackId: id, isStereo }));
    } else {
      onTrackUpdate('panMode', { trackId, isStereo });
    }
  }, [selectedTracks, onTrackUpdate]);

  const handleEq = useCallback((trackId, band, gainDb) => {
    if (selectedTracks.includes(trackId)) {
      selectedTracks.forEach(id => onTrackUpdate('eq', { trackId: id, band, gainDb }));
    } else {
      onTrackUpdate('eq', { trackId, band, gainDb });
    }
  }, [selectedTracks, onTrackUpdate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', maxWidth: '100%', overflow: 'hidden', background: 'var(--daw-bg)' }}>

      {/* Rack de Canales */}
      <div className="mixer-scroll" ref={scrollRef}>
        {tracks.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
            <Music size={40} />
            <p style={{ fontSize: '0.8rem', marginTop: '10px' }}>CARGA UNA SECUENCIA PARA EMPEZAR</p>
          </div>
        ) : (
          tracks.map((track) => (
            <ChannelStrip 
              key={track.id} 
              track={track}
              peak={peaks[track.id] || 0}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMute}
              onSoloToggle={handleSolo}
              onOutputToggle={handleOutput}
              onPanModeToggle={handlePanMode}
              onEqChange={handleEq}
              onSelect={(isShift) => toggleSelection(track.id, isShift)}
              isSelected={selectedTracks.includes(track.id)}
              deviceChannels={deviceChannels}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default ProMixerConsole;
