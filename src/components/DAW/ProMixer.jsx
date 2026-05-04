import React, { useState, useEffect, useRef, useCallback } from 'react';
import { isTauri, safeInvoke, safeListen } from '../../utils/tauri';


import HardwarePicker from './HardwarePicker';
import CueTimeline from './CueTimeline';
import ProMixerConsole from './ProMixerConsole';
import PadBoard from './PadBoard'; 
import CloudRepertoire from './CloudRepertoire';
import { supabase } from '../../supabaseClient';
import { OfflineManager } from '../../utils/offlineManager'; 
import './DAW.css';
import * as Icons from 'lucide-react';

const { 
  Settings, Play, Pause, Layout, Volume2, Bell, BellOff, FolderOpen, 
  Save, Activity, Cloud, X, Loader2, Square, SkipBack, Trash2, 
  ChevronUp, ChevronDown, Grid, Crown 
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
  if (n.includes('DRUM') || n.includes('PERC') || n.includes('BATERIA')) return 'CATEGORY_DRUMS';
  if (n.includes('BASS') || n.includes('BAJO')) return 'CATEGORY_BASS';
  if (n.includes('GTR') || n.includes('GUITAR') || n.includes('ELEC')) return 'CATEGORY_GTR';
  if (n.includes('PIANO') || n.includes('KEY') || n.includes('TECLA') || n.includes('SYNTH')) return 'CATEGORY_KEYS';
  if (n.includes('VOCAL') || n.includes('VOX') || n.includes('VOZ') || n.includes('CHOIR')) return 'CATEGORY_VOCAL';
  return n; // Fallback al nombre normalizado si no hay categoría
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

const SetlistSidebar = React.memo(({ setlist, activeSong, onSelect, onRemove, loading }) => (
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
    
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
      {setlist.map((song, idx) => {
        const isActive = activeSong?.id === song.id;
        return (
          <div 
            key={`${song.id}-${idx}`} 
            onClick={() => onSelect(song)}
            style={{ 
              padding: '16px', borderRadius: '10px', marginBottom: '8px',
              background: isActive ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)' : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
              border: '1px solid',
              borderColor: isActive ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.03)',
              boxShadow: isActive ? '0 4px 15px rgba(0,0,0,0.3)' : 'none',
              position: 'relative', overflow: 'hidden'
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
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', fontWeight: '700' }}>{song.bpm || '120'} BPM</span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.15)' }}>•</span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', fontWeight: '700' }}>{song.key || 'G#m'}</span>
              </div>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(idx); }} 
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: '4px' }}
            >
              <Icons.Trash2 size={14} />
            </button>
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
));

const MemoizedMixerConsole = React.memo(ProMixerConsole);

