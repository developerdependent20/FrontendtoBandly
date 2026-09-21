import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Play, Pause, RotateCcw, Volume2, Loader2, AlertCircle, Info,
  Headphones, Music, Guitar, Mic2, Piano, Drum, Wand2, Zap, RefreshCw, Monitor
} from 'lucide-react';
import { OfflineManager } from '../../utils/offlineManager';
import { supabase } from '../../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : ''
);

const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Reduce RAM en móvil (~4x menos): mono + 22050Hz en el AudioBuffer.
// El buffer a menor rate se remuestrea automáticamente al reproducir;
// NO se fuerza el rate del contexto (eso causaba el bug de pitch en iOS).
function compactBufferForMobile(ctx, buffer) {
  const targetRate = Math.min(22050, buffer.sampleRate);
  if (buffer.sampleRate <= targetRate && buffer.numberOfChannels === 1) return buffer;
  const ratio = buffer.sampleRate / targetRate;
  const newLength = Math.max(1, Math.floor(buffer.length / ratio));
  const out = ctx.createBuffer(1, newLength, targetRate);
  const dst = out.getChannelData(0);
  const chans = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) chans.push(buffer.getChannelData(c));
  const win = Math.max(1, Math.floor(ratio)); // promedio de ventana: menos aliasing que decimar
  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio);
    let sum = 0, count = 0;
    for (let w = 0; w < win; w++) {
      const idx = start + w;
      if (idx >= buffer.length) break;
      for (let c = 0; c < chans.length; c++) sum += chans[c][idx];
      count += chans.length;
    }
    dst[i] = count > 0 ? sum / count : 0;
  }
  return out;
}

// Icono por tipo de instrumento (sin emojis para evitar problemas de encoding)
function StemIcon({ type, size = 16 }) {
  const props = { size, color: 'white' };
  switch (type) {
    case 'drums':
    case 'click':
    case 'perc':    return <Drum {...props} />;
    case 'vocal':   return <Mic2 {...props} />;
    case 'keys':
    case 'pads':    return <Piano {...props} />;
    case 'ac_gtr':
    case 'e_gtr':
    case 'bass':    return <Guitar {...props} />;
    case 'strings': return <Music {...props} />;
    case 'fx':      return <Wand2 {...props} />;
    case 'cue':     return <Zap {...props} />;
    default:        return <Music {...props} />;
  }
}
// Orden de grupos: click y cue siempre primero, luego ritmo, luego melodies, luego voces, luego efectos
const STEM_GROUP_ORDER = {
  click: 0, cue: 1,
  drums: 2, perc: 3,
  bass: 4,
  keys: 5, pads: 6, strings: 7,
  ac_gtr: 8, e_gtr: 9,
  vocal: 10,
  fx: 11, unknown: 12,
};

function sortStems(stemsArr) {
  return [...stemsArr].sort((a, b) => {
    const ga = STEM_GROUP_ORDER[a.instrument_type] ?? 99;
    const gb = STEM_GROUP_ORDER[b.instrument_type] ?? 99;
    return ga - gb;
  });
}

