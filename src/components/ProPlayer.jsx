import React, { useState } from 'react';
import { Play, Pause, Square, Zap, Settings, SkipForward, SkipBack, ListMusic } from 'lucide-react';
import { useLiveAudio } from '../hooks/useLiveAudio';
import WaveformTimeline from './WaveformTimeline';
import MixerStrip from './MixerStrip';
import './ProPlayer.css';

const ProPlayer = ({ song, onClose }) => {
  const {
    isReady,
    isPlaying,
    currentTime,
    duration,
    trackStates,
    togglePlay,
    panic,
    seek,
    updateTrack,
    error
  } = useLiveAudio(song.stems);

  const [showSettings, setShowSettings] = useState(false);

  // Debug logs
  console.log('[ProPlayer] Stems:', song.stems?.length);
  console.log('[ProPlayer] Ready:', isReady, 'Error:', error);

  if (error) {
    return (
      <div className="pro-loader is-error">
        <Zap className="loading-icon" style={{ color: '#ef4444' }} />
        <p className="error-text">ERROR CRÍTICO DE AUDIO</p>
        <span className="error-detail">{error}</span>
        <button className="pro-action-btn" onClick={onClose} style={{ marginTop: '1rem' }}>VOLVER</button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="pro-loader">
        <Zap className="loading-icon" />
        <p>RECALIBRANDO CONSOLA...</p>
        <button 
          className="pro-action-btn" 
          onClick={onClose} 
          style={{ marginTop: '2rem', borderColor: 'rgba(255,255,255,0.2)', opacity: 0.6 }}
        >
          CANCELAR CARGA
        </button>
      </div>
    );
  }

  if (!song.stems || song.stems.length === 0) {
    return (
      <div className="pro-loader is-error">
        <p className="error-text">SIN PISTAS CONFIGURADAS</p>
        <span className="error-detail">Esta canción no tiene stems válidos para reproducir.</span>
        <button className="pro-action-btn" onClick={onClose} style={{ marginTop: '1rem' }}>VOLVER</button>
      </div>
    );
  }

  // Separar Click/Cues de los instrumentos para el ruteo visual solicitado
  const stemIds = Object.keys(trackStates);
  const priorityIds = stemIds.filter(id => trackStates[id].isClickOrCue);
  const musicIds = stemIds.filter(id => !trackStates[id].isClickOrCue);

  return (
    <div className="pro-player-overlay">
      <div className="pro-player-container">
        {/* Header: Title and Top Actions */}
        <header className="pro-header">
          <div className="song-info">
            <span className="live-badge">LIVE</span>
            <h1>{song.name} <span className="song-key-bpm">{song.key || 'E'} // {song.bpm || 120} BPM</span></h1>
          </div>
          <div className="pro-actions">
            <button className="pro-action-btn"><ListMusic size={20} /> SETLIST</button>
            <button className="pro-action-btn" onClick={() => setShowSettings(!showSettings)}>
              <Settings size={20} /> CONFIG
            </button>
            <button className="close-pro-btn" onClick={onClose}>SALIR</button>
          </div>
        </header>

        {/* Timeline Section */}
        <div className="pro-timeline-section">
          <WaveformTimeline 
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
          />
        </div>

        {/* Main Console: Horizontal scrollable mixer */}
        <main className="pro-console">
          <div className="mixer-scroll-container">
            {/* Primero Click/Cues */}
            {priorityIds.map(id => (
              <MixerStrip 
                key={id}
                stem={song.stems.find(s => s.id === id)}
                state={trackStates[id]}
                onUpdate={updateTrack}
              />
            ))}
            
            {/* Separador visual opcional */}
            <div className="mixer-divider"></div>

            {/* Resto de instrumentos */}
            {musicIds.map(id => (
              <MixerStrip 
                key={id}
                stem={song.stems.find(s => s.id === id)}
                state={trackStates[id]}
                onUpdate={updateTrack}
              />
            ))}
          </div>
        </main>

        {/* Footer: Transport and Panic */}
        <footer className="pro-footer">
          <div className="transport-group main-controls">
            <button className="transport-btn skip"><SkipBack size={24} /></button>
            <button 
              className={`transport-btn play-pause ${isPlaying ? 'active' : ''}`}
              onClick={togglePlay}
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} />}
            </button>
            <button className="transport-btn stop" onClick={panic}><Square size={24} /></button>
            <button className="transport-btn skip"><SkipForward size={24} /></button>
          </div>

          <div className="transport-group stats">
            <div className="stat-box">
              <span className="stat-label">MASTER BUS</span>
              <div className="master-meter">
                <div className="meter-inner"></div>
              </div>
            </div>
          </div>

          <div className="panic-group">
            <button className="killer-switch" onClick={panic}>
              <Zap size={18} /> KILLER SWITCH
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ProPlayer;
