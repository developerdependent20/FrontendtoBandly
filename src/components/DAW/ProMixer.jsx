import React, { useState, useEffect, useRef, useCallback } from 'react';
import { isTauri, safeInvoke, safeListen } from '../../utils/tauri';
import { open } from '@tauri-apps/plugin-dialog';
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
  ChevronUp, ChevronDown, Grid 
} = Icons;

const sortTracks = (tracksList) => {
  const priority = (name) => {
    if (!name) return 10;
    const n = name.toUpperCase();
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

const SetlistSidebar = React.memo(({ setlist, activeSong, onSelect, onRemove, loading }) => (
  <aside style={{ width: '300px', background: '#0f172a', borderLeft: '1px solid var(--daw-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--daw-cyan)' }}>
        <Icons.Layout size={16} />
        <span style={{ fontWeight: '900', fontSize: '0.75rem', letterSpacing: '1px' }}>SHOW MANAGER</span>
      </div>
    </div>
    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
      {setlist.map((song, idx) => (
        <div key={song.id} className={`setlist-item ${activeSong?.id === song.id ? 'active' : ''}`}
          style={{ position: 'relative' }}
        >
          <div onClick={() => onSelect(song)} style={{ flex: 1, cursor: 'pointer' }}>
            <div style={{ fontWeight: '800', fontSize: '0.75rem', opacity: 0.5 }}>{idx + 1}. {song.artist || 'Bandly Artist'}</div>
            <div style={{ fontSize: '1rem', fontWeight: '900', color: activeSong?.id === song.id ? 'var(--daw-cyan)' : 'white' }}>{song.title}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '0.6rem', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontWeight: '900' }}>{song.bpm} BPM</span>
              {activeSong?.id === song.id && loading && <Icons.Loader2 size={12} className="animate-spin" color="var(--daw-cyan)" />}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(song.id); }}
            title="Quitar del setlist"
            style={{
              position: 'absolute', top: '8px', right: '8px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', borderRadius: '4px', padding: '2px 6px',
              cursor: 'pointer', fontSize: '0.6rem', fontWeight: '900',
              opacity: 0.7, transition: 'opacity 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >
            ✕
          </button>
        </div>
      ))}
      {setlist.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: '700' }}>
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
  isLoadingStems
}) => {
  const bpm = metronome.bpm || 120;
  const sr = sampleRate || 44100;
  const samplesPerBeat = (sr * 60) / bpm;
  const samplesPerBar = samplesPerBeat * 4;
  
  const bar = Math.floor(playbackSample / samplesPerBar) + 1;
  const beat = Math.floor((playbackSample % samplesPerBar) / samplesPerBeat) + 1;

  return (
    <header style={{ 
    height: '75px', background: '#020617', padding: '0 2rem', borderBottom: '1px solid var(--daw-border)', 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
  }}>
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', color: 'var(--daw-cyan)' }}>
        <Activity size={20} strokeWidth={3} className={isPlaying ? "animate-pulse" : ""} />
        <span style={{ fontWeight: '900', fontSize: '0.9rem', letterSpacing: '2px' }}>BANDLY DAW</span>
      </div>
      
      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px 15px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={handleRestart} className="transport-btn" title="Volver al inicio"><SkipBack size={18} fill="currentColor" /></button>

        <button 
          onClick={togglePlay} 
          disabled={!engineReady} 
          className="main-play-btn"
          style={{ 
            background: isLoadingStems ? '#78350f' : (isPlaying ? '#ef4444' : 'var(--daw-cyan)'),
            padding: '10px 25px',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '10px',
            boxShadow: isLoadingStems ? '0 0 20px rgba(251, 191, 36, 0.4)' : (isPlaying ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(34, 211, 238, 0.4)'),
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isLoadingStems ? 0.8 : 1,
            cursor: isLoadingStems ? 'wait' : 'pointer'
          }}
        >
          {isLoadingStems ? (
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '16px' }}>⏳</span>
          ) : isPlaying ? (
            <Pause size={20} fill="white" />
          ) : (
            <Play size={20} fill="white" style={{ marginLeft: '2px' }} />
          )}
          <span style={{ fontWeight: '900', fontSize: '0.8rem', color: 'white' }}>
            {isLoadingStems ? 'CARGANDO' : (isPlaying ? 'PAUSE' : 'PLAY')}
          </span>
        </button>

        <button onClick={handleStop} className="transport-btn" title="Detener"><Square size={18} fill="currentColor" /></button>
      </div>

      {/* CONTADOR BAR / BEAT (Hito 60) */}
      <div style={{ 
        display: 'flex', gap: '1rem', alignItems: 'center', 
        background: 'rgba(0,0,0,0.5)', padding: '8px 25px', 
        borderRadius: '12px', border: '1px solid rgba(34, 211, 238, 0.2)',
        boxShadow: 'inset 0 0 15px rgba(34, 211, 238, 0.05)',
        minWidth: '220px', justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--daw-cyan)', opacity: 0.6, letterSpacing: '1px' }}>BAR</span>
          <span className="mono-data" style={{ fontSize: '1.4rem', fontWeight: '950', color: 'var(--daw-cyan)', textShadow: '0 0 10px rgba(34, 211, 238, 0.3)' }}>
            {bar}
          </span>
        </div>
        <span style={{ color: 'var(--daw-cyan)', opacity: 0.3, fontWeight: '900' }}>·</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--daw-cyan)', opacity: 0.6, letterSpacing: '1px' }}>BEAT</span>
          <span className="mono-data" style={{ fontSize: '1.4rem', fontWeight: '950', color: 'var(--daw-cyan)', textShadow: '0 0 10px rgba(34, 211, 238, 0.3)' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', width: '50px' }}>
           <span style={{ fontSize: '0.5rem', fontWeight: '900', color: 'var(--daw-cyan)', opacity: 0.6 }}>VOL</span>
           <input 
             type="range" min="0" max="1" step="0.01"
             value={metronome.volume}
             onChange={(e) => onMetronomeUpdate('volume', parseFloat(e.target.value))}
             style={{ width: '100%', height: '4px', accentColor: 'var(--daw-cyan)' }}
           />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '45px' }}>
           <span style={{ fontSize: '0.5rem', fontWeight: '900', color: 'var(--daw-cyan)', opacity: 0.6 }}>OUT</span>
           <select 
             value={metronome.outputCh || 0}
             onChange={(e) => onMetronomeUpdate('outputCh', parseInt(e.target.value))}
             style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '900', fontSize: '0.7rem', borderRadius: '4px', outline: 'none', cursor: 'pointer' }}
           >
             {[...Array(deviceChannels || 2)].map((_, i) => (
               <option key={i} value={i} style={{ background: '#020617' }}>{i + 1}</option>
             ))}
           </select>
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.55rem', fontWeight: '600', color: 'var(--daw-text-muted)', letterSpacing: '1px' }}>
          {activeSong ? 'SESIÓN ACTIVA' : 'arma tu setlist'}
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: activeSong ? 'white' : 'var(--daw-text-muted)', opacity: activeSong ? 1 : 0.4 }}>
          {activeSong?.title || 'Sigue creando'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => setShowPads(!showPads)} 
          className={`icon-btn ${showPads ? 'active-cyan' : ''}`} 
          title="Toggle Pad Board"
          style={{ background: showPads ? 'rgba(34,211,238,0.1)' : 'transparent' }}
        >
          <Grid size={22} color={showPads ? 'var(--daw-cyan)' : 'white'} />
        </button>

        <button onClick={() => setShowCloudBrowser(true)} className="icon-btn-cyan" title="Repertorio Cloud"><Cloud size={24} /></button>
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
  const [deviceChannels, setDeviceChannels] = useState(2);
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

  // RADAR DE RESILIENCIA (释放硬件错误检测)
  useEffect(() => {
    let unlisten = null;
    const startListening = async () => {
        unlisten = await safeListen('audio-device-lost', (event) => {
            console.error("[Audio Engine] CRITICAL: Audio hardware lost!", event.payload);
            setAudioError(`DISPOSITIVO DESCONECTADO: ${event.payload}`);
            setIsPlaying(false);
        });
    };
    startListening();
    return () => { if (unlisten) unlisten(); };
  }, []);

  useEffect(() => {
    const fetchSongs = async () => {
      // Optimizacion: Traer toda la jerarquia de stems desde el inicio para evitar latencia de red al cambiar de cancion
      const { data } = await supabase.from('songs').select('*, sequences(*, sequence_stems(*))').order('title');
      if (data) setSongs(data);
    };
    fetchSongs();
    const saved = localStorage.getItem('bandly_setlist');
    if (saved) {
      try { setSetlist(JSON.parse(saved)); } catch(e) {}
    }
    // Auto-inicializar el stream de audio si ya hay un dispositivo guardado
    if (isTauri()) {
      const lastDevice = localStorage.getItem('bandly_last_audio_device');
      const savedBuffer = localStorage.getItem('bandly_buffer_size');
      if (lastDevice) {
        safeInvoke('init_audio_stream', { deviceId: lastDevice })
          .then(() => {
            if (savedBuffer) safeInvoke('set_audio_buffer_size', { size: parseInt(savedBuffer) }).catch(() => {});
            console.log('[DAW] Auto-reconexión exitosa con:', lastDevice);
            setIsConfigured(true); // Motor OK → entrar al DAW sin HardwarePicker
          })
          .catch((err) => {
            console.warn('[DAW] Auto-reconexión falló, mostrando HardwarePicker:', err);
            setIsConfigured(false); // Mostrar picker para que el usuario elija de nuevo
          });
        // Mientras el init es async, dejar isConfigured=false para mostrar una pantalla de espera
      } else {
        // Sin dispositivo guardado → ir directo al picker (isConfigured ya es false)
      }
    } else {
      // No es Tauri (web preview) → entrar directo
      setIsConfigured(true);
    }
  }, []);

  // Fase 3: Pre-descarga silenciosa de todos los ZIPs del setlist
  useEffect(() => {
    if (!songs.length || !isTauri()) return;
    const prefetchAll = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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
            console.log(`[PREFETCH] Canción lista localmente: ${song.title}`);
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

  useEffect(() => {
    const interval = setInterval(handleSyncState, 300);
    return () => clearInterval(interval);
  }, [handleSyncState]);

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

  const onTrackUpdate = useCallback(async (type, data) => {
    if (!data.trackId) return;
    const { trackId, volume, muted, solo, isStereo, output } = data;
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        if (type === 'volume') return { ...t, volume };
        if (type === 'mute') return { ...t, muted };
        if (type === 'solo') return { ...t, solo };
        if (type === 'panMode') return { ...t, isStereo };
        if (type === 'output') return { ...t, outputIdx: output };
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
    setLoading(true);
    const targetBpm = parseFloat(song.bpm) || 120;
    setMetronome(prev => {
      const next = { ...prev, bpm: targetBpm };
      if (isTauri()) {
        // Solo actualizamos el BPM — el enabled lo controla el usuario manualmente
        safeInvoke('set_metronome', { enabled: false, volume: next.volume, bpm: next.bpm, outputCh: 0, standalone: true });
      }
      return { ...next, enabled: false }; // Resetear el metrónomo al cambiar de canción — usuario lo activa si quiere
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
      const resTracks = stems.map((stem) => ({
        id: stem.id, name: stem.instrument_label || stem.original_name, peak: 0, outputIdx: 1, 
        color: stem.color || '#8b5cf6', url: stem.r2_key ? `${import.meta.env.VITE_R2_PUBLIC_URL}/${stem.r2_key}` : (stem.playback_url || stem.url)
      }));
      setTracks(sortTracks(resTracks));
      setActiveSong(song);
      setSetlist(prev => {
        if (prev.find(s => s.id === song.id)) return prev;
        const next = [...prev, song];
        localStorage.setItem('bandly_setlist', JSON.stringify(next));
        return next;
      });
      if (isTauri()) {
        try {
          setIsLoadingStems(true); // Fase 2: Mostrar estado de carga
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || "";
          const songDir = song.id.toString();
          const syncStemsNatively = async (songId, stemsList) => {
            try {
              await safeInvoke('sync_stems_to_engine', { 
                songId: songId.toString(), 
                stems: stemsList.map(s => ({ id: s.id, original_name: s.original_name })) 
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
        } catch (err) {
          console.error("[DAW DEBUG] Error crítico en la carga de stems:", err);
        } finally {
          setIsLoadingStems(false); // Fase 2: Ocultar estado de carga
        }
      }
    } catch (e) { 
      console.error('[DAW] Error en handleSyncSong:', e);
    } finally { 
      setLoading(false); 
      setIsLoadingStems(false); // Garantía: siempre limpiar el estado de carga
    }
  }, []);

  const onAddMarker = useCallback(async (bar, label, sample) => {
    if (!activeSequenceId) return;
    const colors = ['#22d3ee', '#818cf8', '#fbbf24', '#f472b6', '#34d399'];
    const newMarker = { id: crypto.randomUUID(), bar, label, sample, color: colors[markers.length % colors.length] };
    const nextMarkers = [...markers, newMarker].sort((a, b) => a.sample - b.sample);
    setMarkers(nextMarkers);
    await supabase.from('sequences').update({ markers: nextMarkers }).eq('id', activeSequenceId);
  }, [activeSequenceId, markers]);

  const onRemoveMarker = useCallback(async (index) => {
    if (!activeSequenceId) return;
    const nextMarkers = markers.filter((_, i) => i !== index);
    setMarkers(nextMarkers);
    await supabase.from('sequences').update({ markers: nextMarkers }).eq('id', activeSequenceId);
  }, [activeSequenceId, markers]);

  const handleRemoveFromSetlist = useCallback((songId) => {
    setSetlist(prev => {
      const next = prev.filter(s => s.id !== songId);
      localStorage.setItem('bandly_setlist', JSON.stringify(next));
      return next;
    });
  }, []);

  if (!isConfigured) return <HardwarePicker onConfigured={(device) => {
    setIsConfigured(true);
  }} />;

  return (
    <div className="daw-console" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', background: '#020617' }}>
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
          isLoadingStems={isLoadingStems}
          onMetronomeUpdate={async (type, val) => {
          const next = { ...metronome, [type]: val };
          setMetronome(next);
          if (isTauri()) await safeInvoke('set_metronome', { enabled: next.enabled, volume: next.volume, bpm: next.bpm, outputCh: next.outputCh, standalone: true });
        }}
      />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--daw-border)' }}>
            <CueTimeline 
              progress={totalSamples > 0 ? playbackSample / totalSamples : 0} totalSamples={totalSamples} 
              playbackSample={playbackSample} bpm={metronome.bpm} sampleRate={playbackSR} 
              markers={markers} onAddMarker={onAddMarker} onRemoveMarker={onRemoveMarker}
              isPrerollActive={isPrerollActive} prerollBars={prerollBars}
              onSeek={(p) => isTauri() && safeInvoke('seek_to_sample', { sample: Math.floor(p * totalSamples) })} 
            />
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <MemoizedMixerConsole tracks={tracks} peaks={peaks} onTrackUpdate={onTrackUpdate} />
              </div>
             {showPads && <div style={{ borderTop: '1px solid var(--daw-border)', background: '#020617' }}><PadBoard /></div>}
          </div>
        </div>
        <SetlistSidebar setlist={setlist} activeSong={activeSong} onSelect={handleSyncSong} onRemove={handleRemoveFromSetlist} loading={loading} />
      </main>
      {showCloudBrowser && <CloudRepertoire songs={songs} onClose={() => setShowCloudBrowser(false)} onSelect={(s) => { setSetlist(prev => [...prev, s]); handleSyncSong(s); setShowCloudBrowser(false); }} />}
      {loading && <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,16,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}><Loader2 size={48} className="animate-spin" color="var(--daw-cyan)" /><p style={{ marginTop: '2rem', fontWeight: '900', fontSize: '0.9rem', color: 'var(--daw-cyan)', letterSpacing: '4px', textTransform: 'uppercase' }}>Sincronizando Multitracks...</p></div>}
    </div>
  );
}
