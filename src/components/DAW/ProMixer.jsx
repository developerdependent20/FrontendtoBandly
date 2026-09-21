import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { isTauri, safeInvoke, safeListen } from '../../utils/tauri';


import HardwarePicker from './HardwarePicker';
import CueTimeline from './CueTimeline';
import ArrangementPanel from './ArrangementPanel';
import ProMixerConsole from './ProMixerConsole';
import PadBoard from './PadBoard'; 
import CloudRepertoire from './CloudRepertoire';
import { supabase } from '../../supabaseClient';
import { OfflineManager } from '../../utils/offlineManager';
import { alertDialog } from '../../utils/dialogService';
import {
  makeTimelineMapper, toTimelineEvents, detectCueSections, mergeDetectedMarkers, stripClip, SECTION_PRESETS,
  beatsPerBarFromSignature as lanesBeatsPerBar,
} from '../../utils/timelineLanes';
import { nameVariants } from '../../utils/cueSpeech';
import { useSectionMidi } from '../../hooks/useSectionMidi';
import './DAW.css';
import * as Icons from 'lucide-react';

const {
  Settings, Play, Pause, Layout, Volume2, Bell, BellOff, FolderOpen,
  Save, Activity, Cloud, X, Loader2, Square, SkipBack, Trash2,
  ChevronUp, ChevronDown, Grid, Crown, Pencil, Check
} = Icons;

// Líneas de Letras y Luces de la timeline (columna sequences.timeline_lanes).
// Cada cue guarda su posición en unidades "pitch 0", igual que los markers.
//   lyrics: [{ id, sample, slideId }]   → diapositiva de presenter_slides
//   lights: [{ id, sample, scene }]     → nombre de escena en Bandly Lights
const EMPTY_LANES = { lyrics: [], lights: [] };
const bySample = (a, b) => a.sample - b.sample;

