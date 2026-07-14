import React, { useState, useEffect, useRef, useCallback } from 'react';
import { isTauri, safeInvoke, safeListen } from '../../utils/tauri';


import HardwarePicker from './HardwarePicker';
import CueTimeline from './CueTimeline';
import ProMixerConsole from './ProMixerConsole';
import PadBoard from './PadBoard'; 
import CloudRepertoire from './CloudRepertoire';
import { supabase } from '../../supabaseClient';
import { OfflineManager } from '../../utils/offlineManager';
import FirstUseTip from '../FirstUseTip';
import './DAW.css';
import * as Icons from 'lucide-react';

const {
  Settings, Play, Pause, Layout, Volume2, Bell, BellOff, FolderOpen,
  Save, Activity, Cloud, X, Loader2, Square, SkipBack, Trash2,
  ChevronUp, ChevronDown, Grid, Crown, Pencil, Check
} = Icons;

const sortTracks = (tracksList) => {
  const priority = (rawName) => {
    if (!rawName) return 10;
    const n = normalizeTrackName(rawName);
    if (n.includes('CLICK') || n.includes('METRO')) return 1;
    if (n.includes('CUE') || n.includes('GUIA')) return 2;
    if (n.includes('DRUM') || n.includes('PERC') || n.includes('BATERIA')) return 3;
    if (n.includes('BASS') || n.includes('BAJO')) return 4;
    if (n.includes('GTR') || n.includes('GUITAR')) return 5;
    if (n.includes('PIANO') || n.includes('KEY') || n.includes('TECLA')) return 6;
    if (n.includes('VOCAL') || n.includes('VOX') || n.includes('VOZ')) return 7;
    return 10;
  };
  return [...tracksList].sort((a, b) => priority(a.name) - priority(b.name));
};

const normalizeTrackName = (name) => {
  if (!name) return 'UNNAMED';
  const clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toUpperCase()
    .replace(/[^A-Z]/g, ''); // Remove numbers, spaces, symbols
  return clean.length > 0 ? clean : name.toUpperCase().replace(/\s/g, '');
};

const getTrackCategory = (rawName) => {
  const n = normalizeTrackName(rawName);
  if (n.includes('CLICK') || n.includes('METRO')) return 'CATEGORY_CLICK';
  if (n.includes('CUE') || n.includes('GUIA') || n.includes('GUIDE')) return 'CATEGORY_CUE';
  if (n.includes('DRUM') || n.includes('PERC') || n.includes('BATERIA') || n.includes('LOOP') || n.includes('SEQ') || n.includes('TRACK')) return 'CATEGORY_DRUMS';
  if (n.includes('BASS') || n.includes('BAJO')) return 'CATEGORY_BASS';
  if (n.includes('GTR') || n.includes('GUITAR') || n.includes('ELEC') || n.includes('ACU') || n.includes('ACOUSTIC')) return 'CATEGORY_GTR';
  if (n.includes('PIANO') || n.includes('KEY') || n.includes('TECLA') || n.includes('SYNTH') || n.includes('PAD') || n.includes('STRING') || n.includes('ORCH') || n.includes('HORN') || n.includes('BRASS') || n.includes('FX')) return 'CATEGORY_KEYS';
  if (n.includes('VOCAL') || n.includes('VOX') || n.includes('VOZ') || n.includes('CHOIR') || n.includes('CORO')) return 'CATEGORY_VOCAL';
  
  // Si no coincide con los clásicos, extraemos la primera palabra relevante para agrupar canciones distintas
  const firstWordMatch = rawName.toUpperCase().match(/[A-Z]+/);
  return firstWordMatch ? `CATEGORY_CUSTOM_${firstWordMatch[0]}` : n;
};

// Función para mostrar nombres limpios y profesionales en la consola
const getStandardName = (rawName) => {
  const cat = getTrackCategory(rawName);
  if (cat === 'CATEGORY_CLICK') return 'CLICK';
  if (cat === 'CATEGORY_CUE') return 'CUES';
  if (cat === 'CATEGORY_DRUMS') return 'DRUMS';
  if (cat === 'CATEGORY_BASS') return 'BASS';
  if (cat === 'CATEGORY_GTR') return 'GUITAR';
  if (cat === 'CATEGORY_KEYS') return 'KEYS';
  if (cat === 'CATEGORY_VOCAL') return 'VOCALS';
  
  // Si no pertenece a los clásicos, intentamos dejarlo lo más limpio posible
  return rawName.replace(/^[0-9_.-]+/, '').substring(0, 12).toUpperCase(); 
};

