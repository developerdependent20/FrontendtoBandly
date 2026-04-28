import React, { useState, memo } from 'react';
import ChannelStrip from './ChannelStrip';
import { Settings, Music, Layers } from 'lucide-react';

const ProMixerConsole = memo(({ tracks = [], peaks = {}, onTrackUpdate, deviceChannels = 2 }) => {
  const [activeSolo, setActiveSolo] = useState(null);

  const handleVolumeChange = (trackId, volume) => {
    onTrackUpdate('volume', { trackId, volume });
  };

  const handleMute = (trackId, muted) => {
    onTrackUpdate('mute', { trackId, muted });
  };

  const handleSolo = (trackId, solo) => {
    setActiveSolo(solo ? trackId : null);
    onTrackUpdate('solo', { trackId, solo });
  };

  const handleOutput = (trackId, output) => {
    onTrackUpdate('output', { trackId, output });
  };

  const handlePanMode = (trackId, isStereo) => {
    onTrackUpdate('panMode', { trackId, isStereo });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--daw-bg)' }}>

      {/* Rack de Canales */}
      <div className="mixer-scroll">
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
              deviceChannels={deviceChannels}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default ProMixerConsole;
