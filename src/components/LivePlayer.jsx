import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, Square, SkipBack, SkipForward, 
  Volume2, VolumeX, AlertTriangle, Download, 
  CheckCircle2, Loader2, Music, X
} from 'lucide-react';
import { useLiveAudio } from '../hooks/useLiveAudio';
import { OfflineManager } from '../utils/offlineManager';
import './LivePlayer.css';

export default function LivePlayer({ song, setlist = [], onNext, onClose }) {
  const [offlineStatus, setOfflineStatus] = useState('checking'); // 'checking', 'ready', 'none'
  const [showMixer, setShowMixer] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  // El motor de audio robusto
  const {
    isReady,
    isPlaying,
    currentTime,
    duration,
    error,
    togglePlay,
    panic,
    seek
  } = useLiveAudio(song?.stems || []);

  // Verificar estado offline al cargar
  useEffect(() => {
    if (song?.id) {
      OfflineManager.isSongDownloaded(song.id).then(exists => {
        setOfflineStatus(exists ? 'ready' : 'none');
      });
    }
  }, [song]);

  const handleDownload = async () => {
    if (!song?.stems) return;
    setIsDownloading(true);
    try {
      for (const stem of song.stems) {
        await OfflineManager.downloadStep(song.id, stem.id, stem.playbackUrl);
      }
      setOfflineStatus('ready');
    } catch (err) {
      alert('Error al descargar secuencias');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="live-player-overlay">
      <div className="live-player-container">
        
        {/* Top Bar */}
        <div className="live-header">
          <div className="live-song-info">
            <div className="live-icon-box">
              <Music size={24} />
            </div>
            <div>
              <h1 className="live-title">{song?.title || 'Sin Título'}</h1>
              <div className="live-meta">
                <span className="live-badge">{song?.key || '---'}</span>
                <span className="live-badge">{song?.bpm || '---'} BPM</span>
                {offlineStatus === 'ready' ? (
                  <span className="live-badge offline-ready">
                    <CheckCircle2 size={12} /> OFFLINE READY
                  </span>
                ) : (
                  <button onClick={handleDownload} disabled={isDownloading} className="live-download-btn">
                    {isDownloading ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
                    {isDownloading ? 'DESCARGANDO...' : 'DESCARGAR PARA VIVO'}
                  </button>
                )}
              </div>
            </div>
          </div>
          <button className="live-close" onClick={onClose}><X size={24} /></button>
        </div>

        {/* Main Display */}
        <div className="live-display">
          <div className="live-time-display">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="time-divider">/</span>
            <span className="total-time">{formatTime(duration)}</span>
          </div>
          
          {/* Progress Bar Gigante */}
          <div className="live-progress-container" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            seek(percent * duration);
          }}>
            <div className="live-progress-bar">
              <div 
                className="live-progress-fill" 
                style={{ width: `${(currentTime / duration) * 100}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Transport Controls (GIGANTES) */}
        <div className="live-controls">
          <button className="ctrl-btn secondary" onClick={() => seek(0)}>
            <SkipBack size={40} />
          </button>
          
          <button 
            className={`ctrl-btn primary ${isPlaying ? 'playing' : ''} ${!isReady ? 'loading' : ''}`}
            onClick={togglePlay}
            disabled={!isReady}
          >
            {!isReady ? (
              <Loader2 size={60} className="spin" />
            ) : isPlaying ? (
              <Pause size={60} />
            ) : (
              <Play size={60} style={{ marginLeft: '8px' }} />
            )}
          </button>

          <button className="ctrl-btn secondary" onClick={onNext}>
            <SkipForward size={40} />
          </button>
        </div>

        {/* Footer / Altura de Pánico */}
        <div className="live-footer">
          <div className="live-status">
            {error ? (
              <div className="status-error">
                <AlertTriangle size={16} /> {error}
              </div>
            ) : isReady ? (
              <div className="status-ok">SISTEMA LISTO</div>
            ) : (
              <div className="status-loading">PREPARANDO AUDIO...</div>
            )}
          </div>

          <div className="live-footer-actions">
            {/* Auto Advance Toggle */}
            <button 
              className={`live-auto-btn ${autoAdvance ? 'active' : ''}`}
              onClick={() => setAutoAdvance(!autoAdvance)}
            >
              MODO AUTO: {autoAdvance ? 'ON' : 'OFF'}
            </button>

            {/* EL BOTON DE PANICO (Killer Switch) */}
            <button className="live-panic-btn" onClick={() => {
              if(confirm('¿ACTIVAR KILLER SWITCH? Esto detendrá todo el audio de inmediato.')) {
                panic();
              }
            }}>
              <AlertTriangle size={20} /> KILLER SWITCH
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
