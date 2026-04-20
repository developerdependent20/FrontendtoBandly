import React, { useState, useEffect, useRef, useCallback } from 'react';
import { isTauri, safeInvoke } from '../../utils/tauri';
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

const SetlistSidebar = React.memo(({ setlist, activeSong, onSelect, loading }) => (
  <aside style={{ width: '300px', background: '#0f172a', borderLeft: '1px solid var(--daw-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--daw-cyan)' }}>
        <Icons.Layout size={16} />
        <span style={{ fontWeight: '900', fontSize: '0.75rem', letterSpacing: '1px' }}>SHOW MANAGER</span>
      </div>
    </div>
    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
      {setlist.map((song, idx) => (
        <div key={song.id} onClick={() => onSelect(song)} className={`setlist-item ${activeSong?.id === song.id ? 'active' : ''}`}>
          <div style={{ fontWeight: '800', fontSize: '0.75rem', opacity: 0.5 }}>{idx + 1}. {song.artist || 'Bandly Artist'}</div>
          <div style={{ fontSize: '1rem', fontWeight: '900', color: activeSong?.id === song.id ? 'var(--daw-cyan)' : 'white' }}>{song.title}</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '0.6rem', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontWeight: '900' }}>{song.bpm} BPM</span>
            {activeSong?.id === song.id && loading && <Icons.Loader2 size={12} className="animate-spin" color="var(--daw-cyan)" />}
          </div>
        </div>
      ))}
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
  playbackSample, sampleRate
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
            background: isPlaying ? '#ef4444' : 'var(--daw-cyan)',
            padding: '10px 25px',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '10px',
            boxShadow: isPlaying ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(34, 211, 238, 0.4)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {isPlaying ? (
            <Pause size={20} fill="white" />
          ) : (
            <Play size={20} fill="white" style={{ marginLeft: '2px' }} />
          )}
          <span style={{ fontWeight: '900', fontSize: '0.8rem', color: isPlaying ? 'white' : 'black' }}>
            {isPlaying ? 'PAUSE' : 'PLAY'}
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
          <span style={{ fontSize: '1.4rem', fontWeight: '950', color: 'var(--daw-cyan)', fontFamily: 'monospace', textShadow: '0 0 10px rgba(34, 211, 238, 0.3)' }}>
            {bar}
          </span>
        </div>
        <span style={{ color: 'var(--daw-cyan)', opacity: 0.3, fontWeight: '900' }}>·</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--daw-cyan)', opacity: 0.6, letterSpacing: '1px' }}>BEAT</span>
          <span style={{ fontSize: '1.4rem', fontWeight: '950', color: 'var(--daw-cyan)', fontFamily: 'monospace', textShadow: '0 0 10px rgba(34, 211, 238, 0.3)' }}>
            {beat}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '6px 15px', borderRadius: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--daw-cyan)', opacity: 0.7 }}>STATUS</span>
          <span style={{ fontSize: '0.75rem', fontWeight: '900', color: engineReady ? 'var(--daw-green)' : 'var(--daw-red)' }}>
            {engineReady ? 'ENGINE READY' : 'NO DRIVER'}
          </span>
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
        <div style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--daw-cyan)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Sesión Activa</div>
        <div style={{ fontSize: '1rem', fontWeight: '900', color: 'white' }}>{activeSong?.title || 'ESPERANDO TEMA...'}</div>
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
        <button className="icon-btn" title="Ajustes"><Settings size={22} /></button>
      </div>
    </div>
  </header>
  );
});