async function fetchLyricSlides(songId) {
  const { data } = await supabase.from('presenter_slides').select('id, slides').eq('song_id', songId).maybeSingle();
  return { rowId: data?.id || null, slides: Array.isArray(data?.slides) ? data.slides : [] };
}

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
    width: '300px', background: 'rgba(23, 23, 26, 0.4)', 
    borderLeft: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', 
    overflow: 'hidden', backdropFilter: 'blur(30px)', zIndex: 10
  }}>
    <div style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'rgba(255,255,255,0.6)' }}>
        <Icons.Layout size={18} />
        <span style={{ fontSize: '0.7rem', fontWeight: '500', letterSpacing: '0.5px' }}>SETLIST MANAGER</span>
      </div>
    </div>

    {/* PANEL DE SINCRONIZACIÓN OFFLINE */}
    <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {downloadProgress?.active ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: '500', color: 'var(--daw-cyan)' }}>
            <span>SINCRONIZANDO AUDIO PARA OFFLINE</span>
            <span>{downloadProgress.done} / {downloadProgress.total}</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${(downloadProgress.done / Math.max(1, downloadProgress.total)) * 100}%`, height: '100%', background: '#f7f4ef', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      ) : (
        <button 
          onClick={handleSyncOffline}
          style={{ 
            width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
            color: 'white', fontSize: '0.7rem', fontWeight: '500', borderRadius: '12px', cursor: 'pointer',
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
              padding: '16px', borderRadius: '12px', marginBottom: '8px',
              background: isActive ? 'linear-gradient(rgba(247, 244, 239, 0.04), rgba(247, 244, 239, 0.04))' : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: '14px', cursor: 'grab',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
              border: '1px solid',
              borderColor: isActive ? 'rgba(247, 244, 239, 0.18)' : 'rgba(255,255,255,0.03)',
              boxShadow: isActive ? '0 4px 15px rgba(0,0,0,0.3)' : 'none',
              position: 'relative', overflow: 'hidden',
              opacity: draggedIdx === idx ? 0.5 : 1
            }}
          >
            {isActive && (
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#fd429c' }} />
            )}

            <div style={{ 
              width: '28px', height: '28px', borderRadius: '6px', 
              background: isActive ? 'rgba(247, 244, 239, 0.11)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: '500', color: isActive ? '#fff' : 'rgba(255,255,255,0.2)'
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
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', fontWeight: '500' }}>
                  {(isActive ? activeSequenceMeta?.bpm : null) || song.bpm || '—'} BPM
                </span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.15)' }}>•</span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', fontWeight: '500' }}>
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
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', fontWeight: '500', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px' }}>
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
      background: '#17171a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px',
      padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
      boxShadow: '0 15px 30px rgba(0,0,0,0.5)', width: '220px'
    }}>
      <span style={{ fontSize: '0.6rem', fontWeight: '500', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>
        EDITAR SECUENCIA
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <label style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>TONO</label>
        <input
          type="text" value={key} onChange={(e) => setKey(e.target.value)}
          placeholder="Ej: A, Bb, C#m"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 8px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <label style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>TEMPO (BPM)</label>
        <input
          type="number" value={bpm} onChange={(e) => setBpm(e.target.value)}
          placeholder="Ej: 120"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 8px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <label style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>MÉTRICA</label>
        <select
          value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 8px', color: 'white', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
        >
          {TIME_SIGNATURES.map((ts) => (
            <option key={ts} value={ts} style={{ background: '#17171a' }}>{ts}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '500', cursor: 'pointer' }}
        >
          CANCELAR
        </button>
        <button
          onClick={() => onSave({ key, bpm, timeSignature })}
          style={{ flex: 1, padding: '8px', background: '#f7f4ef', border: 'none', color: '#101012', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
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
      minHeight: '64px', background: 'rgba(16, 16, 18, 0.8)', 
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      padding: '0 16px', backdropFilter: 'blur(10px)', zIndex: 100,
      flexWrap: 'wrap', gap: '8px', overflow: 'visible'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '6px', 
            background: '#17171a', border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icons.Activity size={16} color="#f7f4ef" strokeWidth={2} className={isPlaying ? "animate-pulse" : ""} />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: '500', color: '#f7f4ef', letterSpacing: '0.16em' }}>BANDLY</span>
        </div>

        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '20px', 
          background: 'rgba(255,255,255,0.03)', padding: '6px 20px', 
          borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' 
        }}>
          <button onClick={handleRestart} className="transport-btn" style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer' }}><Icons.SkipBack size={16} fill="currentColor" /></button>
          
          <button 
            onClick={togglePlay} 
            disabled={!engineReady} 
            style={{ 
              background: isLoadingStems ? '#3a3a3e' : (isPlaying ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #fd429c, #ff6a4a)'),
              padding: '8px 22px',
              borderRadius: '9999px',
              border: isPlaying ? '1px solid rgba(255,255,255,0.22)' : '1px solid transparent',
              display: 'flex', alignItems: 'center', gap: '10px',
              cursor: isLoadingStems ? 'wait' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isPlaying ? <Icons.Pause size={16} fill="#f7f4ef" color="#f7f4ef" /> : <Icons.Play size={16} fill="white" color="white" />}
            <span style={{ fontWeight: '500', fontSize: '0.8rem', color: isPlaying ? '#f7f4ef' : 'white' }}>
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
        <span className="mono-data" style={{ fontSize: '1.3rem', fontWeight: '500', color: 'var(--daw-cyan)', lineHeight: 1 }}>
          {currentTime}
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: '500', marginLeft: '4px' }}>/ {totalTime}</span>
        </span>
        {/* Fila 2: Bar y Beat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '0.5rem', fontWeight: '500', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px' }}>BAR</span>
            <span className="mono-data" style={{ fontSize: '0.9rem', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{bar}</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '0.5rem', fontWeight: '500', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px' }}>BEAT</span>
            <span className="mono-data" style={{ fontSize: '0.9rem', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>{beat}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '6px 15px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: '500', color: 'var(--daw-cyan)', opacity: 0.7 }}>STATUS</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span 
              onClick={!engineReady ? reconnectAudio : null}
              style={{ 
                fontSize: '0.75rem', 
                fontWeight: '500', 
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
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--daw-cyan)', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
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
          <span style={{ fontSize: '0.48rem', fontWeight: '500', color: 'var(--daw-cyan)', opacity: 0.6 }}>TONO / MÉTRICA</span>
          <span className="mono-data" style={{ color: 'white', fontWeight: '500', fontSize: '0.8rem' }}>
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
          <span style={{ fontSize: '0.48rem', fontWeight: '500', color: 'var(--daw-cyan)', opacity: 0.6 }}>TEMPO</span>
          <input
            type="number"
            value={metronome.bpm}
            onChange={(e) => onMetronomeUpdate('bpm', parseFloat(e.target.value))}
            className="mono-data"
            style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '500', fontSize: '0.85rem', width: '100%', outline: 'none' }}
          />
        </div>

        {/* OUT CLICK */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '78px' }}>
          <span style={{ fontSize: '0.48rem', fontWeight: '500', color: 'var(--daw-cyan)', opacity: 0.6 }}>OUT CLICK</span>
          <select 
            value={metronome.outputCh}
            onChange={(e) => onMetronomeUpdate('outputCh', parseInt(e.target.value))}
            style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '500', fontSize: '0.72rem', outline: 'none', cursor: 'pointer' }}
          >
            {Array.from({ length: deviceChannels }).map((_, idx) => (
              <option key={idx} value={idx} style={{ background: '#101012' }}>CH {idx + 1} (MONO)</option>
            ))}
          </select>
        </div>

        {/* METRONOME VOLUME */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '0.48rem', fontWeight: '500', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>MET VOL</span>
          <input 
            type="range" min="0" max="1.5" step="0.01" 
            value={metronome.volume} 
            onChange={(e) => onMetronomeUpdate('volume', parseFloat(e.target.value))}
            style={{ width: '80px', height: '4px', accentColor: '#ffffff' }} 
          />
        </div>

        {/* TAP TEMPO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.48rem', fontWeight: '500', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>TAP</span>
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
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '500', fontSize: '0.65rem', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
          >
            TAP
          </button>
        </div>

        {/* TRANSPOSICIÓN (Varispeed) */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}
          title={`Transposición varispeed: pitch y tempo cambian juntos (como cinta).\n±1 semitono ≈ ±6% de tempo. Cero costo de CPU, calidad intacta.`}
        >
          <span style={{ fontSize: '0.48rem', fontWeight: '500', color: transpose !== 0 ? '#f59e0b' : 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>PITCH</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => onTransposeChange && onTransposeChange(transpose - 1)}
              disabled={transpose <= -6}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '500', fontSize: '0.75rem', width: '22px', height: '22px', borderRadius: '6px', cursor: 'pointer', opacity: transpose <= -6 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >−</button>
            <span
              className="mono-data"
              onDoubleClick={() => onTransposeChange && onTransposeChange(0)}
              title="Doble clic = volver a 0"
              style={{ minWidth: '30px', textAlign: 'center', fontWeight: '500', fontSize: '0.8rem', color: transpose !== 0 ? '#f59e0b' : 'white', cursor: 'pointer' }}
            >
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
            <button
              onClick={() => onTransposeChange && onTransposeChange(transpose + 1)}
              disabled={transpose >= 6}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '500', fontSize: '0.75rem', width: '22px', height: '22px', borderRadius: '6px', cursor: 'pointer', opacity: transpose >= 6 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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

export default function ProMixer({ session, orgId }) {
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
  // Picos reales del audio para dibujar la onda. Se piden una sola vez por
  // canción, cuando el motor terminó de cargar los stems: antes de eso las
  // pistas están vacías y devolvería una onda plana.
  const [masterWaveform, setMasterWaveform] = useState([]);
  const waveformPendingRef = useRef(false);
  // Largo del audio sin importar el arreglo (mismas unidades que los markers).
  // `totalSamples` pasa a ser el largo del arreglo cuando hay uno activo.
  const [songSamples, setSongSamples] = useState(0);
  // null = canción completa. Array = arreglo personalizado, en unidades pitch-0
  // igual que los markers; la conversión a unidades de reproducción se hace en
  // un único punto, al mandárselo al motor.
  const [arrangementBlocks, setArrangementBlocks] = useState(null);
  const [playbackSR, setPlaybackSR] = useState(44100);

  const [engineReady, setEngineReady] = useState(false);
  const [isPrerollActive, setIsPrerollActive] = useState(false);
  const [prerollBars, setPrerollBars] = useState(0);

  const lastActionTime = useRef(0);
  // Evita que el poll de 100ms pise un seek recién hecho (a stop/restart) con
  // un reporte del motor que todavía refleja la posición de ANTES del seek —
  // ese race hacía que el playhead "rebotara" a la posición vieja tras un stop.
  const pinnedPlaybackSample = useRef(null); // { value, until }
  // Último marker que le avisamos a Bandly Presenter/Lights (presenter_state.active_marker).
  // Se resetea en stop/restart para que un replay desde el inicio vuelva a disparar
  // el mismo marker en vez de quedarse callado porque "ya lo habíamos mandado".
  // Uno por línea (section / lyric / light): cada una avisa su propio cambio.
  const lastSentMarkerRef = useRef({});
  // Cola de avisos: si sección, letra y luz cambian en el mismo compás, se
  // mandan uno detrás de otro (no en paralelo) para que ninguno pise al otro.
  const markerQueueRef = useRef({ items: [], running: false });

  const [timelineLanes, setTimelineLanes] = useState(EMPTY_LANES);
  const timelineLanesRef = useRef(EMPTY_LANES);
  const [lyricSlides, setLyricSlides] = useState({ rowId: null, slides: [] });
  const lyricSlidesRef = useRef({ rowId: null, slides: [] });
  const lyricsSongRef = useRef(null);
  const lanesErrorShownRef = useRef(false);
  // true cuando el motor terminó de cargar los stems de la canción actual:
  // recién ahí la pista de CUES tiene audio para leer.
  const [stemsReady, setStemsReady] = useState(false);
  const [isDetectingCues, setIsDetectingCues] = useState(false);
  // Qué está haciendo la detección ahora ("Descargando modelo de voz 40%"...).
  const [detectStatus, setDetectStatus] = useState(null);
  // Nombres de escenas que Bandly Lights publica (tabla light_scenes).
  const [lightScenes, setLightScenes] = useState([]);
  const autoCueDoneRef = useRef(new Set());

  // ── Deshacer / Rehacer (Ctrl+Z / Ctrl+Y) de secciones, letras y luces ──
  // Se guarda una foto de {markers, lanes} ANTES de cada cambio. Se limpia al
  // cambiar de canción: deshacer nunca debe tocar otra secuencia.
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const historyRef = useRef({ undo: [], redo: [] });
  const recordHistory = useCallback(() => {
    const h = historyRef.current;
    h.undo.push({ markers: markersRef.current, lanes: timelineLanesRef.current });
    if (h.undo.length > 50) h.undo.shift();
    h.redo = [];
  }, []);

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

  // Descarga en segundo plano el audio de UNA canción para dejarla lista
  // offline apenas se añade al setlist desde el Repertorio Cloud — a
  // diferencia de handleSyncSong, esto NO carga la canción en el motor ni
  // interrumpe lo que esté sonando ahora mismo, solo la deja guardada en
  // disco para cuando el usuario la toque.
  const downloadSongForOffline = useCallback(async (song) => {
    if (!isTauri() || !song?.id) return;
    try {
      const { data: seq } = await supabase.from('sequences').select('r2_zip_key').eq('song_id', song.id).maybeSingle();
      if (!seq?.r2_zip_key) return;
      const token = session?.access_token || '';
      const songDir = song.id.toString();
      const zipUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${seq.r2_zip_key}`;
      const zipPath = await safeInvoke('download_multitrack', { url: zipUrl, songId: songDir, fileName: 'multitrack.zip', token }).catch(() => null);
      if (zipPath) {
        await safeInvoke('extract_multitrack_zip', { zipPath, songId: songDir }).catch(() => null);
      }
    } catch {
      // Fallo silencioso — si esto falla, igual se descarga sola al reproducirla (camino normal de handleSyncSong)
    }
  }, [session]);

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

      if (pinnedPlaybackSample.current && Date.now() < pinnedPlaybackSample.current.until) {
        setPlaybackSample(pinnedPlaybackSample.current.value);
      } else {
        pinnedPlaybackSample.current = null;
        setPlaybackSample(report.sample_pos);
      }
      setPlaybackSR(report.sample_rate);
      setEngineReady(report.is_ready);
      // Sincronización Real: La UI se ajusta exactamente a lo que el hardware reporta
      if (report.device_channels > 0 && report.device_channels !== deviceChannels) {
        setDeviceChannels(report.device_channels);
      }
      setIsPrerollActive(report.preroll_active);
      setPrerollBars(report.preroll_bars);
      setTotalSamples(report.total_samples);
      if (typeof report.song_samples === 'number') setSongSamples(report.song_samples);

      // Onda real: en cuanto los stems están dentro del motor, se piden los
      // picos una vez y quedan cacheados hasta que cambie la canción.
      if (waveformPendingRef.current && report.tracks_loading === 0 && report.total_samples > 0) {
        waveformPendingRef.current = false;
        setStemsReady(true);
        safeInvoke('get_master_waveform', { buckets: 1200 })
          .then(peaks => { if (Array.isArray(peaks) && peaks.length) setMasterWaveform(peaks); })
          .catch(() => {});
      }

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
    pinnedPlaybackSample.current = { value: 0, until: Date.now() + 500 };
    setPlaybackSample(0);
    lastSentMarkerRef.current = {};
  }, []);

  const handleRestart = useCallback(async () => {
    lastActionTime.current = Date.now();
    if (isTauri()) {
      await safeInvoke('seek_to_sample', { sample: 0 });
    }
    lastSentMarkerRef.current = {};
    pinnedPlaybackSample.current = { value: 0, until: Date.now() + 500 };
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

        // Persistencia POR CANCIÓN (stem específico, id único) — el ruteo de
        // salida ya NO se comparte entre canciones (se probó y era riesgoso:
        // una canción sin configurar todavía podía heredar en silencio lo
        // último que se haya tocado en cualquier otra, justo el mismo tipo de
        // fuga de estado que ya nos quemó una vez con otro parámetro). Cada
        // canción es 100% independiente, igual que volumen/mute/solo/EQ.
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
    setStemsReady(false);
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
        timelineLanesRef.current = EMPTY_LANES; setTimelineLanes(EMPTY_LANES);
        lyricSlidesRef.current = { rowId: null, slides: [] }; setLyricSlides(lyricSlidesRef.current);
        setMasterWaveform([]); waveformPendingRef.current = false;
        setArrangementBlocks(null);
        if (isTauri()) safeInvoke('clear_arrangement').catch(() => {});
        return;
      }
      // Canción nueva: la onda anterior ya no aplica. Se vuelve a pedir cuando
      // el motor reporte que terminó de cargar los stems.
      setMasterWaveform([]);
      waveformPendingRef.current = true;
      // El arreglo es por secuencia: si la canción anterior tenía uno, arrastrarlo
      // haría que esta sonara cortada en puntos que no significan nada.
      setArrangementBlocks(Array.isArray(sequence.arrangement) && sequence.arrangement.length ? sequence.arrangement : null);
      const stems = sequence.sequence_stems || [];
      setActiveSequenceId(sequence.id);
      const loadedTimeSignature = sequence.time_signature || '4/4';
      setActiveSequenceMeta({ key: sequence.key, bpm: sequence.bpm, timeSignature: loadedTimeSignature });
      if (isTauri()) safeInvoke('set_beats_per_bar', { beats: beatsPerBarFromSignature(loadedTimeSignature) });
      setMarkers(sequence.markers || []);
      historyRef.current = { undo: [], redo: [] };
      const loadedLanes = { ...EMPTY_LANES, ...(sequence.timeline_lanes || {}) };
      timelineLanesRef.current = loadedLanes;
      setTimelineLanes(loadedLanes);
      // La letra vive en presenter_slides (la misma que usa Presenter).
      lyricsSongRef.current = song.id;
      lyricSlidesRef.current = { rowId: null, slides: [] };
      setLyricSlides(lyricSlidesRef.current);
      fetchLyricSlides(song.id).then(res => {
        if (lyricsSongRef.current !== song.id) return; // ya cambiaste de canción
        lyricSlidesRef.current = res;
        setLyricSlides(res);
      }).catch(() => {});

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

      // Recuperar: override por canción (prioridad) > valor base. Ya nada hereda
      // de otra canción, ni siquiera el ruteo de salida (ver nota en onTrackUpdate).
      // mixerVolumes es el store viejo (solo volumen) — se mantiene como respaldo
      // para no perder ajustes guardados antes de este cambio.
      let mixerVolumes = {};
      let songOverrides = {};
      try {
        mixerVolumes = JSON.parse(localStorage.getItem('bandly_mixer_volumes') || '{}');
        songOverrides = JSON.parse(localStorage.getItem('bandly_mixer_song_overrides') || '{}');
      } catch {}

      const resTracks = stems.map((stem) => {
        const rawName = stem.original_name || stem.instrument_label || 'Inst';
        const cleanName = rawName.replace(/\.[^/.]+$/, ""); // Quita la extensión (.mp3, .wav, etc)
        const displayName = getStandardName(cleanName);
        const savedSong = songOverrides[stem.id] || {};
        const savedVol = savedSong.volume !== undefined ? savedSong.volume : mixerVolumes[stem.id];

        return {
          id: stem.id, name: displayName, peak: 0,
          outputIdx: savedSong.outputIdx !== undefined ? savedSong.outputIdx : 0,
          // Volumen/estéreo/mute/solo/salida: SOLO el ajuste propio de esta canción, o el
          // valor base — nunca heredan de otra canción.
          volume: savedVol !== undefined ? savedVol : 1,
          isStereo: savedSong.isStereo !== undefined ? savedSong.isStereo : true,
          muted: savedSong.muted !== undefined ? savedSong.muted : false,
          solo: savedSong.solo !== undefined ? savedSong.solo : false,
          // EQ: 100% por canción, igual que volumen/mute/solo — nunca hereda de otra.
          eqLow: savedSong.eqLow !== undefined ? savedSong.eqLow : 0,
          eqMid: savedSong.eqMid !== undefined ? savedSong.eqMid : 0,
          eqHigh: savedSong.eqHigh !== undefined ? savedSong.eqHigh : 0,
          color: stem.color || '#f7f4ef', url: stem.r2_key ? `${import.meta.env.VITE_R2_PUBLIC_URL}/${stem.r2_key}` : (stem.playback_url || stem.url)
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
    const colors = ['#62a4ae', '#8d92c4', '#fbbf24', '#f472b6', '#34d399'];
    // Normalizar a unidades "pitch 0" para que el marker sea válido en cualquier transposición
    const normalizedSample = Math.round(sample * pitchRatioRef.current);
    recordHistory();
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
  }, [activeSequenceId, markers, activeSong, recordHistory]);

  // ── Modo En Vivo (control remoto desde el celular) ──
  // El celular no toca el motor de audio directamente: manda un comando por
  // Supabase Realtime (broadcast, sin tabla — es efímero) y esta computadora,
  // que es la que está conectada a la interfaz real, hace el load+play.
  const remoteChannelRef = useRef(null);

  const handleRemotePlaySong = useCallback(async (songId) => {
    const song = songs.find(s => String(s.id) === String(songId));
    if (!song) return;
    await handleSyncSong(song);
    if (isTauri()) {
      // Esperamos a que el motor confirme que terminó de sincronizar los stems
      // (mismo chequeo que usa handleSyncSong internamente) antes de arrancar,
      // para no pisar el play mientras el audio todavía se está cargando.
      for (let i = 0; i < 20; i++) {
        const report = await safeInvoke('get_engine_report').catch(() => null);
        if (report && report.tracks_loading === 0) break;
        await new Promise(r => setTimeout(r, 300));
      }
      setIsPlaying(true);
      safeInvoke('toggle_playback', { playing: true });
    }
  }, [songs, handleSyncSong]);

  // Pausar/reanudar remoto: la canción ya está cargada en el motor, así que
  // a diferencia de handleRemotePlaySong no hace falta volver a sincronizar
  // stems — solo cambia el estado de reproducción (evita el gap de recarga).
  const handleRemoteSetPlaying = useCallback(async (playing) => {
    if (!isTauri()) return;
    setIsPlaying(playing);
    lastActionTime.current = Date.now();
    await safeInvoke('toggle_playback', { playing });
  }, []);

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase.channel(`daw_remote_${orgId}`)
      .on('broadcast', { event: 'play_song' }, ({ payload }) => {
        if (payload?.songId) handleRemotePlaySong(payload.songId);
      })
      .on('broadcast', { event: 'pause_song' }, () => handleRemoteSetPlaying(false))
      .on('broadcast', { event: 'resume_song' }, () => handleRemoteSetPlaying(true))
      .on('broadcast', { event: 'stop_song' }, () => handleStop())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Ping inicial: así el celular sabe de inmediato que esta computadora
          // está conectada y escuchando, sin esperar al primer cambio de canción.
          channel.send({
            type: 'broadcast',
            event: 'daw_status',
            payload: { songId: activeSong?.id || null, songTitle: activeSong?.title || null, isPlaying }
          });
        }
      });
    remoteChannelRef.current = channel;
    return () => {
      remoteChannelRef.current = null;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, handleRemotePlaySong, handleRemoteSetPlaying, handleStop]);

  // Cada vez que cambia la canción activa o el estado de play, avisamos al
  // celular para que muestre "sonando ahora" en el lugar correcto.
  useEffect(() => {
    if (!remoteChannelRef.current) return;
    remoteChannelRef.current.send({
      type: 'broadcast',
      event: 'daw_status',
      payload: { songId: activeSong?.id || null, songTitle: activeSong?.title || null, isPlaying }
    });
  }, [activeSong, isPlaying]);

  // ── Arreglo no destructivo ────────────────────────────────────────────
  // Las secciones salen de los markers: cada marker abre una sección que
  // termina donde empieza el siguiente (el último llega hasta el final).
  const sections = useMemo(() => {
    if (!markers.length || !songSamples) return [];
    const list = [];
    if (markers[0].sample > 1000) {
      list.push({ uid: 'sec-head', label: 'Inicio', color: '#7d7d7c', start: 0, end: markers[0].sample });
    }
    markers.forEach((m, i) => {
      const end = i + 1 < markers.length ? markers[i + 1].sample : songSamples;
      if (end > m.sample) {
        list.push({ uid: m.id || `sec-${i}`, label: m.label, color: m.color || '#f7f4ef', autoLabel: m.autoLabel, cueGroup: m.cueGroup, start: m.sample, end });
      }
    });
    return list;
  }, [markers, songSamples]);

  // El motor recibe el arreglo en unidades de reproducción (igual que los
  // markers que se le pasan a la timeline), así que aquí se divide por el pitch.
  useEffect(() => {
    if (!isTauri()) return;
    if (!arrangementBlocks || arrangementBlocks.length === 0) {
      safeInvoke('clear_arrangement').catch(() => {});
      return;
    }
    const segments = arrangementBlocks.map(b => [
      Math.max(0, Math.round(b.start / pitchRatio)),
      Math.max(0, Math.round(b.end / pitchRatio)),
    ]);
    safeInvoke('set_arrangement', { segments }).catch(() => {});
  }, [arrangementBlocks, pitchRatio]);

  const handleArrangementChange = useCallback(async (next) => {
    setArrangementBlocks(next);
    // Reiniciar el recorrido: la línea de tiempo virtual cambió de largo y
    // seguir en la posición vieja caería en otro punto de la canción.
    if (isTauri()) {
      safeInvoke('seek_to_sample', { sample: 0 }).catch(() => {});
      pinnedPlaybackSample.current = { value: 0, until: Date.now() + 500 };
      setPlaybackSample(0);
    }
    lastSentMarkerRef.current = {};
    if (activeSequenceId) {
      await supabase.from('sequences').update({ arrangement: next }).eq('id', activeSequenceId);
    }
  }, [activeSequenceId]);

  // La onda también sigue al arreglo: se recortan los picos de cada bloque y se
  // pegan en orden. Así un coro repetido se ve dos veces y un verso saltado
  // desaparece — lo que ves es literalmente lo que va a sonar.
  const timelineWaveform = useMemo(() => {
    if (!masterWaveform.length || !arrangementBlocks?.length || !songSamples) return masterWaveform;
    const out = [];
    for (const b of arrangementBlocks) {
      const from = Math.max(0, Math.floor((b.start / songSamples) * masterWaveform.length));
      const to = Math.min(masterWaveform.length, Math.ceil((b.end / songSamples) * masterWaveform.length));
      for (let i = from; i < to; i++) out.push(masterWaveform[i]);
    }
    return out.length ? out : masterWaveform;
  }, [masterWaveform, arrangementBlocks, songSamples]);

  // Los bloques del arreglo guardan una COPIA del nombre que tenía la sección al
  // armarlo. Si luego la sección se renombra (a mano o porque se leyó la guía),
  // el arreglo seguía mostrando el nombre viejo. Aquí cada bloque lee el nombre y
  // el color VIGENTES de la sección de la que salió (su uid es el id del marker,
  // o "<id>-r<n>" si es una repetición).
  const resolvedBlocks = useMemo(() => {
    if (!arrangementBlocks) return null;
    return arrangementBlocks.map(b => {
      const uid = String(b.uid ?? '');
      const m = markers.find(mm => uid === mm.id || uid.startsWith(`${mm.id}-r`));
      return m ? { ...b, label: m.label, color: m.color || b.color, autoLabel: m.autoLabel, cueGroup: m.cueGroup } : b;
    });
  }, [arrangementBlocks, markers]);

  // La timeline debe mostrar el arreglo tal como va a sonar: cada bloque en su
  // posición dentro de la línea de tiempo virtual, no donde vive en el archivo.
  const timelineMarkers = useMemo(() => {
    const scaled = pitchRatio === 1 ? markers : markers.map(m => ({ ...m, sample: m.sample / pitchRatio }));
    if (!resolvedBlocks || resolvedBlocks.length === 0) return scaled;
    let acc = 0;
    return resolvedBlocks.map((b, i) => {
      const sample = acc;
      acc += (b.end - b.start) / pitchRatio;
      return { id: `${b.uid}-${i}`, label: b.label, color: b.color, autoLabel: b.autoLabel, cueGroup: b.cueGroup, bar: 0, sample };
    });
  }, [resolvedBlocks, markers, pitchRatio]);

  // Saltar a una posición de la timeline (unidades de reproducción). Por defecto
  // entra con 2 compases de conteo, como se toca en vivo; `immediate` (Shift) va
  // directo, sin conteo.
  const jumpToPosition = useCallback(async (pos, { immediate = false } = {}) => {
    if (!isTauri()) return;
    const target = Math.max(0, Math.round(pos));
    lastActionTime.current = Date.now();
    lastSentMarkerRef.current = {}; // que Presenter/Lights reciban esta sección aunque ya la hubieran recibido
    if (!immediate) {
      setIsPlaying(true);
      await safeInvoke('play_with_preroll', { targetSample: target, bars: 2 });
      return;
    }
    await safeInvoke('seek_to_sample', { sample: target });
    pinnedPlaybackSample.current = { value: target, until: Date.now() + 500 };
    setPlaybackSample(target);
    if (!isPlaying) {
      setIsPlaying(true);
      await safeInvoke('toggle_playback', { playing: true });
    }
  }, [isPlaying]);

  // Bloque del arreglo (o sección) por posición en la lista.
  const handlePlayBlock = useCallback((idx, opts = {}) => {
    const custom = !!(resolvedBlocks && resolvedBlocks.length);
    const list = custom ? resolvedBlocks : sections;
    if (!list[idx]) return;
    // Con arreglo, la posición es la suma de lo que dura lo anterior (así suena);
    // sin arreglo, el punto donde vive la sección en la canción.
    let pos = 0;
    if (custom) { for (let i = 0; i < idx; i++) pos += (list[i].end - list[i].start) / pitchRatio; }
    else pos = list[idx].start / pitchRatio;
    return jumpToPosition(pos, opts);
  }, [resolvedBlocks, sections, pitchRatio, jumpToPosition]);

  // MIDI: una tecla / pedal asignado salta a su sección (con conteo).
  const arrangementActive = !!(resolvedBlocks && resolvedBlocks.length);
  const sectionMidi = useSectionMidi({
    sequenceId: activeSequenceId,
    onTrigger: (uid) => {
      const list = arrangementActive ? resolvedBlocks : sections;
      const idx = list.findIndex(b => String(b.uid) === uid);
      if (idx >= 0) handlePlayBlock(idx);
    },
  });

  // Bloque que está sonando ahora (para resaltarlo en el panel de arreglo).
  const activeBlockIdx = useMemo(() => {
    const custom = !!(resolvedBlocks && resolvedBlocks.length);
    const list = custom ? resolvedBlocks : sections;
    if (!list.length) return -1;
    if (custom) {
      let acc = 0;
      for (let i = 0; i < list.length; i++) {
        const len = (list[i].end - list[i].start) / pitchRatio;
        if (playbackSample >= acc && playbackSample < acc + len) return i;
        acc += len;
      }
      return -1;
    }
    const songPos = playbackSample * pitchRatio;
    return list.findIndex(b => songPos >= b.start && songPos < b.end);
  }, [resolvedBlocks, sections, pitchRatio, playbackSample]);

  // ── Líneas: Secciones / Letras / Luces ─────────────────────────────────
  const timelineMapper = useMemo(() => makeTimelineMapper(arrangementBlocks, pitchRatio), [arrangementBlocks, pitchRatio]);
  const lyricEvents = useMemo(() => toTimelineEvents(timelineLanes.lyrics, timelineMapper), [timelineLanes.lyrics, timelineMapper]);
  const lightEvents = useMemo(() => toTimelineEvents(timelineLanes.lights, timelineMapper), [timelineLanes.lights, timelineMapper]);
  const cueTrack = useMemo(() => tracks.find(t => t.name === 'CUES') || null, [tracks]);

  // Puente en vivo con Bandly Presenter / Bandly Lights. Las tres líneas avisan
  // por la misma columna que esas apps ya escuchan (presenter_state.active_marker):
  //   - Sección → Presenter salta a la diapositiva con ese marker_sync y Lights
  //     a la escena con ese nombre (lo de siempre).
  //   - Letra   → el marker_sync de ESA diapositiva, así Presenter la muestra.
  //   - Luz     → el nombre de la escena, así Lights la dispara.
  // Orden dentro de un mismo instante: sección, luz, letra — la letra va al
  // final para que sea lo último que Presenter recibe y no la pise la sección.
  const sendActiveMarker = useCallback((label) => {
    if (!orgId) return;
    const q = markerQueueRef.current;
    q.items.push(label);
    if (q.running) return;
    q.running = true;
    (async () => {
      while (q.items.length) {
        const next = q.items.shift();
        // Una fila por organización: antes esto escribía en una fila global y el
        // marcador viajaba a los proyectores y luces de todos los clientes.
        const { error } = await supabase.from('presenter_state')
          .upsert({ org_id: orgId, active_marker: next }, { onConflict: 'org_id' });
        if (error) console.error('presenter_state sync error:', error);
        if (q.items.length) await new Promise(r => setTimeout(r, 300));
      }
      q.running = false;
    })();
  }, [orgId]);

  useEffect(() => {
    if (!isPlaying || !orgId) return;
    const slideById = new Map(lyricSlides.slides.map(sl => [sl.id, sl]));
    const lanes = [
      ['section', timelineMarkers.map(m => ({ key: m.id, t: m.sample, label: m.label }))],
      ['light', lightEvents.map(ev => ({ key: ev.key, t: ev.t, label: ev.scene }))],
      ['lyric', lyricEvents.map(ev => ({ key: ev.key, t: ev.t, label: slideById.get(ev.slideId)?.marker_sync }))],
    ];
    for (const [lane, events] of lanes) {
      let current = null;
      for (const ev of events) {
        if (ev.t <= playbackSample) current = ev;
        else break;
      }
      if (!current || current.key === lastSentMarkerRef.current[lane]) continue;
      lastSentMarkerRef.current[lane] = current.key;
      if (current.label) sendActiveMarker(current.label);
    }
  }, [playbackSample, isPlaying, orgId, timelineMarkers, lightEvents, lyricEvents, lyricSlides, sendActiveMarker]);

  const persistMarkers = useCallback(async (nextMarkers) => {
    setMarkers(nextMarkers);
    setSongs(prev => prev.map(s => {
      if (s.id === activeSong?.id && s.sequences && s.sequences.length > 0) {
        return { ...s, sequences: [{ ...s.sequences[0], markers: nextMarkers }] };
      }
      return s;
    }));
    if (activeSequenceId) await supabase.from('sequences').update({ markers: nextMarkers }).eq('id', activeSequenceId);
  }, [activeSequenceId, activeSong]);

  // Se lee y escribe por ref: con la tecla L se pueden agregar varias letras
  // seguidas antes de que React vuelva a renderizar, y ninguna se debe perder.
  const updateLanes = useCallback(async (fn) => {
    const next = fn(timelineLanesRef.current);
    timelineLanesRef.current = next;
    setTimelineLanes(next);
    setSongs(prev => prev.map(s => {
      if (s.id === activeSong?.id && s.sequences && s.sequences.length > 0) {
        return { ...s, sequences: [{ ...s.sequences[0], timeline_lanes: next }] };
      }
      return s;
    }));
    if (!activeSequenceId) return;
    const { error } = await supabase.from('sequences').update({ timeline_lanes: next }).eq('id', activeSequenceId);
    if (error) {
      console.error('timeline_lanes save error:', error);
      if (!lanesErrorShownRef.current) {
        lanesErrorShownRef.current = true;
        alertDialog('No se pudieron guardar las líneas de Letras/Luces. Si es la primera vez, corre sql/sequences_timeline_lanes.sql en Supabase.');
      }
    }
  }, [activeSequenceId, activeSong]);

  // Presenter elige la diapositiva por su marker_sync (la primera que coincida).
  // Para que una letra puesta en la línea dispare EXACTAMENTE esa diapositiva,
  // necesita un marker_sync propio: si no tiene, o si otra anterior ya usa el
  // mismo, se le pone uno único ("LETRA 3", "CORO 2"...). Si es la primera con
  // ese nombre se deja igual — es la que ya disparaba la sección.
  const ensureSlideTrigger = useCallback(async (slideId) => {
    const { rowId, slides } = lyricSlidesRef.current;
    const idx = slides.findIndex(sl => sl.id === slideId);
    if (idx < 0 || !rowId) return;
    const cur = (slides[idx].marker_sync || '').trim();
    const norm = (v) => (v || '').trim().toLowerCase();
    const firstWithName = cur ? slides.findIndex(sl => norm(sl.marker_sync) === norm(cur)) : -1;
    if (cur && firstWithName === idx) return;
    const base = cur || 'LETRA';
    const taken = new Set(slides.map(sl => norm(sl.marker_sync)));
    let n = idx + 1;
    let name = `${base} ${n}`;
    while (taken.has(name.toLowerCase())) name = `${base} ${++n}`;
    const nextSlides = slides.map((sl, i) => (i === idx ? { ...sl, marker_sync: name } : sl));
    lyricSlidesRef.current = { rowId, slides: nextSlides };
    setLyricSlides(lyricSlidesRef.current);
    const { error } = await supabase.from('presenter_slides').update({ slides: nextSlides, updated_at: new Date() }).eq('id', rowId);
    if (error) console.error('presenter_slides marker_sync error:', error);
  }, []);

  // Lee la pista de CUES y arma las secciones solas (ver detectCueSections).
  // Respeta lo que ya pusiste o renombraste; solo rehace lo auto-detectado.
  const activeSequenceIdRef = useRef(activeSequenceId);
  activeSequenceIdRef.current = activeSequenceId;

  const runCueDetection = useCallback(async (auto) => {
    if (!cueTrack || !isTauri() || !activeSequenceId) return;
    const seqId = activeSequenceId;
    setIsDetectingCues(true);
    setDetectStatus('Leyendo la guía…');
    try {
      const sr = playbackSR || 44100;
      const windowFrames = Math.max(64, Math.round(sr * 0.01));
      const env = await safeInvoke('get_track_envelope', { trackId: String(cueTrack.id), windowFrames });
      const bpm = parseFloat(activeSequenceMeta?.bpm ?? activeSong?.bpm) || 0;
      const samplesPerBar = bpm > 0 ? (sr * 60 / bpm) * lanesBeatsPerBar(activeSequenceMeta?.timeSignature) : 0;
      const detected = detectCueSections(Array.isArray(env) ? env : [], { windowFrames, sampleRate: sr, samplesPerBar });
      if (!detected.length) {
        if (!auto) alertDialog('No se encontró voz en la pista de guía.');
        return;
      }
      const minGap = samplesPerBar > 0 ? samplesPerBar / 2 : sr * 2;
      recordHistory();
      // Paso 1: las secciones aparecen YA, numeradas (SECCIÓN 1, 2, 3…).
      await persistMarkers(mergeDetectedMarkers(markers, detected.map(stripClip), minGap));

      // Paso 2: escuchar qué dice la guía — un clip por VARIANTE (los "Coro"
      // idénticos se oyen una sola vez; "Verso 1" y "Verso 2" por separado).
      const firstOfGroup = [...new Map(detected.map(d => [d._key, d])).values()];
      const clips = [];
      for (const d of firstOfGroup) {
        const audio = await safeInvoke('get_track_clip_16k', { trackId: String(cueTrack.id), startFrame: d._clip.start, endFrame: d._clip.end });
        clips.push(Float32Array.from(Array.isArray(audio) ? audio : []));
      }
      // Los nombres se aplican a medida que Whisper los va resolviendo (no al
      // final): así ves aparecer «Intro», «Coro»… en vez de esperar minutos con
      // todo en «SECCIÓN n».
      const detectedIds = new Set(detected.map(d => d.id));
      const keyById = new Map(detected.map(d => [d.id, d._key]));
      const applyResults = async (partial) => {
        if (activeSequenceIdRef.current !== seqId) return; // cambiaste de canción
        const byKey = new Map();
        partial.forEach((res, i) => byKey.set(firstOfGroup[i]._key, res));
        const next = [];
        for (const m of markersRef.current) {
          // Solo lo que sigue sin tocar: si ya lo renombraste a mano, se respeta.
          const res = detectedIds.has(m.id) && m.autoLabel ? byKey.get(keyById.get(m.id)) : null;
          if (!res) { next.push(m); continue; }
          if (res.kind === 'count') continue;             // conteo de entrada ("1, 2, 3, 4"): no es una sección
          if (res.kind === 'section') next.push({ ...m, label: res.label, color: res.color, heard: res.heard, autoLabel: false });
          else next.push(m);
        }
        markersRef.current = next; // el siguiente lote parte de esto, sin esperar al render
        await persistMarkers(next);
      };
      try {
        await nameVariants(clips, {
          onResults: applyResults,
          onProgress: (p) => {
            if (p.phase === 'download' && p.total) setDetectStatus(`Descargando modelo de voz ${Math.round((p.loaded / p.total) * 100)}%`);
            else if (p.phase === 'fallback') setDetectStatus('Usando modelo básico…');
            else if (p.phase === 'load') setDetectStatus('Preparando voz…');
            else if (p.phase === 'listen') setDetectStatus(`Escuchando guía ${Math.min(p.done, p.total)}/${p.total}`);
          },
        });
      } catch (e) {
        console.warn('[DAW] Reconocimiento de voz no disponible:', e);
        setDetectStatus('No se pudo leer la guía');
        setTimeout(() => setDetectStatus(null), 6000);
        return;
      }
      if (activeSequenceIdRef.current !== seqId) return;

      const mine = markersRef.current.filter(m => detectedIds.has(m.id));
      const namedCount = mine.filter(m => !m.autoLabel).length;
      const left = mine.length - namedCount;
      setDetectStatus(left === 0 ? `${namedCount} secciones nombradas` : `${namedCount} nombradas · ${left} sin nombre`);
      setTimeout(() => setDetectStatus(null), 5000);
    } catch (e) {
      console.error('[DAW] Detección de CUES falló:', e);
      setDetectStatus(null);
    } finally {
      setIsDetectingCues(false);
    }
  }, [cueTrack, activeSequenceId, playbackSR, activeSequenceMeta, activeSong, markers, persistMarkers, recordHistory]);

  // "Se genera sola": la primera vez que abres una secuencia sin secciones y
  // con pista de CUES, se leen apenas el motor termina de cargar el audio.
  useEffect(() => {
    if (!stemsReady || !activeSequenceId || !cueTrack) return;
    if (markers.length > 0 || autoCueDoneRef.current.has(activeSequenceId)) return;
    // Leer la guía consume bastante CPU: en vivo, con una canción sonando, no arranca sola.
    // Espera a que pares (este efecto vuelve a correr cuando isPlaying cambia).
    if (isPlaying) return;
    autoCueDoneRef.current.add(activeSequenceId);
    runCueDetection(true);
  }, [stemsReady, activeSequenceId, cueTrack, markers.length, runCueDetection, isPlaying]);

  // Envuelve cada acción que modifica algo para guardar la foto de "antes".
  // Escenas reales de Bandly Lights: se leen una vez y se escuchan en vivo,
  // así una escena creada en Lights aparece en la tecla K sin recargar.
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    const apply = (row) => { if (!cancelled) setLightScenes(Array.isArray(row?.names) ? row.names.filter(Boolean) : []); };
    supabase.from('light_scenes').select('names').eq('org_id', orgId).maybeSingle()
      .then(({ data }) => apply(data))
      .catch(() => {});
    const channel = supabase.channel(`daw_light_scenes_${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'light_scenes', filter: `org_id=eq.${orgId}` }, (payload) => apply(payload.new))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [orgId]);

  // Renombrar un bloque desde el panel de arreglo. Cambia la SECCIÓN de la que
  // salió (y con ella todos sus bloques, la timeline y lo que se manda a
  // Presenter/Lights). Si el bloque quedó huérfano (su sección ya no existe), se
  // renombra el bloque solo.
  const handleRenameBlock = useCallback(async (uid, label) => {
    const clean = String(label || '').trim().toUpperCase();
    if (!clean) return;
    const preset = SECTION_PRESETS.find(pr => pr.label === clean);
    const u = String(uid);
    const target = markers.find(m => u === m.id || u.startsWith(`${m.id}-r`));
    recordHistory();
    if (target) {
      const sameWord = (m) => target.autoLabel && target.cueGroup && m.autoLabel && m.cueGroup === target.cueGroup;
      await persistMarkers(markers.map(m => (m.id === target.id || sameWord(m)
        ? { ...m, label: clean, color: preset?.color || m.color, autoLabel: false } : m)));
    } else if (arrangementBlocks) {
      const next = arrangementBlocks.map(b => (String(b.uid) === u ? { ...b, label: clean, color: preset?.color || b.color } : b));
      setArrangementBlocks(next);
      if (activeSequenceId) await supabase.from('sequences').update({ arrangement: next }).eq('id', activeSequenceId);
    }
  }, [markers, arrangementBlocks, activeSequenceId, persistMarkers, recordHistory]);

  const laneActions = useMemo(() => {
    const h = (fn) => (...args) => { recordHistory(); return fn(...args); };
    return {
      // onAddMarker ya registra su propio historial.
      addSection: (t, bar, label, color) => onAddMarker(bar, label, t, color),
      // Renombrar un grupo detectado en la guía renombra todos sus iguales.
      updateSection: h((id, patch) => {
        // Con un arreglo activo, el id que llega es el del bloque ("<id>-<n>"): se busca su sección.
        const target = markers.find(m => id === m.id || String(id).startsWith(`${m.id}-`));
        if (!target) return;
        const sameWord = (m) => target.autoLabel && target.cueGroup && m.autoLabel && m.cueGroup === target.cueGroup;
        persistMarkers(markers.map(m => (m.id === target.id || sameWord(m) ? { ...m, ...patch, autoLabel: false } : m)));
      }),
      removeSection: h((id) => persistMarkers(markers.filter(m => m.id !== id))),
      addLyric: h((t, slideId) => {
        updateLanes(l => ({ ...l, lyrics: [...l.lyrics, { id: crypto.randomUUID(), sample: timelineMapper.toSong(t), slideId }].sort(bySample) }));
        ensureSlideTrigger(slideId);
      }),
      updateLyric: h((id, patch) => {
        updateLanes(l => ({ ...l, lyrics: l.lyrics.map(x => (x.id === id ? { ...x, ...patch } : x)) }));
        if (patch.slideId) ensureSlideTrigger(patch.slideId);
      }),
      removeLyric: h((id) => updateLanes(l => ({ ...l, lyrics: l.lyrics.filter(x => x.id !== id) }))),
      addLight: h((t, scene) => updateLanes(l => ({ ...l, lights: [...l.lights, { id: crypto.randomUUID(), sample: timelineMapper.toSong(t), scene }].sort(bySample) }))),
      updateLight: h((id, patch) => updateLanes(l => ({ ...l, lights: l.lights.map(x => (x.id === id ? { ...x, ...patch } : x)) }))),
      removeLight: h((id) => updateLanes(l => ({ ...l, lights: l.lights.filter(x => x.id !== id) }))),
      moveItem: h((lane, id, t, bar) => {
        const sample = timelineMapper.toSong(t);
        if (lane === 'section') {
          persistMarkers(markers.map(m => (m.id === id ? { ...m, sample, bar } : m)).sort(bySample));
          return;
        }
        const key = lane === 'lyric' ? 'lyrics' : 'lights';
        updateLanes(l => ({ ...l, [key]: l[key].map(x => (x.id === id ? { ...x, sample } : x)).sort(bySample) }));
      }),
      detectCues: () => runCueDetection(false),
    };
  }, [markers, onAddMarker, persistMarkers, updateLanes, ensureSlideTrigger, timelineMapper, runCueDetection, recordHistory]);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y. Restaura la foto completa (secciones +
  // letras + luces) y la guarda, igual que cualquier otro cambio.
  const applyHistory = useCallback((from, to) => {
    const h = historyRef.current;
    const snap = h[from].pop();
    if (!snap) return;
    h[to].push({ markers: markersRef.current, lanes: timelineLanesRef.current });
    persistMarkers(snap.markers);
    updateLanes(() => snap.lanes);
  }, [persistMarkers, updateLanes]);
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const k = (e.key || '').toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); applyHistory('undo', 'redo'); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); applyHistory('redo', 'undo'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyHistory]);

  // Diapositiva que está sonando ahora (para el panel AHORA / SIGUE).
  let currentLyricText = null;
  for (const ev of lyricEvents) {
    if (ev.t <= playbackSample) currentLyricText = lyricSlides.slides.find(sl => sl.id === ev.slideId)?.text || null;
    else break;
  }

  const lanesProp = useMemo(() => ({
    sectionsEditable: !(arrangementBlocks && arrangementBlocks.length),
    lyricEvents,
    lightEvents,
    slides: lyricSlides.slides,
    hasCueTrack: !!cueTrack,
    isDetecting: isDetectingCues,
    detectStatus,
    actions: laneActions,
    lightScenes,
    midi: sectionMidi,
    // id de una sección de la timeline → id que usa el MIDI (con arreglo, "<uid>-<n>" → "<uid>")
    midiUid: (id) => (arrangementActive ? String(id).replace(/-\d+$/, '') : String(id)),
  }), [arrangementBlocks, lyricEvents, lightEvents, lyricSlides, cueTrack, isDetectingCues, detectStatus, laneActions, lightScenes, sectionMidi, arrangementActive]);

  const onRemoveMarker = useCallback(async (index) => {
    if (!activeSequenceId) return;
    recordHistory();
    const nextMarkers = markers.filter((_, i) => i !== index);
    setMarkers(nextMarkers);
    
    setSongs(prev => prev.map(s => {
      if (s.id === activeSong?.id && s.sequences && s.sequences.length > 0) {
        return { ...s, sequences: [{ ...s.sequences[0], markers: nextMarkers }] };
      }
      return s;
    }));

    await supabase.from('sequences').update({ markers: nextMarkers }).eq('id', activeSequenceId);
  }, [activeSequenceId, markers, activeSong, recordHistory]);

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
    <div className="daw-console" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', maxWidth: '100%', background: '#101012' }}>
      {/* BANNER DE PÁNICO (Resiliencia UX) */}
      {audioError && (
        <div style={{ 
            background: '#ef4444', color: 'white', padding: '10px 20px', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontWeight: '500', fontSize: '0.8rem', letterSpacing: '1px',
            zIndex: 1000, boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Icons.AlertCircle size={20} />
                <span>{audioError.toUpperCase()}</span>
            </div>
            <button 
                onClick={() => setIsConfigured(false)}
                style={{ background: 'white', color: '#ef4444', border: 'none', padding: '6px 15px', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '0.7rem' }}
            >
                RE-CONECTAR AUDIO
            </button>
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
        {/* Zona central (timeline, mezclador, pads): con scroll propio. La barra de arriba
            y la de Setlist se quedan fijas; solo se desplaza esto. */}
        <div className="daw-center" style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden', overflowY: 'auto', minHeight: 0,
          paddingRight: '300px' 
        }}>
          <div style={{ padding: '0.5rem 0', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--daw-border)' }}>
            <CueTimeline
              progress={totalSamples > 0 ? playbackSample / totalSamples : 0} totalSamples={totalSamples}
              playbackSample={playbackSample} bpm={metronome.bpm} sampleRate={playbackSR}
              hasTempo={!!parseFloat(activeSequenceMeta?.bpm ?? activeSong?.bpm)}
              timeSignature={activeSequenceMeta?.timeSignature || '4/4'}
              markers={timelineMarkers}
              masterWaveform={timelineWaveform}
              onAddMarker={onAddMarker} onRemoveMarker={onRemoveMarker}
              lanes={lanesProp}
              onJumpTo={jumpToPosition}
              currentLyric={currentLyricText ? { text: currentLyricText } : null}
              isPrerollActive={isPrerollActive} prerollBars={prerollBars}
              onSeek={(p) => isTauri() && safeInvoke('seek_to_sample', { sample: Math.floor(p * totalSamples) })}
            />
            <ArrangementPanel
              sections={sections}
              blocks={resolvedBlocks}
              onChange={handleArrangementChange}
              onPlayBlock={handlePlayBlock}
              onRenameBlock={handleRenameBlock}
              midi={sectionMidi}
              activeIndex={activeBlockIdx}
              sampleRate={playbackSR}
              pitchRatio={pitchRatio}
            />
          </div>
          <div className="daw-mixer" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <MemoizedMixerConsole tracks={tracks} peaks={peaks} onTrackUpdate={onTrackUpdate} deviceChannels={deviceChannels} />
          </div>
             {showPads && <div style={{ borderTop: '1px solid var(--daw-border)', background: '#101012' }}><PadBoard deviceChannels={deviceChannels} sampleRate={playbackSR} /></div>}
          </div>
        <SetlistSidebar setlist={setlist} activeSong={activeSong} activeSequenceMeta={activeSequenceMeta} onSelect={handleSyncSong} onRemove={handleRemoveFromSetlist} onReorder={handleReorderSetlist} loading={loading} downloadProgress={downloadProgress} handleSyncOffline={handleSyncOffline} />
      </main>
      {showCloudBrowser && <CloudRepertoire songs={songs} onClose={() => setShowCloudBrowser(false)} onSelect={(s) => { setSetlist(prev => [...prev, s]); downloadSongForOffline(s); setShowCloudBrowser(false); }} />}
      {loading && <div style={{ position: 'fixed', inset: 0, background: 'rgba(16, 16, 18,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}><Loader2 size={48} className="animate-spin" color="#fff" /><p style={{ marginTop: '2rem', fontWeight: '500', fontSize: '0.9rem', color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Sincronizando Multitracks...</p></div>}
      
    </div>
  );
}
