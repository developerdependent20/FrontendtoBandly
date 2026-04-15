import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, Square, X, Settings, Flag, Zap, Circle, Activity, Power, Terminal } from 'lucide-react';
import WaveformTimeline from './WaveformTimeline';
import MixerStrip from './MixerStrip';
import useLiveAudio from '../hooks/useLiveAudio';
import './ProPlayer.css';

/**
 * ProPlayer v3.8 - Operación Opción Nuclear
 * Monitor de Logs de Sistema y Reconstrucción de Motor.
 */
const ProPlayer = ({ song, onClose }) => {
  const {
    isReady,
    setIsReady,
    isPlaying,
    currentTime,
    duration,
    trackStates,
    trackStatus,
    meters,
    debugInfo,
    systemLogs,
    togglePlay,
    awakeEngine,
    panic,
    seek,
    updateTrack,
    error
  } = useLiveAudio(song.stems, song.bpm);

  const [isFlashing, setIsFlashing] = useState(false);
  const [markers, setMarkers] = useState(() => {
    try {
      const saved = localStorage.getItem(`markers_${song.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const triggerFlash = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`pro-player-overlay ${isFlashing ? 'click-flash' : ''}`}>
      {error && (
        <div className="pro-loader is-error">
          <div className="loader-box">
             <Zap size={48} color="#ef4444" />
             <h2>BLOQUEO DEL MOTOR</h2>
             <p>{error}</p>
             <button className="pro-action-btn" onClick={() => window.location.reload()}>REINICIAR APP</button>
          </div>
        </div>
      )}

      {!isReady && !error && (
        <div className="pro-loader">
          <div className="loader-box diagnostic-dashboard">
            <header className="diag-header">
               <Activity className="pulse-fast" size={32} color="var(--primary)" />
               <div>
                 <h2>PREPARANDO BANDA CABAL</h2>
                 <p className="status-badge">Detectados {song.stems.length} instrumentos</p>
               </div>
            </header>
            <div className="stems-progress-list">
              {song.stems.map((s, idx) => {
                const trackKey = `track_${idx}`;
                const status = trackStatus[trackKey] || 'Esperando...';
                return (
                  <div key={trackKey} className={`stem-progress-item ${status === 'Listo' ? 'ready' : ''}`}>
                    <span className="name">{s.instrument_label || s.name}</span>
                    <span className="status-text">{status}</span>
                  </div>
                );
              })}
            </div>
            <div className="diag-actions">
               <button className="pro-action-btn urgent" onClick={() => setIsReady(true)}>FORZAR MEZCLADOR</button>
               <button className="pro-action-btn secondary" onClick={onClose}>SALIR</button>
            </div>
          </div>
        </div>
      )}

      {isReady && !error && (
        <>
          <header className="pro-player-header">
            <div className="song-info-badge">
              <div className="info-main">
                <span className="song-tone">{song.key || 'D'}</span>
                <span className="song-bpm">{song.bpm || '120'}</span>
              </div>
              <div className="clock-display">
                 {formatTime(currentTime)}
              </div>
            </div>

            <div className="transport-controls">
              <button className="ctrl-btn" onClick={() => seek(0)}><SkipBack size={24} /></button>
              <button 
                className={`ctrl-btn primary ${isPlaying ? 'is-playing' : ''}`} 
                onClick={() => {
                   triggerFlash();
                   togglePlay();
                }}
              >
                {isPlaying ? <Square size={32} fill="#fff" /> : <Play size={32} fill="#fff" />}
              </button>
              <button className="ctrl-btn" onClick={panic}><Circle size={24} fill="#666" /></button>
            </div>

            <div className="song-meta">
              <h2>{song.title || 'Mezclador Principal'}</h2>
              <div className="engine-status">
                 <span className={`dot ${isPlaying ? 'active pulse' : 'active'}`}></span>
                 <span className="engine-lbl">SYSTEM ONLINE</span>
              </div>
            </div>

            <button className="close-player-btn" onClick={onClose}><X size={24} /></button>
          </header>

          <div className="playback-timeline-strip">
            <WaveformTimeline currentTime={currentTime} duration={duration} markers={markers} onSeek={seek} onRemoveMarker={() => {}} />
          </div>

          <main className="mixer-rack">
            <div className="mixer-scroll-container">
              {song.stems.map((stem, idx) => {
                const trackKey = `track_${idx}`;
                const state = trackStates[trackKey];
                if (state?.isClickOrCue) {
                  return <MixerStrip key={trackKey} stem={stem} state={state} meter={meters?.[trackKey]?.meter} onUpdate={(upd) => updateTrack(trackKey, upd)} />;
                }
                return null;
              })}

              <div className="mixer-v-divider"></div>

              {song.stems.map((stem, idx) => {
                const trackKey = `track_${idx}`;
                const state = trackStates[trackKey];
                if (!state?.isClickOrCue) {
                  return <MixerStrip key={trackKey} stem={stem} state={state} meter={meters?.[trackKey]?.meter} onUpdate={(upd) => updateTrack(trackKey, upd)} />;
                }
                return null;
              })}
            </div>
          </main>

          <section className="diagnostic-black-box">
            <header>
               <Terminal size={12} className="pulse-fast" /> 
               CONSOLA DE COMANDO NUCLEAR (v3.8)
            </header>
            
            <div className="heartbeat-stats">
               <div className="h-stat">MOTOR: <span>{debugInfo.__heartbeat?.time || '0.00'}s</span></div>
               <div className="h-stat">STATE: <span>{debugInfo.__heartbeat?.state || 'INIT'}</span></div>
               <div className="h-stat">CTX: <span style={{ color: debugInfo.__heartbeat?.context === 'running' ? '#4ade80' : '#ef4444' }}>{debugInfo.__heartbeat?.context || 'WAIT'}</span></div>
               
               <button className="pro-action-btn urgent mini" onClick={() => { triggerFlash(); awakeEngine(); }}>
                  <Power size={10} /> DESPERTAR MOTOR (NUCLEAR)
               </button>
            </div>

            <div className="system-logs-panel">
               {systemLogs.map((log, i) => (
                 <div key={i} className="log-line">
                   <span className="log-arrow">›</span> {log}
                 </div>
               ))}
               {systemLogs.length === 0 && <div className="log-line ghost">Esperando eventos del sistema...</div>}
            </div>

            <div className="debug-grid mini">
              {Object.entries(debugInfo).filter(([k]) => k !== '__heartbeat').map(([id, info]) => (
                <div key={id} className={`debug-item ${info.status === 'Error' ? 'is-err' : ''}`}>
                   <span className="dot"></span>
                   <div className="info">
                     <p className="name">{info.name}</p>
                     <p className="status">{info.status}</p>
                   </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="playback-footer-mini">
             <div className="master-vu-mini">
                <span className="lbl">LR MASTER</span>
                <div className="vu-tiny-bars">
                   <div className="fill" style={{ height: isPlaying ? '60%' : '0%' }}></div>
                   <div className="fill" style={{ height: isPlaying ? '55%' : '0%' }}></div>
                </div>
             </div>
          </footer>
        </>
      )}
    </div>
  );
};

export default ProPlayer;
