import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import {
  X, Play, Pause, Square, Volume2, VolumeX, Headphones,
  Loader2, Music, SkipBack, ArrowLeft, Pencil, Trash2, Check, AlertTriangle
} from 'lucide-react';
import './SequenceMixer.css';

const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : ''
);

export default function SequenceMixer({ sequence, onClose, session }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [channels, setChannels] = useState([]);
  
  // Estados para edición
  const [isEditing, setIsEditing] = useState(false);
  const [editedKey, setEditedKey] = useState(sequence?.key || '');
  const [editedBpm, setEditedBpm] = useState(sequence?.bpm || '');
  const [isSaving, setIsSaving] = useState(false);

  const playersRef = useRef({});
  const gainNodesRef = useRef({});
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(0);

  // ── Funciones de Gestión ──
  const handleUpdateMetadata = async () => {
    if (!session?.access_token) return;
    setIsSaving(true);
    try {
      const resp = await fetch(`${API_URL}/api/sequences/${sequence.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ key: editedKey, bpm: editedBpm })
      });
      if (!resp.ok) throw new Error('Error al actualizar');
      
      setIsEditing(false);
      // Opcional: Notificar al padre o simplemente mostrar éxito local
    } catch (err) {
      alert("No se pudo actualizar la información.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Seguro que quieres borrar esta secuencia permanentemente?")) return;
    if (!session?.access_token) return;
    
    setIsSaving(true);
    try {
      const resp = await fetch(`${API_URL}/api/sequences/${sequence.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!resp.ok) throw new Error('Error al eliminar');
      
      onClose();
      // Recargar la página o notificar que ya no hay secuencia
      window.location.reload(); 
    } catch (err) {
      alert("No se pudo eliminar la secuencia.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Cargar todos los stems ──
  useEffect(() => {
    if (!sequence?.stems || sequence.stems.length === 0) return;

    const loadStems = async () => {
      setIsLoading(true);

      try {
        const channelData = [];
        const players = {};
        const gains = {};

        // --- Ordenar Stems (Click y Cues primero) ---
        const getWeight = (s) => {
          const label = (s.instrument_label || s.original_name || '').toLowerCase();
          if (label.includes('click') || label.includes('metronomo')) return 1;
          if (label.includes('cue') || label.includes('guia')) return 2;
          return 10;
        };

        const sortedStems = [...sequence.stems].sort((a, b) => getWeight(a) - getWeight(b));

        for (const stem of sortedStems) {
          const player = new Tone.Player({
            url: stem.playbackUrl,
            fadeIn: 0.01,
            fadeOut: 0.01,
          });

          const gain = new Tone.Gain(0.8).toDestination();
          player.connect(gain);

          players[stem.id] = player;
          gains[stem.id] = gain;

          channelData.push({
            id: stem.id,
            label: stem.instrument_label || stem.original_name,
            type: stem.instrument_type,
            color: stem.color || '#8b5cf6',
            volume: 80,
            muted: false,
            solo: false,
          });
        }

        // Esperar a que todos los buffers estén cargados
        await Tone.loaded();

        // Calcular duración máxima
        let maxDuration = 0;
        for (const [id, player] of Object.entries(players)) {
          if (player.buffer && player.buffer.duration > maxDuration) {
            maxDuration = player.buffer.duration;
          }
        }

        playersRef.current = players;
        gainNodesRef.current = gains;
        setChannels(channelData);
        setDuration(maxDuration);
        setIsLoading(false);

      } catch (err) {
        console.error('[MIXER] Error loading stems:', err);
        setIsLoading(false);
      }
    };

    loadStems();

    return () => {
      // Cleanup
      Object.values(playersRef.current).forEach(p => {
        try { p.stop(); p.dispose(); } catch(e) {}
      });
      Object.values(gainNodesRef.current).forEach(g => {
        try { g.dispose(); } catch(e) {}
      });
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sequence]);

  // ── Play / Pause ──
  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      // Pause
      Object.values(playersRef.current).forEach(p => {
        try { p.stop(); } catch(e) {}
      });
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(false);
      return;
    }

    // Play
    await Tone.start();
    const offset = currentTime;

    Object.values(playersRef.current).forEach(p => {
      try {
        if (p.buffer && p.buffer.loaded) {
          p.start(Tone.now(), offset);
        }
      } catch(e) { console.warn('Player start error:', e); }
    });

    startTimeRef.current = Tone.now() - offset;
    setIsPlaying(true);

    // Animation frame for time tracking
    const tick = () => {
      const elapsed = Tone.now() - startTimeRef.current;
      if (elapsed >= duration) {
        handleStop();
        return;
      }
      setCurrentTime(elapsed);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [isPlaying, currentTime, duration]);

  // ── Stop ──
  const handleStop = useCallback(() => {
    Object.values(playersRef.current).forEach(p => {
      try { p.stop(); } catch(e) {}
    });
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  // ── Restart ──
  const handleRestart = useCallback(() => {
    handleStop();
    setCurrentTime(0);
  }, [handleStop]);

  // ── Seek ──
  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * duration;

    if (isPlaying) {
      Object.values(playersRef.current).forEach(p => {
        try { p.stop(); } catch(e) {}
      });
      Object.values(playersRef.current).forEach(p => {
        try {
          if (p.buffer && p.buffer.loaded) {
            p.start(Tone.now(), newTime);
          }
        } catch(e) {}
      });
      startTimeRef.current = Tone.now() - newTime;
    }

    setCurrentTime(newTime);
  }, [isPlaying, duration]);

  // ── Volume change ──
  const handleVolumeChange = useCallback((stemId, value) => {
    const gain = gainNodesRef.current[stemId];
    if (gain) {
      gain.gain.rampTo(value / 100, 0.05);
    }
    setChannels(prev => prev.map(ch =>
      ch.id === stemId ? { ...ch, volume: value } : ch
    ));
  }, []);

  // ── Mute ──
  const handleMute = useCallback((stemId) => {
    setChannels(prev => {
      const updated = prev.map(ch => {
        if (ch.id !== stemId) return ch;
        const newMuted = !ch.muted;
        const gain = gainNodesRef.current[stemId];
        if (gain) {
          gain.gain.rampTo(newMuted ? 0 : ch.volume / 100, 0.05);
        }
        return { ...ch, muted: newMuted };
      });
      return updated;
    });
  }, []);

  // ── Solo ──
  const handleSolo = useCallback((stemId) => {
    setChannels(prev => {
      const clickedChannel = prev.find(ch => ch.id === stemId);
      const newSoloState = !clickedChannel.solo;

      const updated = prev.map(ch => {
        if (ch.id === stemId) {
          return { ...ch, solo: newSoloState };
        }
        return { ...ch, solo: false };
      });

      // Apply to gain nodes
      const anySolo = updated.some(ch => ch.solo);
      updated.forEach(ch => {
        const gain = gainNodesRef.current[ch.id];
        if (!gain) return;
        if (anySolo) {
          gain.gain.rampTo(ch.solo ? ch.volume / 100 : 0, 0.05);
        } else {
          gain.gain.rampTo(ch.muted ? 0 : ch.volume / 100, 0.05);
        }
      });

      return updated;
    });
  }, []);

  // ── Format time ──
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Render ──
  return (
    <div className="mx-overlay">
      <div className="mx-container">

        {/* Header */}
        <div className="mx-header">
          <div className="mx-header-left">
            <button className="mobile-nav-back" onClick={onClose}>
              <ArrowLeft size={20} />
            </button>
            <Headphones size={20} className="hide-mobile" />
            <div className="mx-header-info">
              <h2>Mixer</h2>
              <div className="mx-meta">
                {sequence?.title && <span className="mx-title-display h-hide-mobile">{sequence.title}</span>}
                
                {isEditing ? (
                  <div className="mx-edit-form">
                    <input 
                      type="text" 
                      value={editedKey} 
                      onChange={(e) => setEditedKey(e.target.value)} 
                      placeholder="Tono" 
                      className="mx-edit-input"
                    />
                    <input 
                      type="number" 
                      value={editedBpm} 
                      onChange={(e) => setEditedBpm(e.target.value)} 
                      placeholder="BPM" 
                      className="mx-edit-input"
                    />
                    <button onClick={handleUpdateMetadata} disabled={isSaving} className="mx-edit-save" title="Guardar">
                      {isSaving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="mx-edit-cancel" title="Cancelar">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="mx-badge mx-badge-key">Tono: {editedKey || sequence?.key || '---'}</span>
                    <span className="mx-badge mx-badge-bpm">{(editedBpm || sequence?.bpm || '---')} BPM</span>
                    <button className="mx-action-btn" onClick={() => setIsEditing(true)} title="Editar información">
                      <Pencil size={14} />
                    </button>
                    <button className="mx-action-btn mx-delete-btn" onClick={handleDelete} title="Eliminar secuencia">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button className="mx-close hide-mobile" onClick={onClose}><X size={22} /></button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="mx-loading">
            <Loader2 size={40} className="spin-slow" />
            <p>Cargando stems para reproducción...</p>
            <span>Esto puede tomar unos segundos</span>
          </div>
        )}

        {/* Mixer Body */}
        {!isLoading && (
          <div className="mx-body">

            {/* Transport Bar */}
            <div className="mx-transport">
              <div className="mx-transport-buttons">
                <button className="mx-btn" onClick={handleRestart} title="Reiniciar">
                  <SkipBack size={18} />
                </button>
                <button className={`mx-btn mx-btn-play ${isPlaying ? 'playing' : ''}`} onClick={handlePlay}>
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button className="mx-btn" onClick={handleStop} title="Detener">
                  <Square size={16} />
                </button>
              </div>

              <div className="mx-time">{formatTime(currentTime)}</div>

              {/* Seek Bar */}
              <div className="mx-seekbar" onClick={handleSeek}>
                <div className="mx-seekbar-fill" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
                <div className="mx-seekbar-head" style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
              </div>

              <div className="mx-time">{formatTime(duration)}</div>
            </div>

            {/* Channel Strips */}
            <div className="mx-channels">
              {channels.map(ch => (
                <div key={ch.id} className={`mx-channel ${ch.muted ? 'muted' : ''} ${ch.solo ? 'solo' : ''}`}>

                  {/* Color bar */}
                  <div className="mx-ch-color" style={{ background: ch.color }} />

                  {/* Label */}
                  <div className="mx-ch-label">{ch.label}</div>

                  {/* Volume slider */}
                  <div className="mx-ch-slider-wrap" style={{ position: 'relative' }}>
                    {/* Scale Ticks */}
                    <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '10px', transform: 'translateY(-50%)', display: 'flex', justifyContent: 'space-between', padding: '0 5px', pointerEvents: 'none', opacity: 0.3 }}>
                      {[...Array(11)].map((_, i) => (
                        <div key={i} style={{ width: '1px', height: i % 5 === 0 ? '10px' : '5px', background: 'white' }} />
                      ))}
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ch.muted ? 0 : ch.volume}
                      onChange={(e) => handleVolumeChange(ch.id, parseInt(e.target.value))}
                      className="mx-ch-slider"
                      style={{ '--slider-color': ch.color }}
                    />
                    <span className="mx-ch-db">{ch.muted ? '—' : ch.volume}</span>
                  </div>

                  {/* Mute / Solo */}
                  <div className="mx-ch-buttons">
                    <button
                      className={`mx-ch-btn mx-ch-mute ${ch.muted ? 'active' : ''}`}
                      onClick={() => handleMute(ch.id)}
                      title="Mute"
                    >
                      {ch.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <button
                      className={`mx-ch-btn mx-ch-solo ${ch.solo ? 'active' : ''}`}
                      onClick={() => handleSolo(ch.id)}
                      title="Solo"
                    >
                      S
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