export default function ProMixer({ session }) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
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

  useEffect(() => {
    const fetchSongs = async () => {
      const { data } = await supabase.from('songs').select('*, sequences(*)').order('title');
      if (data) setSongs(data);
    };
    fetchSongs();
    const saved = localStorage.getItem('bandly_setlist');
    if (saved) setSetlist(JSON.parse(saved));
  }, []);

  const handleSyncState = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const state = await safeInvoke('get_playback_state');
      // Nuevo formato de tupla (u64, bool, u32, bool, u32, bool, u32)
      if (state && Array.isArray(state)) {
        setPlaybackSample(state[0]);
        setPlaybackSR(state[2]);
        setEngineReady(state[3]);
        setTracksLoadingCount(state[4]);
        setIsPrerollActive(state[5]);
        setPrerollBars(state[6]);

        if (Date.now() - lastActionTime.current > 1000) {
           setIsPlaying(state[1]);
        }
      }

      const picos = await safeInvoke('get_track_peaks');
      if (picos && Array.isArray(picos)) {
        setTracks(prev => prev.map(t => {
          const p = picos.find(item => item.id === t.id);
          return p ? { ...t, peak: p.peak } : t;
        }));
      }

      if (activeSong) {
        const dur = await safeInvoke('get_project_duration');
        if (dur && Array.isArray(dur)) setTotalSamples(dur[0]);
      }
    } catch (e) {}
  }, [activeSong]);

  useEffect(() => {
    const interval = setInterval(handleSyncState, 150);
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
        safeInvoke('set_metronome', { 
          enabled: next.enabled, volume: next.volume, bpm: next.bpm, outputCh: 0, standalone: true 
        });
      }
      return next;
    });
    try {
      if (isTauri()) {
        await safeInvoke('reset_audio_engine');
        await safeInvoke('seek_to_sample', { sample: 0 });
      }
      const { data: sequence, error: seqErr } = await supabase
        .from('sequences').select('*, sequence_stems(*)').eq('song_id', song.id).maybeSingle();

      if (seqErr || !sequence) { setTracks([]); setMarkers([]); setActiveSequenceId(null); return; }

      const stems = sequence.sequence_stems || [];
      const songDir = song.id.toString();
      setActiveSequenceId(sequence.id);
      setMarkers(sequence.markers || []);
      
      let pathJoin = null;
      let fsExists = null;
      if (isTauri()) {
        const { join } = await import('@tauri-apps/api/path');
        const { exists } = await import('@tauri-apps/plugin-fs');
        pathJoin = join;
        fsExists = exists;
      }

      const resTracks = stems.map((stem) => ({
        id: stem.id, name: stem.instrument_label || stem.original_name, peak: 0, outputIdx: 1, 
        color: stem.color || '#8b5cf6', url: stem.r2_key ? `${import.meta.env.VITE_R2_PUBLIC_URL}/${stem.r2_key}` : (stem.playback_url || stem.url)
      }));

      setTracks(sortTracks(resTracks));
      setActiveSong(song);
      setSetlist(prev => prev.find(s => s.id === song.id) ? prev : [...prev, song]);

      if (isTauri()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || "";
          let projectDir = await OfflineManager.getSongDir(song.id);
          
          const loadStemsToEngine = async (dir) => {
            for (const stem of stems) {
              const filePath = await pathJoin(dir, stem.original_name);
              const exists = await fsExists(filePath);
              if (!exists) return false;
              await safeInvoke('load_audio_track', { trackId: stem.id, filePath });
            }
            return true;
          };

          if (!(await loadStemsToEngine(projectDir)) && sequence.zipDownloadUrl) {
            const zipPath = await safeInvoke('download_multitrack', { url: sequence.zipDownloadUrl, songId: songDir, fileName: "multitrack.zip", token });
            projectDir = await safeInvoke('extract_multitrack_zip', { zipPath, songId: songDir });
            await loadStemsToEngine(projectDir);
          }
        } catch (err) { console.error("[DAW] Error crítico:", err); }
      }
    } catch (e) { console.error("[DAW] ERROR:", e); } finally { setLoading(false); }
  }, [setTracks, setActiveSong, setSetlist]);

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

  if (!isConfigured && isTauri()) return <HardwarePicker onConfigured={() => setIsConfigured(true)} />;

  return (
    <div className="daw-console" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
       <MemoizedTransportUI 
        isPlaying={isPlaying} isBuffering={isBuffering} togglePlay={togglePlay} handleStop={handleStop} 
        handleRestart={handleRestart} activeSong={activeSong} loading={loading} engineReady={engineReady}
        tracksLoadingCount={tracksLoadingCount} rawDbg={rawDbg} setShowCloudBrowser={setShowCloudBrowser}
        metronome={metronome} deviceChannels={deviceChannels} showPads={showPads} setShowPads={setShowPads}
        playbackSample={playbackSample} sampleRate={playbackSR}
        onMetronomeUpdate={async (type, val) => {
          const next = { ...metronome, [type]: val };
          setMetronome(next);
          if (isTauri()) {
            await safeInvoke('set_metronome', { enabled: next.enabled, volume: next.volume, bpm: next.bpm, outputCh: next.outputCh, standalone: true });
          }
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
                <MemoizedMixerConsole tracks={tracks} onTrackUpdate={onTrackUpdate} />
             </div>
             {showPads && <div style={{ borderTop: '1px solid var(--daw-border)', background: '#020617' }}><PadBoard /></div>}
          </div>
        </div>
        <SetlistSidebar setlist={setlist} activeSong={activeSong} onSelect={handleSyncSong} loading={loading} />
      </main>

      {showCloudBrowser && <CloudRepertoire songs={songs} onClose={() => setShowCloudBrowser(false)} onSelect={(s) => { setSetlist(prev => [...prev, s]); handleSyncSong(s); setShowCloudBrowser(false); }} />}
      {loading && <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,16,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}><Loader2 size={48} className="animate-spin" color="var(--daw-cyan)" /><p style={{ marginTop: '2rem', fontWeight: '900', fontSize: '0.9rem', color: 'var(--daw-cyan)', letterSpacing: '4px', textTransform: 'uppercase' }}>Sincronizando Multitracks...</p></div>}
    </div>
  );
}