const MemoizedTransportUI = React.memo(({ 
  isPlaying, isBuffering, togglePlay, handleStop, handleRestart, 
  handleLoadProject, setShowCloudBrowser, activeSong, loading, 
  engineReady, tracksLoadingCount, rawDbg, 
  metronome, onMetronomeUpdate, deviceChannels,
  showPads, setShowPads,
  playbackSample, sampleRate,
  reconnectAudio, setIsConfigured,
  isLoadingStems,
  masterVolume, setMasterVolume
}) => {
  const bpm = metronome.bpm || 120;
  const sr = sampleRate || 44100;
  const samplesPerBeat = (sr * 60) / bpm;
  const samplesPerBar = samplesPerBeat * 4;
  
  const bar = Math.floor(playbackSample / samplesPerBar) + 1;
  const beat = Math.floor((playbackSample % samplesPerBar) / samplesPerBeat) + 1;

  return (
    <header style={{ 
      height: '64px', background: 'rgba(8, 10, 16, 0.8)', 
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      padding: '0 24px', backdropFilter: 'blur(10px)', zIndex: 100
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
          <button onClick={handleRestart} className="transport-btn" style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer' }}><SkipBack size={16} fill="currentColor" /></button>
          
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
            {isPlaying ? <Pause size={16} fill="#ef4444" color="#ef4444" /> : <Play size={16} fill="white" color="white" />}
            <span style={{ fontWeight: '900', fontSize: '0.75rem', color: isPlaying ? '#ef4444' : 'white' }}>
              {isLoadingStems ? 'LOADING' : (isPlaying ? 'PAUSE' : 'PLAY')}
            </span>
          </button>

          <button onClick={handleStop} className="transport-btn" style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer' }}><Square size={16} fill="currentColor" /></button>
        </div>
      </div>

      {/* CONTADOR BAR / BEAT - ESTILO PREMIUM */}
      <div style={{ 
        display: 'flex', gap: '1.2rem', alignItems: 'center', 
        background: 'rgba(0,0,0,0.3)', padding: '6px 20px', 
        borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
        minWidth: '180px', justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>BAR</span>
          <span className="mono-data" style={{ fontSize: '1.2rem', fontWeight: '950', color: '#fff' }}>
            {bar}
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.1)', fontWeight: '900' }}>|</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>BEAT</span>
          <span className="mono-data" style={{ fontSize: '1.2rem', fontWeight: '950', color: '#fff' }}>
            {beat}
          </span>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '6px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button 
          onClick={() => onMetronomeUpdate('enabled', !metronome.enabled)}
          className={`transport-btn ${metronome.enabled ? 'active-cyan' : ''}`}
          title="Metrónomo (Click)"
        >
          {metronome.enabled ? <Bell size={18} fill="currentColor" /> : <BellOff size={18} />}
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', width: '60px' }}>
          <span style={{ fontSize: '0.5rem', fontWeight: '900', color: 'var(--daw-cyan)', opacity: 0.6 }}>TEMPO</span>
          <input 
            type="number"
            value={metronome.bpm}
            onChange={(e) => onMetronomeUpdate('bpm', parseFloat(e.target.value))}
            className="mono-data"
            style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '900', fontSize: '0.85rem', width: '100%', outline: 'none' }}
          />
        </div>

        {/* SELECTOR DE SALIDA DEL CLICK */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '85px', marginLeft: '10px' }}>
          <span style={{ fontSize: '0.5rem', fontWeight: '900', color: 'var(--daw-cyan)', opacity: 0.6 }}>OUT CLICK</span>
          <select 
            value={metronome.outputCh}
            onChange={(e) => onMetronomeUpdate('outputCh', parseInt(e.target.value))}
            style={{
              background: 'transparent', border: 'none', color: 'white', 
              fontWeight: '900', fontSize: '0.75rem', outline: 'none',
              cursor: 'pointer'
            }}
          >
            {Array.from({ length: deviceChannels }).map((_, idx) => (
              <option key={idx} value={idx} style={{ background: '#020617' }}>CH {idx + 1} (MONO)</option>
            ))}
          </select>
        </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.55rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>METRONOME VOLUME</span>
              <input 
                type="range" min="0" max="1.5" step="0.01" 
                value={metronome.volume} 
                onChange={(e) => onMetronomeUpdate('volume', parseFloat(e.target.value))}
                style={{ width: '100px', height: '4px', accentColor: '#ffffff' }} 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', marginLeft: '10px' }}>
              <span style={{ fontSize: '0.55rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>TAP TEMPO</span>
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
                    if (calculatedBpm >= 40 && calculatedBpm <= 250) {
                      onMetronomeUpdate('bpm', calculatedBpm);
                    }
                  }
                }}
                className="tap-btn"
                style={{ 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white', fontWeight: '950', fontSize: '0.65rem', 
                  padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                  transition: 'all 0.1s active:scale-95'
                }}
              >
                TAP
              </button>
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
  const [audioError, setAudioError] = useState(null); 
  const [metronome, setMetronome] = useState({ enabled: true, bpm: 120, volume: 0.5, outputCh: 0 });
  const [masterVolume, setMasterVolume] = useState(1);
  const [deviceChannels, setDeviceChannels] = useState(2); // Volvemos a 2 como base, la app se expandirá según el hardware real
  const [activeSong, setActiveSong] = useState(null);
  const [songs, setSongs] = useState([]);
  const [setlist, setSetlist] = useState([]);
  const [showCloudBrowser, setShowCloudBrowser] = useState(false);
  const [showPads, setShowPads] = useState(true); 
  const [markers, setMarkers] = useState([]);
  const [activeSequenceId, setActiveSequenceId] = useState(null);
  
  const [totalSamples, setTotalSamples] = useState(0);
  const [playbackSample, setPlaybackSample] = useState(0);
  const [playbackSR, setPlaybackSR] = useState(44100);

  const [engineReady, setEngineReady] = useState(false);
  const [tracksLoadingCount, setTracksLoadingCount] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPrerollActive, setIsPrerollActive] = useState(false);
  const [prerollBars, setPrerollBars] = useState(0);

  const [rawDbg, setRawDbg] = useState(null);
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
      try { setSetlist(JSON.parse(saved)); } catch(e) {}
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

  // Fase 3: Pre-descarga silenciosa de todos los ZIPs del setlist
  useEffect(() => {
    if (!songs.length || !isTauri()) return;
    const prefetchAll = async () => {
      const token = session?.access_token || '';
      for (const song of songs) {
        try {
          const { data: seq } = await supabase.from('sequences').select('id, r2_zip_key').eq('song_id', song.id).maybeSingle();
          if (!seq?.r2_zip_key) continue;
          const songDir = song.id.toString();
          // Intentar sincronización silenciosa (si ya está extraído, el file_manager usa la caché)
          const zipUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${seq.r2_zip_key}`;
          const zipPath = await safeInvoke('download_multitrack', { url: zipUrl, songId: songDir, fileName: 'multitrack.zip', token }).catch(() => null);
          if (zipPath) {
            await safeInvoke('extract_multitrack_zip', { zipPath, songId: songDir }).catch(() => null);
          }
        } catch(e) { /* Silencioso */ }
        // Pausa entre descargas para no saturar la red
        await new Promise(r => setTimeout(r, 500));
      }
    };
    // Lanzar en background sin bloquear la UI
    setTimeout(prefetchAll, 3000);
  }, [songs]);

  const reconnectAudio = async () => {
    const lastDevice = localStorage.getItem('bandly_last_audio_device');
    setLoading(true);
    try {
      try { await safeInvoke('kill_audio_stream'); } catch(e) {}
      if (!lastDevice) {
        setIsConfigured(false);
        return;
      }
      await safeInvoke('init_audio_stream', { deviceId: lastDevice });
      setAudioError(null);
    } catch (e) {
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
      setTracksLoadingCount(report.tracks_loading);
      setIsPrerollActive(report.preroll_active);
      setPrerollBars(report.preroll_bars);
      setTotalSamples(report.total_samples);

      if (Date.now() - lastActionTime.current > 1000) {
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
  }, [activeSong]);

  // RE-SINCRONIZACIÓN DE ESTADO (Fuerza Bruta contra caché)
  const [cacheBuster, setCacheBuster] = useState(Date.now());

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
    const interval = setInterval(handleSyncState, 300);
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


  const onTrackUpdate = useCallback(async (type, data) => {
    if (!data.trackId) return;
    const { trackId, volume, muted, solo, isStereo, output } = data;
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        const next = { ...t };
        if (type === 'volume') next.volume = volume;
        if (type === 'mute') next.muted = muted;
        if (type === 'solo') next.solo = solo;
        if (type === 'panMode') next.isStereo = isStereo;
        if (type === 'output') next.outputIdx = output;

        // Persistencia global por nombre de track (categorizado)
        try {
          const profileStr = localStorage.getItem('bandly_mixer_profile') || '{}';
          const profile = JSON.parse(profileStr);
          const trackKey = getTrackCategory(next.name);
          if (!profile[trackKey]) profile[trackKey] = {};
          if (type === 'volume') profile[trackKey].volume = volume;
          if (type === 'output') profile[trackKey].outputIdx = output;
          if (type === 'panMode') profile[trackKey].isStereo = isStereo;
          if (type === 'mute') profile[trackKey].muted = muted;
          if (type === 'solo') profile[trackKey].solo = solo;
          localStorage.setItem('bandly_mixer_profile', JSON.stringify(profile));
        } catch(e) {}

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
      } catch (e) {}
    }
  }, []);

   const handleSyncSong = useCallback(async (song) => {
    if (!song) return;
    // Ya no bloqueamos toda la pantalla con setLoading(true).
    // Usaremos isLoadingStems para que sea transparente y rápido en el botón Play.
    const targetBpm = parseFloat(song.bpm) || 120;
    setMetronome(prev => {
      // Intentar cargar la configuración guardada del metrónomo
      let savedMetro = { ...prev };
      try {
        const savedData = localStorage.getItem('bandly_metronome_profile');
        if (savedData) savedMetro = { ...savedMetro, ...JSON.parse(savedData) };
      } catch (e) {}

      const next = { ...savedMetro, bpm: targetBpm };
      if (isTauri()) {
        safeInvoke('set_metronome', { enabled: false, volume: next.volume, bpm: next.bpm, outputCh: next.outputCh, standalone: true });
      }
      return { ...next, enabled: false };
    });
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
      if (!sequence) { setTracks([]); setMarkers([]); setActiveSequenceId(null); return; }
      const stems = sequence.sequence_stems || [];
      const songDir = song.id.toString();
      setActiveSequenceId(sequence.id);
      setMarkers(sequence.markers || []);

      // Recuperar perfil global de mezcla
      let mixerProfile = {};
      try {
        mixerProfile = JSON.parse(localStorage.getItem('bandly_mixer_profile') || '{}');
      } catch(e) {}

      const resTracks = stems.map((stem) => {
        const rawName = stem.original_name || stem.instrument_label || 'Inst';
        const cleanName = rawName.replace(/\.[^/.]+$/, ""); // Quita la extensión (.mp3, .wav, etc)
        const trackKey = getTrackCategory(cleanName);
        const displayName = getStandardName(cleanName);
        const saved = mixerProfile[trackKey] || {};

        return {
          id: stem.id, name: displayName, peak: 0, 
          outputIdx: saved.outputIdx !== undefined ? saved.outputIdx : 0, 
          volume: saved.volume !== undefined ? saved.volume : 1,
          isStereo: saved.isStereo !== undefined ? saved.isStereo : true,
          muted: saved.muted !== undefined ? saved.muted : false,
          solo: saved.solo !== undefined ? saved.solo : false,
          color: stem.color || '#8b5cf6', url: stem.r2_key ? `${import.meta.env.VITE_R2_PUBLIC_URL}/${stem.r2_key}` : (stem.playback_url || stem.url)
        };
      });
      setTracks(sortTracks(resTracks));
      setActiveSong(song);
      setActiveSong(song);
      if (isTauri()) {
        try {
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
            } catch (err) {
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
                }
                break;
              }
              await new Promise(r => setTimeout(r, 500));
            }
            setIsLoadingStems(false);
          };
          applyStatesToRust();
        } catch (err) {
          // Error interno silenciado
        } finally {
          setIsLoadingStems(false);
        }
      }
    } catch (e) { 
      // Error de flujo general
    } finally { 
      setLoading(false); 
      setIsLoadingStems(false);
    }
  }, []);

  const onAddMarker = useCallback(async (bar, label, sample) => {
    if (!activeSequenceId) return;
    const colors = ['#22d3ee', '#818cf8', '#fbbf24', '#f472b6', '#34d399'];
    const newMarker = { id: crypto.randomUUID(), bar, label, sample, color: colors[markers.length % colors.length] };
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

  const handleRemoveFromSetlist = useCallback((index) => {
    setSetlist(prev => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem('bandly_setlist', JSON.stringify(next));
      return next;
    });
  }, []);

  if (!isConfigured) return <HardwarePicker onConfigured={(device) => {
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

      <MemoizedTransportUI 
          isPlaying={isPlaying} isBuffering={isBuffering} togglePlay={togglePlay} handleStop={handleStop} 
          handleRestart={handleRestart} activeSong={activeSong} loading={loading} engineReady={engineReady}
          tracksLoadingCount={tracksLoadingCount} rawDbg={rawDbg} setShowCloudBrowser={setShowCloudBrowser}
          metronome={metronome} deviceChannels={deviceChannels} showPads={showPads} setShowPads={setShowPads}
          playbackSample={playbackSample} sampleRate={playbackSR}
          reconnectAudio={reconnectAudio} setIsConfigured={setIsConfigured}
          isLoadingStems={isLoadingStems} masterVolume={masterVolume} setMasterVolume={setMasterVolume}
          onMetronomeUpdate={async (type, val) => {
          const next = { ...metronome, [type]: val };
          setMetronome(next);
          try { localStorage.setItem('bandly_metronome_profile', JSON.stringify({ volume: next.volume, outputCh: next.outputCh })); } catch(e){}
          if (isTauri()) await safeInvoke('set_metronome', { enabled: next.enabled, volume: next.volume, bpm: next.bpm, outputCh: next.outputCh, standalone: true });
        }}
      />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', width: '100%', maxWidth: '100%', position: 'relative' }}>
        <div style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', 
          paddingRight: '300px' 
        }}>
          <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--daw-border)' }}>
            <CueTimeline 
              progress={totalSamples > 0 ? playbackSample / totalSamples : 0} totalSamples={totalSamples} 
              playbackSample={playbackSample} bpm={metronome.bpm} sampleRate={playbackSR} 
              markers={markers} onAddMarker={onAddMarker} onRemoveMarker={onRemoveMarker}
              isPrerollActive={isPrerollActive} prerollBars={prerollBars}
              onSeek={(p) => isTauri() && safeInvoke('seek_to_sample', { sample: Math.floor(p * totalSamples) })} 
            />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <MemoizedMixerConsole tracks={tracks} peaks={peaks} onTrackUpdate={onTrackUpdate} deviceChannels={deviceChannels} />
          </div>
             {showPads && <div style={{ borderTop: '1px solid var(--daw-border)', background: '#020617' }}><PadBoard deviceChannels={deviceChannels} sampleRate={playbackSR} /></div>}
          </div>
        <SetlistSidebar setlist={setlist} activeSong={activeSong} onSelect={handleSyncSong} onRemove={handleRemoveFromSetlist} loading={loading} />
      </main>
      {showCloudBrowser && <CloudRepertoire songs={songs} onClose={() => setShowCloudBrowser(false)} onSelect={(s) => { setSetlist(prev => [...prev, s]); handleSyncSong(s); setShowCloudBrowser(false); }} />}
      {loading && <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,16,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}><Loader2 size={48} className="animate-spin" color="#fff" /><p style={{ marginTop: '2rem', fontWeight: '900', fontSize: '0.9rem', color: '#fff', letterSpacing: '4px', textTransform: 'uppercase' }}>Sincronizando Multitracks...</p></div>}
      
    </div>
  );
}