const SetlistSidebar = React.memo(({ setlist, activeSong, activeSequenceMeta, onSelect, onRemove, onReorder, downloadProgress, handleSyncOffline }) => {
  const [draggedIdx, setDraggedIdx] = useState(null);

  return (
  <aside style={{ 
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: '300px', background: 'rgba(15, 23, 42, 0.4)', 
    borderLeft: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', 
    overflow: 'hidden', backdropFilter: 'blur(30px)', zIndex: 10
  }}>
    <div style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'rgba(255,255,255,0.6)' }}>
        <Icons.Layout size={18} />
        <span style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '2px' }}>SETLIST MANAGER</span>
      </div>
    </div>

    {/* PANEL DE SINCRONIZACIÓN OFFLINE */}
    <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {downloadProgress?.active ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: '800', color: 'var(--daw-cyan)' }}>
            <span>SINCRONIZANDO AUDIO PARA OFFLINE</span>
            <span>{downloadProgress.done} / {downloadProgress.total}</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(downloadProgress.done / Math.max(1, downloadProgress.total)) * 100}%`, height: '100%', background: 'var(--daw-cyan)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      ) : (
        <button 
          onClick={handleSyncOffline}
          style={{ 
            width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
            color: 'white', fontSize: '0.7rem', fontWeight: '800', borderRadius: '8px', cursor: 'pointer',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          title="Descargar todos los audios del setlist a la computadora"
        >
          <Icons.DownloadCloud size={14} />
          PREPARAR SHOW OFFLINE
        </button>
      )}
    </div>
    
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
      {setlist.map((song, idx) => {
        const isActive = activeSong?.id === song.id;
        return (
          <div 
            key={`${song.id}-${idx}`} 
            onClick={() => onSelect(song)}
            draggable={true}
            onDragStart={(e) => {
              setDraggedIdx(idx);
              e.dataTransfer.effectAllowed = 'move';
              // Fallback para navegadores antiguos
              e.dataTransfer.setData('text/plain', idx);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedIdx !== null && draggedIdx !== idx && onReorder) {
                onReorder(draggedIdx, idx);
              }
              setDraggedIdx(null);
            }}
            onDragEnd={() => setDraggedIdx(null)}
            style={{ 
              padding: '16px', borderRadius: '10px', marginBottom: '8px',
              background: isActive ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)' : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: '14px', cursor: 'grab',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
              border: '1px solid',
              borderColor: isActive ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.03)',
              boxShadow: isActive ? '0 4px 15px rgba(0,0,0,0.3)' : 'none',
              position: 'relative', overflow: 'hidden',
              opacity: draggedIdx === idx ? 0.5 : 1
            }}
          >
            {isActive && (
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#a855f7' }} />
            )}

            <div style={{ 
              width: '28px', height: '28px', borderRadius: '6px', 
              background: isActive ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: '900', color: isActive ? '#fff' : 'rgba(255,255,255,0.2)'
            }}>
              {isActive ? <Icons.Play size={14} fill="currentColor" /> : (idx + 1).toString().padStart(2, '0')}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ 
                fontSize: '0.85rem', fontWeight: isActive ? '800' : '500', 
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'
              }}>
                {song.title}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                {/* Para la canción ACTIVA usamos los datos reales de la secuencia cargada
                    (puede diferir del tono/tempo base de la canción); para el resto del
                    setlist, solo tenemos el dato base de la canción como preview. */}
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', fontWeight: '700' }}>
                  {(isActive ? activeSequenceMeta?.bpm : null) || song.bpm || '—'} BPM
                </span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.15)' }}>•</span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', fontWeight: '700' }}>
                  {(isActive ? activeSequenceMeta?.key : null) || song.key || '—'}
                </span>
              </div>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(idx); }} 
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: '4px' }}
            >
              <Icons.Trash2 size={14} />
            </button>
            <div style={{ color: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}>
               <Icons.GripVertical size={16} />
            </div>
          </div>
        );
      })}

      {setlist.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', fontWeight: '700', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          Abre el repertorio para añadir canciones
        </div>
      )}
    </div>
  </aside>
  );
});

const MemoizedMixerConsole = React.memo(ProMixerConsole);

// "6/8" -> 6, "4/4" -> 4, etc. Usado para el conteo de compás/beat en pantalla.
function beatsPerBarFromSignature(sig) {
  const n = parseInt((sig || '4/4').split('/')[0], 10);
  return Number.isFinite(n) && n > 0 ? n : 4;
}

const TIME_SIGNATURES = ['4/4', '3/4', '6/8', '2/4'];

function SequenceMetaEditor({ initial, onCancel, onSave }) {
  const [key, setKey] = useState(initial?.key || '');
  const [bpm, setBpm] = useState(initial?.bpm || '');
  const [timeSignature, setTimeSignature] = useState(initial?.timeSignature || '4/4');

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 300,
      background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px',
      padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
      boxShadow: '0 15px 30px rgba(0,0,0,0.5)', width: '220px'
    }}>
      <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>
        EDITAR SECUENCIA
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <label style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>TONO</label>
        <input
          type="text" value={key} onChange={(e) => setKey(e.target.value)}
          placeholder="Ej: A, Bb, C#m"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 8px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <label style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>TEMPO (BPM)</label>
        <input
          type="number" value={bpm} onChange={(e) => setBpm(e.target.value)}
          placeholder="Ej: 120"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 8px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <label style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>MÉTRICA</label>
        <select
          value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 8px', color: 'white', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
        >
          {TIME_SIGNATURES.map((ts) => (
            <option key={ts} value={ts} style={{ background: '#0f172a' }}>{ts}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '900', cursor: 'pointer' }}
        >
          CANCELAR
        </button>
        <button
          onClick={() => onSave({ key, bpm, timeSignature })}
          style={{ flex: 1, padding: '8px', background: 'var(--daw-cyan)', border: 'none', color: '#000', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <Check size={13} /> GUARDAR
        </button>
      </div>
    </div>
  );
}

const MemoizedTransportUI = React.memo(({
  isPlaying, togglePlay, handleStop, handleRestart,
  setShowCloudBrowser, engineReady,
  metronome, onMetronomeUpdate, deviceChannels,
  showPads, setShowPads,
  playbackSample, sampleRate, totalSamples,
  reconnectAudio, setIsConfigured,
  isLoadingStems,
  transpose = 0, onTransposeChange,
  activeSequenceMeta, editingSequenceMeta, setEditingSequenceMeta, onSaveSequenceMeta
}) => {
  const bpm = metronome.bpm || 120;
  const sr = sampleRate || 44100;
  const samplesPerBeat = (sr * 60) / bpm;
  const samplesPerBar = samplesPerBeat * beatsPerBarFromSignature(activeSequenceMeta?.timeSignature);
  
  const bar = Math.floor(playbackSample / samplesPerBar) + 1;
  const beat = Math.floor((playbackSample % samplesPerBar) / samplesPerBeat) + 1;

  // Formateador de Tiempo (MM:SS)
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentTime = formatTime(playbackSample / sr);
  const totalTime = formatTime((totalSamples || 0) / sr);

  return (
    <header style={{ 
      minHeight: '64px', background: 'rgba(8, 10, 16, 0.8)', 
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      padding: '0 16px', backdropFilter: 'blur(10px)', zIndex: 100,
      flexWrap: 'wrap', gap: '8px', overflow: 'visible'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '8px', 
            background: 'linear-gradient(135deg, #a855f7, #3b82f6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' 
          }}>
            <Icons.Activity size={18} color="white" strokeWidth={3} className={isPlaying ? "animate-pulse" : ""} />
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: '950', color: '#fff', letterSpacing: '2px' }}>BANDLY</span>
        </div>

        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '20px', 
          background: 'rgba(255,255,255,0.03)', padding: '6px 20px', 
          borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)' 
        }}>
          <button onClick={handleRestart} className="transport-btn" style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer' }}><Icons.SkipBack size={16} fill="currentColor" /></button>
          
          <button 
            onClick={togglePlay} 
            disabled={!engineReady} 
            style={{ 
              background: isLoadingStems ? '#78350f' : (isPlaying ? 'rgba(239, 68, 68, 0.15)' : 'linear-gradient(135deg, #a855f7, #3b82f6)'),
              padding: '6px 24px',
              borderRadius: '20px',
              border: isPlaying ? '1px solid #ef4444' : 'none',
              display: 'flex', alignItems: 'center', gap: '10px',
              cursor: isLoadingStems ? 'wait' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isPlaying ? <Icons.Pause size={16} fill="#ef4444" color="#ef4444" /> : <Icons.Play size={16} fill="white" color="white" />}
            <span style={{ fontWeight: '900', fontSize: '0.75rem', color: isPlaying ? '#ef4444' : 'white' }}>
              {isLoadingStems ? 'LOADING' : (isPlaying ? 'PAUSE' : 'PLAY')}
            </span>
          </button>

          <button onClick={handleStop} className="transport-btn" style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer' }}><Icons.Square size={16} fill="currentColor" /></button>
        </div>
      </div>

      {/* CONTADOR - TIME arriba, BAR|BEAT abajo */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
        background: 'rgba(0,0,0,0.3)', padding: '6px 24px', 
        borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
        minWidth: '160px'
      }}>
        {/* Fila 1: Tiempo */}
        <span className="mono-data" style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--daw-cyan)', lineHeight: 1 }}>
          {currentTime}
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: '700', marginLeft: '4px' }}>/ {totalTime}</span>
        </span>
        {/* Fila 2: Bar y Beat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '0.5rem', fontWeight: '900', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px' }}>BAR</span>
            <span className="mono-data" style={{ fontSize: '0.9rem', fontWeight: '950', color: 'rgba(255,255,255,0.7)' }}>{bar}</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '0.5rem', fontWeight: '900', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px' }}>BEAT</span>
            <span className="mono-data" style={{ fontSize: '0.9rem', fontWeight: '950', color: 'rgba(255,255,255,0.7)' }}>{beat}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '6px 15px', borderRadius: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--daw-cyan)', opacity: 0.7 }}>STATUS</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span 
              onClick={!engineReady ? reconnectAudio : null}
              style={{ 
                fontSize: '0.75rem', 
                fontWeight: '900', 
                color: engineReady ? 'var(--daw-green)' : 'var(--daw-red)',
                cursor: !engineReady ? 'pointer' : 'default',
                textDecoration: !engineReady ? 'underline' : 'none'
              }}
              title={!engineReady ? "Click para intentar re-conectar audio" : "Motor Activo"}
            >
              {engineReady ? 'ENGINE READY' : 'NO DRIVER'}
            </span>
            {!engineReady && (
              <button 
                onClick={() => setIsConfigured(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--daw-cyan)', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontWeight: '800' }}
              >
                CAMBIAR
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, position: 'relative' }}>
        {/* Bell toggle */}
        <button
          onClick={() => onMetronomeUpdate('enabled', !metronome.enabled)}
          className={`transport-btn ${metronome.enabled ? 'active-cyan' : ''}`}
          title="Metrónomo (Click)"
        >
          {metronome.enabled ? <Bell size={18} fill="currentColor" /> : <BellOff size={18} />}
        </button>

        {/* TONO / TEMPO / MÉTRICA — datos reales de la secuencia cargada */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '70px' }}>
          <span style={{ fontSize: '0.48rem', fontWeight: '900', color: 'var(--daw-cyan)', opacity: 0.6 }}>TONO / MÉTRICA</span>
          <span className="mono-data" style={{ color: 'white', fontWeight: '900', fontSize: '0.8rem' }}>
            {activeSequenceMeta?.key || '—'} · {activeSequenceMeta?.timeSignature || '4/4'}
          </span>
        </div>

        <button
          onClick={() => setEditingSequenceMeta && setEditingSequenceMeta(v => !v)}
          className={`transport-btn ${editingSequenceMeta ? 'active-cyan' : ''}`}
          title="Editar tono, tempo y métrica de esta secuencia"
          disabled={!activeSequenceMeta}
          style={{ opacity: activeSequenceMeta ? 1 : 0.3 }}
        >
          <Pencil size={15} />
        </button>

        {editingSequenceMeta && activeSequenceMeta && (
          <SequenceMetaEditor
            initial={activeSequenceMeta}
            onCancel={() => setEditingSequenceMeta(false)}
            onSave={(meta) => { onSaveSequenceMeta(meta); setEditingSequenceMeta(false); }}
          />
        )}

        {/* TEMPO */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '52px' }}>
          <span style={{ fontSize: '0.48rem', fontWeight: '900', color: 'var(--daw-cyan)', opacity: 0.6 }}>TEMPO</span>
          <input
            type="number"
            value={metronome.bpm}
            onChange={(e) => onMetronomeUpdate('bpm', parseFloat(e.target.value))}
            className="mono-data"
            style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '900', fontSize: '0.85rem', width: '100%', outline: 'none' }}
          />
        </div>

        {/* OUT CLICK */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '78px' }}>
          <span style={{ fontSize: '0.48rem', fontWeight: '900', color: 'var(--daw-cyan)', opacity: 0.6 }}>OUT CLICK</span>
          <select 
            value={metronome.outputCh}
            onChange={(e) => onMetronomeUpdate('outputCh', parseInt(e.target.value))}
            style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '900', fontSize: '0.72rem', outline: 'none', cursor: 'pointer' }}
          >
            {Array.from({ length: deviceChannels }).map((_, idx) => (
              <option key={idx} value={idx} style={{ background: '#020617' }}>CH {idx + 1} (MONO)</option>
            ))}
          </select>
        </div>

        {/* METRONOME VOLUME */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '0.48rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>MET VOL</span>
          <input 
            type="range" min="0" max="1.5" step="0.01" 
            value={metronome.volume} 
            onChange={(e) => onMetronomeUpdate('volume', parseFloat(e.target.value))}
            style={{ width: '80px', height: '4px', accentColor: '#ffffff' }} 
          />
        </div>

        {/* TAP TEMPO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.48rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>TAP</span>
          <button 
            onClick={() => {
              const now = Date.now();
              const taps = window._bandlyTaps || [];
              const newTaps = [...taps.filter(t => now - t < 2000), now];
              window._bandlyTaps = newTaps;
              if (newTaps.length >= 2) {
                const diffs = [];
                for(let i = 1; i < newTaps.length; i++) diffs.push(newTaps[i] - newTaps[i-1]);
                const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
                const calculatedBpm = Math.round(60000 / avg);
                if (calculatedBpm >= 40 && calculatedBpm <= 250) onMetronomeUpdate('bpm', calculatedBpm);
              }
            }}
            className="tap-btn"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '950', fontSize: '0.65rem', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
          >
            TAP
          </button>
        </div>

        {/* TRANSPOSICIÓN (Varispeed) */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}
          title={`Transposición varispeed: pitch y tempo cambian juntos (como cinta).\n±1 semitono ≈ ±6% de tempo. Cero costo de CPU, calidad intacta.`}
        >
          <span style={{ fontSize: '0.48rem', fontWeight: '900', color: transpose !== 0 ? '#f59e0b' : 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>PITCH</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => onTransposeChange && onTransposeChange(transpose - 1)}
              disabled={transpose <= -6}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '950', fontSize: '0.75rem', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', opacity: transpose <= -6 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >−</button>
            <span
              className="mono-data"
              onDoubleClick={() => onTransposeChange && onTransposeChange(0)}
              title="Doble clic = volver a 0"
              style={{ minWidth: '30px', textAlign: 'center', fontWeight: '900', fontSize: '0.8rem', color: transpose !== 0 ? '#f59e0b' : 'white', cursor: 'pointer' }}
            >
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <button
              onClick={() => onTransposeChange && onTransposeChange(transpose + 1)}
              disabled={transpose >= 6}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '950', fontSize: '0.75rem', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', opacity: transpose >= 6 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >+</button>
          </div>
        </div>
      </div>

    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => setShowPads(!showPads)} 
          className={`icon-btn ${showPads ? 'active-white' : ''}`} 
          title="Toggle Pad Board"
          style={{ background: showPads ? 'rgba(255,255,255,0.1)' : 'transparent' }}
        >
          <Grid size={22} color={showPads ? '#fff' : 'white'} />
        </button>

        <button onClick={() => setShowCloudBrowser(true)} className="icon-btn" title="Repertorio Cloud"><Cloud size={24} /></button>
        <button onClick={() => setIsConfigured(false)} className="icon-btn" title="Configuración de Audio"><Settings size={22} /></button>
      </div>
    </div>
  </header>
  );
});

export default function ProMixer({ session }) {
  // isConfigured arranca en false — la auto-reconexión lo pone en true si el motor responde OK
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingStems, setIsLoadingStems] = useState(false); // Fase 2: Loading visual del Play
  const [tracks, setTracks] = useState([]);
  const [peaks, setPeaks] = useState({}); // Estado independiente para picos de audio (Optimización de Rendimiento)
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvanceTrigger, setAutoAdvanceTrigger] = useState(null);
  const autoAdvanceRef = useRef({ wasPlaying: false });
  const [audioError, setAudioError] = useState(null); 
  const [metronome, setMetronome] = useState({ enabled: true, bpm: 120, volume: 0.5, outputCh: 0 });
  // Transposición varispeed en semitonos (-6..+6). Los markers se guardan en
  // unidades "pitch 0" en la BD y se convierten al pitch actual para mostrar/saltar.
  const [transpose, setTranspose] = useState(0);
  const pitchRatio = Math.pow(2, transpose / 12);
  const pitchRatioRef = useRef(1);
  pitchRatioRef.current = pitchRatio;

  const handleTransposeChange = useCallback(async (semitones) => {
    const clamped = Math.max(-6, Math.min(6, Math.round(semitones)));
    setTranspose(clamped);
    if (isTauri()) await safeInvoke('set_transpose', { semitones: clamped });
  }, []);
  const [deviceChannels, setDeviceChannels] = useState(2); // Volvemos a 2 como base, la app se expandirá según el hardware real
  const [activeSong, setActiveSong] = useState(null);
  const [songs, setSongs] = useState([]);
  const [setlist, setSetlist] = useState([]);
  const [showCloudBrowser, setShowCloudBrowser] = useState(false);
  const [showPads, setShowPads] = useState(true); 
  const [markers, setMarkers] = useState([]);
  const [activeSequenceId, setActiveSequenceId] = useState(null);
  // Metadatos REALES de la secuencia cargada (tono/tempo/métrica) — distintos
  // de los del song base: una canción puede tener secuencias subidas en otro
  // tono, y la UI debe reflejar la secuencia activa, no siempre el default.
  const [activeSequenceMeta, setActiveSequenceMeta] = useState(null);
  const [editingSequenceMeta, setEditingSequenceMeta] = useState(false);
  
  const [totalSamples, setTotalSamples] = useState(0);
  const [playbackSample, setPlaybackSample] = useState(0);
  const [playbackSR, setPlaybackSR] = useState(44100);

  const [engineReady, setEngineReady] = useState(false);
  const [isPrerollActive, setIsPrerollActive] = useState(false);
  const [prerollBars, setPrerollBars] = useState(0);

  const lastActionTime = useRef(0);

  // RADAR DE RESILIENCIA (Detección de Hardware Live)
  useEffect(() => {
    let unlistenFn = null;
    let isMounted = true;
    
    safeListen('audio-device-lost', (event) => {
        setAudioError(`DISPOSITIVO DESCONECTADO: ${event.payload}`);
        setIsPlaying(false);
    }).then(fn => {
        if (isMounted) unlistenFn = fn;
        else if (fn) fn();
    });

    return () => { 
      isMounted = false;
      if (unlistenFn) unlistenFn(); 
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('bandly_setlist');
    if (saved) {
      try { setSetlist(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bandly_setlist', JSON.stringify(setlist));
  }, [setlist]);

  useEffect(() => {
    const fetchSongs = async () => {
      const { data } = await supabase.from('songs').select('*, sequences(*, sequence_stems(*))').order('title');
      if (data) setSongs(data);
    };
    fetchSongs();

    const channel = supabase.channel('daw_songs_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
        // Al haber cambios, volvemos a descargar todo para traer las secuencias y multitracks completos
        fetchSongs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isTauri()) {
      const lastDevice = localStorage.getItem('bandly_last_audio_device');
      const savedBuffer = localStorage.getItem('bandly_buffer_size');
      if (lastDevice) {
        safeInvoke('init_audio_stream', { deviceId: lastDevice })
          .then(() => {
            if (savedBuffer) safeInvoke('set_audio_buffer_size', { size: parseInt(savedBuffer) }).catch(() => {});
            setIsConfigured(true);
          })
          .catch(() => {
            localStorage.removeItem('bandly_last_audio_device');
            setIsConfigured(false);
          });
      } else {
        setIsConfigured(false);
      }
    } else {
      setIsConfigured(true);
    }
  }, []);

  const [downloadProgress, setDownloadProgress] = useState({ active: false, total: 0, done: 0 });

  // Sincronización Offline de Audios (Reemplaza la pre-descarga silenciosa)
  const handleSyncOffline = useCallback(async () => {
    if (!songs.length || !isTauri()) return;
    const token = session?.access_token || '';
    
    // Contar cuántas canciones necesitan descarga
    const sequencesToDownload = [];
    for (const song of songs) {
      const { data: seq } = await supabase.from('sequences').select('id, r2_zip_key').eq('song_id', song.id).maybeSingle();
      if (seq?.r2_zip_key) sequencesToDownload.push({ song, seq });
    }

    if (sequencesToDownload.length > 0) {
      setDownloadProgress({ active: true, total: sequencesToDownload.length, done: 0 });
      let doneCount = 0;

      for (const item of sequencesToDownload) {
        try {
          const songDir = item.song.id.toString();
          const zipUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${item.seq.r2_zip_key}`;
          const zipPath = await safeInvoke('download_multitrack', { url: zipUrl, songId: songDir, fileName: 'multitrack.zip', token }).catch(() => null);
          if (zipPath) {
            await safeInvoke('extract_multitrack_zip', { zipPath, songId: songDir }).catch(() => null);
          }
        } catch { /* Fallo silencioso por track */ }
        
        doneCount++;
        setDownloadProgress(prev => ({ ...prev, done: doneCount }));
      }
      
      // Ocultar mensaje 3 segundos después de terminar
      setTimeout(() => {
        setDownloadProgress({ active: false, total: 0, done: 0 });
      }, 3000);
    }
  }, [songs, session?.access_token]);

  useEffect(() => {
    // Sincronizar automáticamente 2 segundos después de abrir el setlist
    const timer = setTimeout(handleSyncOffline, 2000);
    return () => clearTimeout(timer);
  }, [handleSyncOffline]);

  const reconnectAudio = async () => {
    const lastDevice = localStorage.getItem('bandly_last_audio_device');
    setLoading(true);
    try {
      try { await safeInvoke('kill_audio_stream'); } catch {}
      if (!lastDevice) {
        setIsConfigured(false);
        return;
      }
      await safeInvoke('init_audio_stream', { deviceId: lastDevice });
      setAudioError(null);
    } catch {
      setIsConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncState = useCallback(async () => {
    if (!isTauri()) return;
    try {
      // LATIDO ÚNICO: Consolidación atómica de telemetría (Hito Optimización Performance)
      const report = await safeInvoke('get_engine_report');
      if (!report) return;

      setPlaybackSample(report.sample_pos);
      setPlaybackSR(report.sample_rate);
      setEngineReady(report.is_ready);
      // Sincronización Real: La UI se ajusta exactamente a lo que el hardware reporta
      if (report.device_channels > 0 && report.device_channels !== deviceChannels) {
        setDeviceChannels(report.device_channels);
      }
      setIsPrerollActive(report.preroll_active);
      setPrerollBars(report.preroll_bars);
      setTotalSamples(report.total_samples);

      if (Date.now() - lastActionTime.current > 1000) {
        // Lógica de Auto-Avance: Si estaba reproduciendo y se detuvo naturalmente al llegar al final
        if (autoAdvanceRef.current.wasPlaying && !report.is_playing && report.total_samples > 0 && report.sample_pos >= report.total_samples - 22050) {
          setAutoAdvanceTrigger(Date.now());
        }
        autoAdvanceRef.current.wasPlaying = report.is_playing;
        setIsPlaying(report.is_playing);
      }

      // Actualizar solo los picos de forma aislada (Functional update para evitar re-renders)
      if (report.peaks && Array.isArray(report.peaks)) {
        setPeaks(prev => {
          let numChanges = 0;
          const nextPeaks = { ...prev };
          for (const [id, val] of report.peaks) {
            if (nextPeaks[id] !== val) {
              nextPeaks[id] = val;
              numChanges++;
            }
          }
          return numChanges > 0 ? nextPeaks : prev; // Bailout si no hay cambios
        });
      }
    } catch (e) {
      console.error("[DAW] Sync Error:", e);
    }
  }, [deviceChannels]); // 'deviceChannels' se lee para comparar contra el reporte del motor;
  // sin esto quedaba "pegado" al valor de cuando se creó el callback (bug de closure obsoleto)

  // RE-SINCRONIZACIÓN DE ESTADO (Fuerza Bruta contra caché)

  const handleStop = useCallback(async () => {
    setIsPlaying(false);
    lastActionTime.current = Date.now();
    if (isTauri()) {
      await safeInvoke('toggle_playback', { playing: false });
      await safeInvoke('seek_to_sample', { sample: 0 });
    }
    setPlaybackSample(0);
  }, []);

  const handleRestart = useCallback(async () => {
    lastActionTime.current = Date.now();
    if (isTauri()) {
      await safeInvoke('seek_to_sample', { sample: 0 });
    }
    setPlaybackSample(0);
  }, []);

  const togglePlay = useCallback(async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (isTauri()) {
      const nextState = !isPlaying;
      setIsPlaying(nextState);
      lastActionTime.current = Date.now();
      safeInvoke('toggle_playback', { playing: nextState });
    }
  }, [isPlaying]);

  useEffect(() => {
    // 100ms: VU meters y playhead fluidos. El costo es mínimo — cuando el motor
    // está detenido los valores no cambian y React no re-renderiza (bailout).
    const interval = setInterval(handleSyncState, 100);
    return () => clearInterval(interval);
  }, [handleSyncState]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'SELECT' ||
        document.activeElement.isContentEditable
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === 'Enter') {
        e.preventDefault();
        handleStop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleStop]);

  // Atajos 1-9: saltar al marker N con pre-roll de 2 compases (uso en vivo)
  useEffect(() => {
    const handleDigit = (e) => {
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'SELECT' ||
        document.activeElement.isContentEditable
      ) return;
      const m = e.code.match(/^Digit([1-9])$/);
      if (!m) return;
      const marker = markers[parseInt(m[1], 10) - 1]; // markers ya está ordenado por sample
      if (!marker || !isTauri()) return;
      e.preventDefault();
      safeInvoke('play_with_preroll', { targetSample: Math.round(marker.sample / pitchRatioRef.current), bars: 2 });
    };
    window.addEventListener('keydown', handleDigit);
    return () => window.removeEventListener('keydown', handleDigit);
  }, [markers]);


  const onTrackUpdate = useCallback(async (type, data) => {
    if (!data.trackId) return;
    const { trackId, volume, muted, solo, isStereo, output, band, gainDb } = data;
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const next = { ...t };
        if (type === 'volume') next.volume = volume;
        if (type === 'mute') next.muted = muted;
        if (type === 'solo') next.solo = solo;
        if (type === 'panMode') next.isStereo = isStereo;
        if (type === 'output') next.outputIdx = output;
        if (type === 'eq' && band === 'low') next.eqLow = gainDb;
        if (type === 'eq' && band === 'mid') next.eqMid = gainDb;
        if (type === 'eq' && band === 'high') next.eqHigh = gainDb;

        // Persistencia global por nombre de track (categorizado): SOLO para
        // ruteo de salida (output) — es lo único donde compartir tiene sentido
        // real (la batería casi siempre va a la misma salida física, sin
        // importar la canción). Volumen/mute/solo/estéreo NUNCA se comparten
        // entre canciones — cada una es 100% independiente desde el inicio.
        if (type === 'output') {
          try {
            const profileStr = localStorage.getItem('bandly_mixer_profile') || '{}';
            const profile = JSON.parse(profileStr);
            const trackKey = getTrackCategory(next.name);
            if (!profile[trackKey]) profile[trackKey] = {};
            profile[trackKey].outputIdx = output;
            localStorage.setItem('bandly_mixer_profile', JSON.stringify(profile));
          } catch {}
        }

        // Persistencia POR CANCIÓN (stem específico, id único): tiene prioridad
        // sobre el default global de arriba. Así, cambiar el ruteo de una canción
        // puntual no afecta a las demás — cada una recuerda su propia decisión.
        try {
          const overridesStr = localStorage.getItem('bandly_mixer_song_overrides') || '{}';
          const overrides = JSON.parse(overridesStr);
          if (!overrides[trackId]) overrides[trackId] = {};

          if (type === 'output') overrides[trackId].outputIdx = output;
          if (type === 'panMode') overrides[trackId].isStereo = isStereo;
          if (type === 'mute') overrides[trackId].muted = muted;
          if (type === 'solo') overrides[trackId].solo = solo;
          if (type === 'volume') overrides[trackId].volume = volume;
          // EQ: 100% por canción, igual que volumen/mute/solo — un realce que
          // suena bien en una canción puede no servir en absoluto en otra.
          if (type === 'eq' && band === 'low') overrides[trackId].eqLow = gainDb;
          if (type === 'eq' && band === 'mid') overrides[trackId].eqMid = gainDb;
          if (type === 'eq' && band === 'high') overrides[trackId].eqHigh = gainDb;

          localStorage.setItem('bandly_mixer_song_overrides', JSON.stringify(overrides));
        } catch {}

        return next;
      }
      return t;
    }));
    if (isTauri()) {
      try {
        if (type === 'volume') await safeInvoke('set_track_volume', { trackId, volume });
        if (type === 'mute') await safeInvoke('set_track_mute', { trackId, muted });
        if (type === 'solo') await safeInvoke('set_track_solo', { trackId, soloed: solo });
        if (type === 'panMode') await safeInvoke('set_track_pan_mode', { trackId, isStereo });
        if (type === 'output') await safeInvoke('set_track_output', { trackId, outputIdx: output });
        if (type === 'eq') await safeInvoke('set_track_eq', { trackId, band, gainDb });
      } catch {}
    }
  }, []);

   const handleSyncSong = useCallback(async (song) => {
    if (!song) return;
    // Ya no bloqueamos toda la pantalla con setLoading(true).
    // Usaremos isLoadingStems para que sea transparente y rápido en el botón Play.
    setTranspose(0); // el motor ya resetea pitch_ratio en reset_audio_engine
    try {
      setIsPlaying(false);
      lastActionTime.current = Date.now();
      if (isTauri()) {
        await safeInvoke('toggle_playback', { playing: false });
        await safeInvoke('reset_audio_engine');
        await safeInvoke('seek_to_sample', { sample: 0 });
      }
      // Búsqueda en caché memory-first para 0ms de latencia
      let sequence = song.sequences && song.sequences.length > 0 ? song.sequences[0] : null;
      if (!sequence || !sequence.sequence_stems) {
        const { data } = await supabase.from('sequences').select('*, sequence_stems(*)').eq('song_id', song.id).maybeSingle();
        sequence = data;
      }
      if (!sequence) {
        setTracks([]); setMarkers([]); setActiveSequenceId(null); setActiveSequenceMeta(null);
        return;
      }
      const stems = sequence.sequence_stems || [];
      setActiveSequenceId(sequence.id);
      const loadedTimeSignature = sequence.time_signature || '4/4';
      setActiveSequenceMeta({ key: sequence.key, bpm: sequence.bpm, timeSignature: loadedTimeSignature });
      if (isTauri()) safeInvoke('set_beats_per_bar', { beats: beatsPerBarFromSignature(loadedTimeSignature) });
      setMarkers(sequence.markers || []);

      // El tempo de LA SECUENCIA manda sobre el de la canción base — una canción
      // puede tener secuencias subidas en otro tono/tempo (ver bug reportado).
      const targetBpm = parseFloat(sequence.bpm) || parseFloat(song.bpm) || 120;
      setMetronome(prev => {
        let savedMetro = { ...prev };
        try {
          const savedData = localStorage.getItem('bandly_metronome_profile');
          if (savedData) savedMetro = { ...savedMetro, ...JSON.parse(savedData) };
        } catch {}
        const next = { ...savedMetro, bpm: targetBpm };
        if (isTauri()) {
          safeInvoke('set_metronome', { enabled: false, volume: next.volume, bpm: next.bpm, outputCh: next.outputCh, standalone: true });
        }
        return { ...next, enabled: false };
      });

      // Recuperar: override por canción (prioridad) > default global por categoría > valores base.
      // mixerVolumes es el store viejo (solo volumen) — se mantiene como respaldo
      // para no perder ajustes guardados antes de este cambio.
      let mixerProfile = {};
      let mixerVolumes = {};
      let songOverrides = {};
      try {
        mixerProfile = JSON.parse(localStorage.getItem('bandly_mixer_profile') || '{}');
        mixerVolumes = JSON.parse(localStorage.getItem('bandly_mixer_volumes') || '{}');
        songOverrides = JSON.parse(localStorage.getItem('bandly_mixer_song_overrides') || '{}');
      } catch {}

      const resTracks = stems.map((stem) => {
        const rawName = stem.original_name || stem.instrument_label || 'Inst';
        const cleanName = rawName.replace(/\.[^/.]+$/, ""); // Quita la extensión (.mp3, .wav, etc)
        const trackKey = getTrackCategory(cleanName);
        const displayName = getStandardName(cleanName);
        const savedGlobal = mixerProfile[trackKey] || {};
        const savedSong = songOverrides[stem.id] || {};
        const savedVol = savedSong.volume !== undefined ? savedSong.volume : mixerVolumes[stem.id];

        return {
          // outputIdx: único campo que hereda un default compartido entre canciones (a propósito).
          id: stem.id, name: displayName, peak: 0,
          outputIdx: savedSong.outputIdx !== undefined ? savedSong.outputIdx : (savedGlobal.outputIdx !== undefined ? savedGlobal.outputIdx : 0),
          // Volumen/estéreo/mute/solo: SOLO el ajuste propio de esta canción, o el
          // valor base — nunca heredan de otra canción.
          volume: savedVol !== undefined ? savedVol : 1,
          isStereo: savedSong.isStereo !== undefined ? savedSong.isStereo : true,
          muted: savedSong.muted !== undefined ? savedSong.muted : false,
          solo: savedSong.solo !== undefined ? savedSong.solo : false,
          // EQ: 100% por canción, igual que volumen/mute/solo — nunca hereda de otra.
          eqLow: savedSong.eqLow !== undefined ? savedSong.eqLow : 0,
          eqMid: savedSong.eqMid !== undefined ? savedSong.eqMid : 0,
          eqHigh: savedSong.eqHigh !== undefined ? savedSong.eqHigh : 0,
          color: stem.color || '#8b5cf6', url: stem.r2_key ? `${import.meta.env.VITE_R2_PUBLIC_URL}/${stem.r2_key}` : (stem.playback_url || stem.url)
        };
      });
      setTracks(sortTracks(resTracks));
      setActiveSong(song);
      if (isTauri()) {
        try {
          // PRECARGA: si esta canción ya fue precargada en segundo plano
          // (regla todo-o-nada: solo se usa si terminó de decodificar Y
          // coincide exactamente), el swap es instantáneo — nos saltamos
          // toda la decodificación de abajo. Si no, camino normal de siempre.
          const usedPreload = await safeInvoke('commit_staged_song', { songId: song.id.toString() }).catch(() => false);

          if (usedPreload) {
            setIsLoadingStems(false);
            for (const t of resTracks) {
              safeInvoke('set_track_volume', { trackId: t.id, volume: t.volume }).catch(() => {});
              safeInvoke('set_track_output', { trackId: t.id, outputIdx: t.outputIdx }).catch(() => {});
              safeInvoke('set_track_pan_mode', { trackId: t.id, isStereo: t.isStereo }).catch(() => {});
              safeInvoke('set_track_mute', { trackId: t.id, muted: t.muted }).catch(() => {});
              safeInvoke('set_track_eq', { trackId: t.id, band: 'low', gainDb: t.eqLow }).catch(() => {});
              safeInvoke('set_track_eq', { trackId: t.id, band: 'mid', gainDb: t.eqMid }).catch(() => {});
              safeInvoke('set_track_eq', { trackId: t.id, band: 'high', gainDb: t.eqHigh }).catch(() => {});
            }
          } else {
          setIsLoadingStems(true); // Fase 2: Mostrar estado de carga
          const token = session?.access_token || "";
          const songDir = song.id.toString();
          const syncStemsNatively = async (songId, stemsList) => {
            try {
              const stemsWithState = stemsList.map(s => {
                const rt = resTracks.find(r => r.id === s.id) || {};
                return {
                  id: s.id.toString(),
                  original_name: s.original_name || 'track',
                  volume: rt.volume !== undefined ? rt.volume : 1.0,
                  output_idx: rt.outputIdx !== undefined ? rt.outputIdx : 0,
                  is_stereo: rt.isStereo !== undefined ? rt.isStereo : true,
                  is_muted: rt.muted !== undefined ? rt.muted : false,
                  is_soloed: rt.solo !== undefined ? rt.solo : false
                };
              });

              await safeInvoke('sync_stems_to_engine', {
                songId: songId.toString(),
                stems: stemsWithState
              });
              return true;
            } catch {
              return false;
            }
          };

          const zipKey = sequence.r2_zip_key;
          if (!(await syncStemsNatively(song.id, stems)) && zipKey) {
            const zipDownloadUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${zipKey}`;
            const zipPath = await safeInvoke('download_multitrack', { url: zipDownloadUrl, songId: songDir, fileName: "multitrack.zip", token });
            await safeInvoke('extract_multitrack_zip', { zipPath, songId: songDir });
            await syncStemsNatively(song.id, stems);
          }

          // Aplicar estados guardados (Persistencia)
          const applyStatesToRust = async () => {
            // Un par de reintentos cortos para asegurar que el motor recibió los tracks
            for (let i = 0; i < 15; i++) {
              const report = await safeInvoke('get_engine_report').catch(() => null);
              if (report && report.tracks_loading === 0) {
                // Aplicar ruteos y volúmenes solo una vez cuando la carga termine
                for (const t of resTracks) {
                   safeInvoke('set_track_volume', { trackId: t.id, volume: t.volume }).catch(()=>{});
                   safeInvoke('set_track_output', { trackId: t.id, outputIdx: t.outputIdx }).catch(()=>{});
                   safeInvoke('set_track_pan_mode', { trackId: t.id, isStereo: t.isStereo }).catch(()=>{});
                   safeInvoke('set_track_mute', { trackId: t.id, muted: t.muted }).catch(()=>{});
                   safeInvoke('set_track_eq', { trackId: t.id, band: 'low', gainDb: t.eqLow }).catch(()=>{});
                   safeInvoke('set_track_eq', { trackId: t.id, band: 'mid', gainDb: t.eqMid }).catch(()=>{});
                   safeInvoke('set_track_eq', { trackId: t.id, band: 'high', gainDb: t.eqHigh }).catch(()=>{});
                }
                break;
              }
              await new Promise(r => setTimeout(r, 500));
            }
            setIsLoadingStems(false);
          };
          applyStatesToRust();
          }

          // Precargar la SIGUIENTE canción del setlist en segundo plano (ventana
          // de 2 canciones). No afecta lo que acaba de cargar/sonar — el motor
          // se salta la precarga solo si la RAM del sistema está baja.
          const idx = setlist.findIndex(s => s.id === song.id);
          const nextSong = idx >= 0 ? setlist[idx + 1] : null;
          if (nextSong) {
            (async () => {
              let nextSeq = nextSong.sequences && nextSong.sequences.length > 0 ? nextSong.sequences[0] : null;
              if (!nextSeq || !nextSeq.sequence_stems) {
                const { data } = await supabase.from('sequences').select('*, sequence_stems(*)').eq('song_id', nextSong.id).maybeSingle();
                nextSeq = data;
              }
              if (!nextSeq || !nextSeq.sequence_stems) return;
              const preloadStems = nextSeq.sequence_stems.map(s => ({
                id: s.id.toString(), original_name: s.original_name || 'track',
                volume: 1.0, output_idx: 0, is_stereo: true, is_muted: false, is_soloed: false
              }));
              safeInvoke('preload_song', { songId: nextSong.id.toString(), stems: preloadStems }).catch(() => {});
            })();
          } else {
            safeInvoke('cancel_staging').catch(() => {});
          }
        } catch {
          // Error interno silenciado
        } finally {
          setIsLoadingStems(false);
        }
      }
    } catch {
      // Error de flujo general
    } finally {
      setLoading(false);
      setIsLoadingStems(false);
    }
  }, [session?.access_token, setlist]);

  const onAddMarker = useCallback(async (bar, label, sample, color) => {
    if (!activeSequenceId) return;
    const colors = ['#22d3ee', '#818cf8', '#fbbf24', '#f472b6', '#34d399'];
    // Normalizar a unidades "pitch 0" para que el marker sea válido en cualquier transposición
    const normalizedSample = Math.round(sample * pitchRatioRef.current);
    const newMarker = { id: crypto.randomUUID(), bar, label, sample: normalizedSample, color: color || colors[markers.length % colors.length] };
    const nextMarkers = [...markers, newMarker].sort((a, b) => a.sample - b.sample);
    setMarkers(nextMarkers);
    
    setSongs(prev => prev.map(s => {
      if (s.id === activeSong?.id && s.sequences && s.sequences.length > 0) {
        return { ...s, sequences: [{ ...s.sequences[0], markers: nextMarkers }] };
      }
      return s;
    }));

    await supabase.from('sequences').update({ markers: nextMarkers }).eq('id', activeSequenceId);
  }, [activeSequenceId, markers, activeSong]);

  const onRemoveMarker = useCallback(async (index) => {
    if (!activeSequenceId) return;
    const nextMarkers = markers.filter((_, i) => i !== index);
    setMarkers(nextMarkers);
    
    setSongs(prev => prev.map(s => {
      if (s.id === activeSong?.id && s.sequences && s.sequences.length > 0) {
        return { ...s, sequences: [{ ...s.sequences[0], markers: nextMarkers }] };
      }
      return s;
    }));

    await supabase.from('sequences').update({ markers: nextMarkers }).eq('id', activeSequenceId);
  }, [activeSequenceId, markers, activeSong]);

  // Guarda tono/tempo/métrica de la secuencia ACTIVA (no de la canción base) —
  // corrige el bug donde la UI mostraba siempre el tono/tempo original de la
  // canción aunque se hubiera subido una secuencia distinta en otro tono.
  const handleSaveSequenceMeta = useCallback(async ({ key, bpm, timeSignature }) => {
    if (!activeSequenceId) return;
    const parsedBpm = bpm ? parseInt(bpm, 10) : null;

    setActiveSequenceMeta({ key: key || null, bpm: parsedBpm, timeSignature });
    setMetronome(prev => ({ ...prev, bpm: parsedBpm || prev.bpm }));

    await supabase
      .from('sequences')
      .update({ key: key || null, bpm: parsedBpm, time_signature: timeSignature })
      .eq('id', activeSequenceId);

    if (isTauri()) {
      await safeInvoke('set_beats_per_bar', { beats: beatsPerBarFromSignature(timeSignature) });
    }
    if (isTauri() && parsedBpm) {
      await safeInvoke('set_metronome', {
        enabled: metronome.enabled, volume: metronome.volume, bpm: parsedBpm,
        outputCh: metronome.outputCh, standalone: true,
      });
    }
  }, [activeSequenceId, metronome]);

  const handleRemoveFromSetlist = useCallback((index) => {
    setSetlist(prev => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem('bandly_setlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleReorderSetlist = useCallback((fromIdx, toIdx) => {
    setSetlist(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      localStorage.setItem('bandly_setlist', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (autoAdvanceTrigger && activeSong && setlist.length > 0) {
      const currentIdx = setlist.findIndex(s => s.id === activeSong.id);
      if (currentIdx !== -1 && currentIdx < setlist.length - 1) {
        const nextSong = setlist[currentIdx + 1];
        setTimeout(() => {
          handleSyncSong(nextSong);
        }, 800); // Pequeño retraso para que se note el fin de la canción anterior
      }
    }
  }, [autoAdvanceTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isConfigured) return <HardwarePicker onConfigured={() => {
    setIsConfigured(true);
  }} />;

  return (
    <div className="daw-console" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', maxWidth: '100%', background: '#020617' }}>
      {/* BANNER DE PÁNICO (Resiliencia UX) */}
      {audioError && (
        <div style={{ 
            background: '#ef4444', color: 'white', padding: '10px 20px', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontWeight: '900', fontSize: '0.8rem', letterSpacing: '1px',
            zIndex: 1000, boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Icons.AlertCircle size={20} />
                <span>{audioError.toUpperCase()}</span>
            </div>
            <button 
                onClick={() => setIsConfigured(false)}
                style={{ background: 'white', color: '#ef4444', border: 'none', padding: '6px 15px', borderRadius: '4px', fontWeight: '950', cursor: 'pointer', fontSize: '0.7rem' }}
            >
                RE-CONECTAR AUDIO
            </button>
        </div>
      )}

      {session?.user?.id && (
        <div style={{ padding: '0.5rem 1rem 0' }}>
          <FirstUseTip
            storageKey={`bandly_tip_daw_${session.user.id}`}
            title="Cómo usar el DAW"
            items={[
              'El transporte de arriba controla play/stop y el metrónomo — el tempo lo trae la secuencia que subiste.',
              'Cada canal del mixer tiene volumen, mute/solo y ruteo de salida independiente por canción.',
              'Los marcadores de sección (compás, letra) se ven abajo en la línea de tiempo — puedes saltar a cualquiera con las teclas 1-9.'
            ]}
          />
        </div>
      )}

      <MemoizedTransportUI
          isPlaying={isPlaying} togglePlay={togglePlay} handleStop={handleStop}
          handleRestart={handleRestart} engineReady={engineReady}
          setShowCloudBrowser={setShowCloudBrowser}
          metronome={metronome} deviceChannels={deviceChannels} showPads={showPads} setShowPads={setShowPads}
          playbackSample={playbackSample} sampleRate={playbackSR} totalSamples={totalSamples}
          reconnectAudio={reconnectAudio} setIsConfigured={setIsConfigured}
          isLoadingStems={isLoadingStems}
          transpose={transpose} onTransposeChange={handleTransposeChange}
          activeSequenceMeta={activeSequenceMeta}
          editingSequenceMeta={editingSequenceMeta} setEditingSequenceMeta={setEditingSequenceMeta}
          onSaveSequenceMeta={handleSaveSequenceMeta}
          onMetronomeUpdate={async (type, val) => {
          const next = { ...metronome, [type]: val };
          setMetronome(next);
          try { localStorage.setItem('bandly_metronome_profile', JSON.stringify({ volume: next.volume, outputCh: next.outputCh })); } catch{}
          if (isTauri()) await safeInvoke('set_metronome', { enabled: next.enabled, volume: next.volume, bpm: next.bpm, outputCh: next.outputCh, standalone: true });
        }}
      />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', width: '100%', maxWidth: '100%', position: 'relative' }}>
        <div style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', 
          paddingRight: '300px' 
        }}>
          <div style={{ padding: '0.5rem 0', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--daw-border)' }}>
            <CueTimeline
              progress={totalSamples > 0 ? playbackSample / totalSamples : 0} totalSamples={totalSamples}
              playbackSample={playbackSample} bpm={metronome.bpm} sampleRate={playbackSR}
              hasTempo={!!parseFloat(activeSequenceMeta?.bpm ?? activeSong?.bpm)}
              timeSignature={activeSequenceMeta?.timeSignature || '4/4'}
              markers={pitchRatio === 1 ? markers : markers.map(m => ({ ...m, sample: m.sample / pitchRatio }))}
              onAddMarker={onAddMarker} onRemoveMarker={onRemoveMarker}
              isPrerollActive={isPrerollActive} prerollBars={prerollBars}
              onSeek={(p) => isTauri() && safeInvoke('seek_to_sample', { sample: Math.floor(p * totalSamples) })} 
            />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <MemoizedMixerConsole tracks={tracks} peaks={peaks} onTrackUpdate={onTrackUpdate} deviceChannels={deviceChannels} />
          </div>
             {showPads && <div style={{ borderTop: '1px solid var(--daw-border)', background: '#020617' }}><PadBoard deviceChannels={deviceChannels} sampleRate={playbackSR} /></div>}
          </div>
        <SetlistSidebar setlist={setlist} activeSong={activeSong} activeSequenceMeta={activeSequenceMeta} onSelect={handleSyncSong} onRemove={handleRemoveFromSetlist} onReorder={handleReorderSetlist} loading={loading} downloadProgress={downloadProgress} handleSyncOffline={handleSyncOffline} />
      </main>
      {showCloudBrowser && <CloudRepertoire songs={songs} onClose={() => setShowCloudBrowser(false)} onSelect={(s) => { setSetlist(prev => [...prev, s]); handleSyncSong(s); setShowCloudBrowser(false); }} />}
      {loading && <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,16,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}><Loader2 size={48} className="animate-spin" color="#fff" /><p style={{ marginTop: '2rem', fontWeight: '900', fontSize: '0.9rem', color: '#fff', letterSpacing: '4px', textTransform: 'uppercase' }}>Sincronizando Multitracks...</p></div>}
      
    </div>
  );
}