function fmtTime(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── Canal individual ──────────────────────────────────────────
function StemChannel({ stem, onVolumeChange, onMuteToggle, onSoloToggle, isMuted, isSoloed, anySolo }) {
  const [vol, setVol] = useState(stem.volume ?? 1);
  const isEffectivelyMuted = isMuted || (anySolo && !isSoloed);

  const handleVol = (e) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    onVolumeChange(stem.id, v);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
      background: isEffectivelyMuted ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${isSoloed ? '#f59e0b' : isEffectivelyMuted ? 'rgba(255,255,255,0.06)' : (stem.color + '55')}`,
      borderRadius: '12px', padding: '18px 14px',
      minWidth: '100px', maxWidth: '120px',
      transition: 'all 0.2s', opacity: isEffectivelyMuted ? 0.35 : 1,
      flexShrink: 0,
    }}>
      {/* Icono */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: stem.color || '#fd429c',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isSoloed ? `0 0 16px ${stem.color}88` : 'none',
        transition: 'box-shadow 0.2s',
      }}>
        <StemIcon type={stem.instrument_type} size={16} />
      </div>

      {/* Label */}
      <div style={{
        fontSize: '0.55rem', fontWeight: '500', textTransform: 'uppercase',
        letterSpacing: '0.5px', textAlign: 'center', color: 'white',
        maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {stem.instrument_label || stem.original_name}
      </div>

      {/* Fader vertical */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)' }}>{Math.round(vol * 100)}%</span>
        <input
          type="range" min="0" max="1" step="0.01" value={vol} onChange={handleVol}
          style={{
            writingMode: 'vertical-lr', direction: 'rtl',
            height: '110px', width: '22px', cursor: 'pointer',
            accentColor: stem.color || '#c2c2c1',
          }}
        />
        <Volume2 size={11} color="rgba(255,255,255,0.25)" />
      </div>

      {/* Mute */}
      <button onClick={() => onMuteToggle(stem.id)} style={{
        width: '100%', padding: '5px 0', borderRadius: '12px',
        fontSize: '0.6rem', fontWeight: '500', letterSpacing: '0.5px',
        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
        background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.07)',
        color: isMuted ? 'white' : 'rgba(255,255,255,0.45)',
      }}>M</button>

      {/* Solo */}
      <button onClick={() => onSoloToggle(stem.id)} style={{
        width: '100%', padding: '5px 0', borderRadius: '12px',
        fontSize: '0.6rem', fontWeight: '500', letterSpacing: '0.5px',
        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
        background: isSoloed ? '#f59e0b' : 'rgba(255,255,255,0.07)',
        color: isSoloed ? 'white' : 'rgba(255,255,255,0.45)',
      }}>S</button>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────
export default function WebStemPlayer({ song, session, onClose }) {
  const [status, setStatus] = useState('idle'); // idle | mix | loading | ready | playing | error
  // URL firmada de la mezcla estéreo, si esta secuencia la tiene. Las subidas
  // anteriores a esta función no la tienen y ahí solo se ofrece el modo stems.
  const [mixUrl, setMixUrl] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [loadProgress, setLoadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [stems, setStems] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muteMap, setMuteMap] = useState({});
  const [soloMap, setSoloMap] = useState({});
  const [volumeMap, setVolumeMap] = useState({});

  const audioCtxRef = useRef(null);
  const sourcesRef = useRef([]);
  const gainNodesRef = useRef([]);
  const masterCompressorRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const rafRef = useRef(null);
  const isPlayingRef = useRef(false);
  const buffersRef = useRef({});

  // ── Transport ─────────────────────────────────────────────
  // Declarada antes del efecto de cleanup de abajo: se referencia en su
  // dependency array, que se evalúa en cada render (no solo al desmontar).
  const stopAll = useCallback(() => {
    sourcesRef.current.forEach(src => { try { src.stop(); } catch {} });
    sourcesRef.current = [];
    isPlayingRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    return () => {
      stopAll();
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      buffersRef.current = {};
      OfflineManager.cleanupLocalUrls();
    };
  }, [stopAll]);

  // Helper to reliably unlock Web Audio API on iOS/Mobile
  const unlockAudioContext = async () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      // Siempre al sample rate nativo del dispositivo: forzar un rate distinto
      // hace que iOS reproduzca a doble velocidad/pitch cuando otro audio
      // (Tone.js, llamadas) renegocia la ruta de hardware.
      audioCtxRef.current = new AudioContext();

      // iOS suspende el contexto en llamadas/Siri/otras apps de audio:
      // pausar limpio en vez de dejar la reproducción corrupta.
      audioCtxRef.current.onstatechange = () => {
        const c = audioCtxRef.current;
        if (c && c.state !== 'running' && isPlayingRef.current) {
          pauseOffsetRef.current = c.currentTime - startTimeRef.current;
          sourcesRef.current.forEach(src => { try { src.stop(); } catch {} });
          sourcesRef.current = [];
          isPlayingRef.current = false;
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          setStatus('ready');
        }
      };
    }
    const ctx = audioCtxRef.current;
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Play a silent buffer to fully unlock the audio context
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {}
  };

  // Consulta ligera al abrir: solo para saber si hay mezcla y poder ofrecerla.
  // No descarga audio — eso solo pasa cuando el usuario elige una opción.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session: fresh } } = await supabase.auth.getSession();
        const token = fresh?.access_token || session?.access_token;
        if (!token) return;
        const resp = await fetch(`${API_URL}/api/sequences/${song.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelled && data?.sequence?.mixDownloadUrl) setMixUrl(data.sequence.mixDownloadUrl);
      } catch {
        // Sin mezcla disponible: se ofrece solo el modo por stems.
      }
    })();
    return () => { cancelled = true; };
  }, [song.id, session?.access_token]);

  const handleStartMix = () => setStatus('mix');

  // Carga iniciada por tap del usuario (requerido por iOS Safari)
  const handleStartLoad = async () => {
    try {
      await unlockAudioContext();
    } catch {
      setErrorMsg('Tu navegador no soporta Web Audio API.');
      setStatus('error');
      return;
    }
    loadStems();
  };

  const loadStems = async () => {
    try {
      setStatus('loading');
      setLoadProgress(0);

      // 1. Obtener metadata + zipDownloadUrl del backend
      setLoadingMsg('Conectando...');
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const token = freshSession?.access_token || session?.access_token;

      const resp = await fetch(`${API_URL}/api/sequences/${song.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('No se pudo obtener la secuencia del servidor.');

      const data = await resp.json();
      const seqData = data.sequence;
      if (!seqData) throw new Error('Esta cancion no tiene secuencia.');

      const zipUrl = seqData.zipDownloadUrl;
      const stemsMeta = seqData.stems || [];
      if (!zipUrl) throw new Error('No hay archivo ZIP disponible.');
      if (stemsMeta.length === 0) throw new Error('La secuencia no tiene stems registrados.');

      setLoadProgress(10);

      // 2. Descargar el ZIP con progreso
      setLoadingMsg('Descargando audio...');
      const zipResp = await fetch(zipUrl);
      if (!zipResp.ok) throw new Error('Error descargando el archivo ZIP.');

      const contentLength = zipResp.headers.get('Content-Length');
      let zipBuffer;
      if (contentLength && zipResp.body) {
        const total = parseInt(contentLength, 10);
        const reader = zipResp.body.getReader();
        const chunks = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          setLoadProgress(10 + Math.round((received / total) * 50));
        }
        const merged = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
        chunks.length = 0; // liberar las copias parciales cuanto antes (RAM móvil)
        zipBuffer = merged.buffer;
      } else {
        zipBuffer = await zipResp.arrayBuffer();
        setLoadProgress(60);
      }

      // 3. Descomprimir de forma ASYNC (no bloquea UI)
      setLoadingMsg('Descomprimiendo...');
      const { unzip } = await import('fflate');
      const uint8 = new Uint8Array(zipBuffer);
      let unzipped = await new Promise((resolve, reject) => {
        unzip(uint8, (err, result) => err ? reject(err) : resolve(result));
      });
      // LIBERAR MEMORIA ORIGINAL ZIP
      zipBuffer = null;
      setLoadProgress(70);

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const audioExtensions = ['.wav', '.mp3', '.aif', '.aiff', '.ogg', '.flac'];
      const validStems = [];

      // 4. Decodificar stems en lotes: 4 en desktop (multithreading),
      // de 1 en 1 en móvil para que el pico de RAM no mate la pestaña (iOS)
      const chunkSize = IS_MOBILE ? 1 : 4;
      for (let i = 0; i < stemsMeta.length; i += chunkSize) {
        const chunk = stemsMeta.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (stemMeta, chunkIdx) => {
          const targetName = stemMeta.original_name;
          const zipEntryKey = Object.keys(unzipped).find((path) =>
            path.split('/').pop() === targetName || path === targetName
          );
          if (!zipEntryKey) return;

          const fileData = unzipped[zipEntryKey];
          const ext = targetName.toLowerCase().substring(targetName.lastIndexOf('.'));
          if (!audioExtensions.includes(ext)) {
            delete unzipped[zipEntryKey];
            return;
          }

          try {
            const ab = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
            delete unzipped[zipEntryKey];
            
            let buffer = await ctx.decodeAudioData(ab);
            if (IS_MOBILE) buffer = compactBufferForMobile(ctx, buffer);
            const stemId = stemMeta.id || (i + chunkIdx);
            buffersRef.current[stemId] = buffer;
            
            validStems.push({
              id: stemId,
              original_name: targetName,
              instrument_label: stemMeta.instrument_label || 'Pista',
              instrument_type: stemMeta.instrument_type || 'unknown',
              color: stemMeta.color || '#f7f4ef',
              volume: 1,
            });
          } catch (decodeErr) {
            console.warn(`[WebStemPlayer] No se pudo decodificar: ${targetName}`, decodeErr);
          }
        }));

        setLoadProgress(70 + Math.round((Math.min(i + chunkSize, stemsMeta.length) / stemsMeta.length) * 28));
      }

      if (validStems.length === 0) throw new Error('No se pudo decodificar ningun stem del ZIP.');

      // Regla de oro: click y cues primero, luego agrupar por familia
      const sortedStems = sortStems(validStems);

      // Master Compressor (Auto-Gain & Limiter)
      if (!masterCompressorRef.current) {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -24; // Empieza a comprimir a -24dB (sube lo bajito)
        comp.knee.value = 30; // Compresión suave
        comp.ratio.value = 12; // Ratio alto para controlar picos
        comp.attack.value = 0.003; // Ataque rápido para atajar golpes (batería)
        comp.release.value = 0.25; // Release musical
        comp.connect(ctx.destination);
        masterCompressorRef.current = comp;
      }

      gainNodesRef.current = sortedStems.map(() => {
        const g = ctx.createGain();
        g.connect(masterCompressorRef.current);
        return g;
      });

      setStems(sortedStems);
      const allDurations = Object.values(buffersRef.current).map(b => b.duration);
      setDuration(allDurations.length > 0 ? Math.max(...allDurations) : 0);
      setLoadProgress(100);
      setStatus('ready');
    } catch (e) {
      console.error('[WebStemPlayer]', e);
      setErrorMsg(e.message || 'Error cargando los stems.');
      setStatus('error');
    }
  };

  const startPlayback = useCallback(async (offset = 0) => {
    if (!audioCtxRef.current || stems.length === 0) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    stopAll();

    const anySolo = Object.values(soloMap).some(Boolean);
    sourcesRef.current = stems.map((stem, i) => {
      const src = ctx.createBufferSource();
      src.buffer = buffersRef.current[stem.id];
      src.connect(gainNodesRef.current[i]);
      const effectiveMute = muteMap[stem.id] || (anySolo && !soloMap[stem.id]);
      gainNodesRef.current[i].gain.value = effectiveMute ? 0 : (volumeMap[stem.id] ?? 1);
      src.start(0, offset);
      return src;
    });

    startTimeRef.current = ctx.currentTime - offset;
    pauseOffsetRef.current = offset;
    isPlayingRef.current = true;

    const tick = () => {
      if (!isPlayingRef.current) return;
      const t = audioCtxRef.current.currentTime - startTimeRef.current;
      setCurrentTime(Math.min(t, duration));
      if (t < duration) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setStatus('ready');
        setCurrentTime(0);
        pauseOffsetRef.current = 0;
        isPlayingRef.current = false;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    setStatus('playing');
  }, [stems, muteMap, soloMap, volumeMap, duration, stopAll]);

  const handlePlayPause = async () => {
    if (status === 'playing') {
      pauseOffsetRef.current = audioCtxRef.current.currentTime - startTimeRef.current;
      stopAll();
      setStatus('ready');
    } else {
      await unlockAudioContext();
      await startPlayback(pauseOffsetRef.current);
    }
  };

  const handleSeek = async (e) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    pauseOffsetRef.current = t;
    if (status === 'playing') await startPlayback(t);
  };

  const handleRestart = async () => {
    pauseOffsetRef.current = 0;
    setCurrentTime(0);
    if (status === 'playing') await startPlayback(0);
  };

  // ── Controles de canal ────────────────────────────────────
  const handleVolume = useCallback((id, val) => {
    setVolumeMap(prev => ({ ...prev, [id]: val }));
    const i = stems.findIndex(s => s.id === id);
    if (i >= 0 && gainNodesRef.current[i]) {
      const anySolo = Object.values(soloMap).some(Boolean);
      const eff = muteMap[id] || (anySolo && !soloMap[id]);
      gainNodesRef.current[i].gain.value = eff ? 0 : val;
    }
  }, [stems, muteMap, soloMap]);

  const handleMute = useCallback((id) => {
    setMuteMap(prev => {
      const next = { ...prev, [id]: !prev[id] };
      const anySolo = Object.values(soloMap).some(Boolean);
      stems.forEach((s, i) => {
        const eff = next[s.id] || (anySolo && !soloMap[s.id]);
        if (gainNodesRef.current[i]) gainNodesRef.current[i].gain.value = eff ? 0 : (volumeMap[s.id] ?? 1);
      });
      return next;
    });
  }, [stems, soloMap, volumeMap]);

  const handleSolo = useCallback((id) => {
    setSoloMap(prev => {
      const next = { ...prev, [id]: !prev[id] };
      const anySolo = Object.values(next).some(Boolean);
      stems.forEach((s, i) => {
        const eff = muteMap[s.id] || (anySolo && !next[s.id]);
        if (gainNodesRef.current[i]) gainNodesRef.current[i].gain.value = eff ? 0 : (volumeMap[s.id] ?? 1);
      });
      return next;
    });
  }, [stems, muteMap, volumeMap]);

  const anySolo = Object.values(soloMap).some(Boolean);

  // ── Render ────────────────────────────────────────────────
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000000,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: '1100px',
        background: 'linear-gradient(160deg, #101012 0%, #17171a 50%, #17171a 100%)',
        border: '1px solid rgba(247, 244, 239, 0.18)',
        borderRadius: '20px', overflow: 'hidden',
        boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '95vh',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(247, 244, 239, 0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #fd429c, #ff6a4a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Headphones size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '0.55rem', fontWeight: '500', color: '#f7f4ef', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Sala de Previsualizacion
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '500', color: 'white' }}>{song?.title}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none',
            color: 'rgba(255,255,255,0.6)', width: '34px', height: '34px',
            borderRadius: '12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

          {/* IDLE: elegir cómo escuchar.
              · Mezcla completa: un MP3 de ~5 MB, carga en segundos, sirve para
                repasar. Es lo único viable en celular.
              · Por stems: descomprime y decodifica el multitrack entero en
                memoria. En computador es la magia; en un iPhone son cientos de
                MB y Safari mata la pestaña ("A problem repeatedly occurred"). */}
          {status === 'idle' && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '20px',
                background: 'rgba(247, 244, 239, 0.07)', border: '1px solid rgba(247, 244, 239, 0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.4rem',
              }}>
                <Headphones size={26} color="#f7f4ef" />
              </div>

              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.6rem', fontSize: '0.9rem' }}>
                ¿Cómo quieres escucharla?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '420px', margin: '0 auto' }}>
                {mixUrl && (
                  <button onClick={handleStartMix} style={{
                    background: 'linear-gradient(135deg, #fd429c, #ff6a4a)', border: 'none', color: 'white',
                    padding: '15px 20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '13px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                  }}>
                    <Play size={20} style={{ flexShrink: 0 }} />
                    <span>
                      <span style={{ display: 'block', fontWeight: 500, fontSize: '0.93rem' }}>Mezcla completa</span>
                      <span style={{ display: 'block', fontSize: '0.76rem', opacity: 0.85, marginTop: '2px' }}>
                        Carga en segundos. Ideal para repasar la canción.
                      </span>
                    </span>
                  </button>
                )}

                <button
                  onClick={IS_MOBILE ? undefined : handleStartLoad}
                  disabled={IS_MOBILE}
                  style={{
                    background: 'rgba(255,255,255,0.04)', color: IS_MOBILE ? 'rgba(255,255,255,0.35)' : '#fff',
                    border: '1px solid rgba(255,255,255,0.1)', padding: '15px 20px', borderRadius: '12px',
                    cursor: IS_MOBILE ? 'default' : 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '13px',
                  }}
                >
                  {IS_MOBILE ? <Monitor size={20} style={{ flexShrink: 0 }} /> : <Wand2 size={20} style={{ flexShrink: 0 }} />}
                  <span>
                    <span style={{ display: 'block', fontWeight: 500, fontSize: '0.93rem' }}>Pista por pista</span>
                    <span style={{ display: 'block', fontSize: '0.76rem', opacity: 0.75, marginTop: '2px' }}>
                      {IS_MOBILE
                        ? 'Necesita más memoria de la que un celular le da al navegador. Ábrelo desde una computadora.'
                        : 'Volumen, mute y solo de cada instrumento por separado.'}
                    </span>
                  </span>
                </button>
              </div>

              {!mixUrl && (
                <div style={{
                  marginTop: '1.4rem', fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  padding: '10px 14px', borderRadius: '12px', display: 'inline-flex',
                  alignItems: 'center', gap: '8px', textAlign: 'left', maxWidth: '420px', lineHeight: 1.5
                }}>
                  <Info size={13} style={{ flexShrink: 0 }} />
                  <span>La mezcla rápida no está disponible para esta secuencia todavía.</span>
                </div>
              )}

              {IS_MOBILE && (
                <div style={{
                  marginTop: '1.2rem', fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)',
                  maxWidth: '420px', margin: '1.2rem auto 0', lineHeight: 1.5
                }}>
                  Durante el show tu celular sí sirve: desde <strong>Modo En Vivo</strong> controlas play, pausa y stop del DAW.
                </div>
              )}
            </div>
          )}

          {/* MEZCLA COMPLETA
              Se usa el reproductor nativo del navegador a propósito: maneja
              buffering, seek y la pantalla de bloqueo del celular gratis, y en
              iOS funciona sin pelear con Web Audio. */}
          {status === 'mix' && (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '12px',
                background: 'rgba(247, 244, 239, 0.07)', border: '1px solid rgba(247, 244, 239, 0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.1rem',
              }}>
                <Music size={24} color="#f7f4ef" />
              </div>
              <div style={{ fontWeight: 500, fontSize: '1rem', marginBottom: '0.3rem' }}>{song.title}</div>
              <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
                Mezcla completa
              </div>

              <audio
                src={mixUrl}
                controls
                autoPlay
                style={{ width: '100%', maxWidth: '440px' }}
              />

              {!IS_MOBILE && (
                <div style={{ marginTop: '1.6rem' }}>
                  <button
                    onClick={handleStartLoad}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.7)', padding: '10px 20px', borderRadius: '12px',
                      fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    <Wand2 size={15} /> Cambiar a pista por pista
                  </button>
                </div>
              )}
            </div>
          )}

          {/* LOADING con barra de progreso */}
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Loader2 size={36} style={{ animation: 'wspin 1s linear infinite', marginBottom: '1rem', color: '#f7f4ef' }} />
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>{loadingMsg}</p>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #fd429c, #ff6a4a)',
                  width: `${loadProgress}%`, transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>{loadProgress}%</p>
              {IS_MOBILE && (
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '1.5rem' }}>
                  Procesando canales, un momento...
                </p>
              )}
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <AlertCircle size={44} />
              <p style={{ fontSize: '0.95rem', fontWeight: '500' }}>{errorMsg}</p>
              <button onClick={handleStartLoad} style={{
                background: 'rgba(247, 244, 239, 0.08)', border: '1px solid rgba(247, 244, 239, 0.18)',
                color: '#f7f4ef', padding: '10px 24px', borderRadius: '12px',
                cursor: 'pointer', fontWeight: '500',
              }}>Reintentar</button>
            </div>
          )}

          {/* Consola de stems */}
          {(status === 'ready' || status === 'playing') && stems.length > 0 && (
            <div style={{
              display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px',
              justifyContent: stems.length < 6 ? 'center' : 'flex-start',
            }}>
              {stems.map(stem => (
                <StemChannel
                  key={stem.id} stem={stem}
                  isMuted={!!muteMap[stem.id]} isSoloed={!!soloMap[stem.id]} anySolo={anySolo}
                  onVolumeChange={handleVolume} onMuteToggle={handleMute} onSoloToggle={handleSolo}
                />
              ))}
            </div>
          )}
        </div>

        {/* Transport Footer */}
        {(status === 'ready' || status === 'playing') && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            {/* Barra de tiempo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', minWidth: '32px' }}>{fmtTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 1} step="0.1" value={currentTime} onChange={handleSeek}
                style={{ flex: 1, accentColor: '#c2c2c1', cursor: 'pointer' }} />
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', minWidth: '32px', textAlign: 'right' }}>{fmtTime(duration)}</span>
            </div>

            {/* Controles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <button onClick={handleRestart} style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: 'rgba(255,255,255,0.5)', width: '40px', height: '40px',
                borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <RotateCcw size={15} />
              </button>
              <button onClick={handlePlayPause} style={{
                background: 'linear-gradient(135deg, #fd429c, #ff6a4a)',
                border: 'none', color: 'white',
                width: '54px', height: '54px', borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 0, 0, 0.35)',
              }}>
                {status === 'playing' ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
              </button>
              <button
                onClick={() => {
                  // Resetear todos los faders a 1 (0dB) y limpiar mute/solo
                  setVolumeMap({});
                  setMuteMap({});
                  setSoloMap({});
                  gainNodesRef.current.forEach(g => { if (g) g.gain.value = 1; });
                }}
                title="Resetear faders"
                style={{
                  background: 'rgba(255,255,255,0.05)', border: 'none',
                  color: 'rgba(255,255,255,0.4)', width: '40px', height: '40px',
                  borderRadius: '50%', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px' }}>
              {stems.length} STEMS &middot; BANDLY WEB
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes wspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}
