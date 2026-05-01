import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Play, Pause, RotateCcw, Volume2, Loader2, AlertCircle,
  Headphones, Music, Guitar, Mic2, Piano, Drum, Wand2, Zap, RefreshCw
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : ''
);

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
      borderRadius: '16px', padding: '18px 14px',
      minWidth: '100px', maxWidth: '120px',
      transition: 'all 0.2s', opacity: isEffectivelyMuted ? 0.35 : 1,
      flexShrink: 0,
    }}>
      {/* Icono */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: stem.color || '#8b5cf6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isSoloed ? `0 0 16px ${stem.color}88` : 'none',
        transition: 'box-shadow 0.2s',
      }}>
        <StemIcon type={stem.instrument_type} size={16} />
      </div>

      {/* Label */}
      <div style={{
        fontSize: '0.55rem', fontWeight: '800', textTransform: 'uppercase',
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
            accentColor: stem.color || '#8b5cf6',
          }}
        />
        <Volume2 size={11} color="rgba(255,255,255,0.25)" />
      </div>

      {/* Mute */}
      <button onClick={() => onMuteToggle(stem.id)} style={{
        width: '100%', padding: '5px 0', borderRadius: '8px',
        fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.5px',
        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
        background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.07)',
        color: isMuted ? 'white' : 'rgba(255,255,255,0.45)',
      }}>M</button>

      {/* Solo */}
      <button onClick={() => onSoloToggle(stem.id)} style={{
        width: '100%', padding: '5px 0', borderRadius: '8px',
        fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.5px',
        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
        background: isSoloed ? '#f59e0b' : 'rgba(255,255,255,0.07)',
        color: isSoloed ? 'white' : 'rgba(255,255,255,0.45)',
      }}>S</button>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────
export default function WebStemPlayer({ song, preloadedSequence, session, onClose }) {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | playing | error
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
  const startTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const rafRef = useRef(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopAll();
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Helper to reliably unlock Web Audio API on iOS/Mobile
  const unlockAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    
    // Play a silent buffer to fully unlock the audio context
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      if (source.start) source.start(0);
    } catch (e) {}

    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  };

  // Carga iniciada por tap del usuario (requerido por iOS Safari)
  const handleStartLoad = () => {
    try {
      unlockAudioContext();
    } catch (e) {
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
        zipBuffer = merged.buffer;
      } else {
        zipBuffer = await zipResp.arrayBuffer();
        setLoadProgress(60);
      }

      // 3. Descomprimir de forma ASYNC (no bloquea UI)
      setLoadingMsg('Descomprimiendo...');
      const { unzip } = await import('fflate');
      const uint8 = new Uint8Array(zipBuffer);
      const unzipped = await new Promise((resolve, reject) => {
        unzip(uint8, (err, result) => err ? reject(err) : resolve(result));
      });
      setLoadProgress(70);

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const audioExtensions = ['.wav', '.mp3', '.aif', '.aiff', '.ogg', '.flac'];
      const validStems = [];

      // 4. Decodificar stems uno por uno (protege RAM en movil)
      for (let i = 0; i < stemsMeta.length; i++) {
        const stemMeta = stemsMeta[i];
        const targetName = stemMeta.original_name;
        setLoadingMsg(`Preparando: ${stemMeta.instrument_label || targetName}`);

        const zipEntry = Object.entries(unzipped).find(([path]) =>
          path.split('/').pop() === targetName || path === targetName
        );
        if (!zipEntry) {
          console.warn(`[WebStemPlayer] Stem "${targetName}" no encontrado en ZIP`);
          continue;
        }

        const [, fileData] = zipEntry;
        const ext = targetName.toLowerCase().substring(targetName.lastIndexOf('.'));
        if (!audioExtensions.includes(ext)) continue;

        try {
          const ab = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
          const buffer = await ctx.decodeAudioData(ab);
          validStems.push({
            id: stemMeta.id || i,
            original_name: targetName,
            instrument_label: stemMeta.instrument_label || 'Pista',
            instrument_type: stemMeta.instrument_type || 'unknown',
            color: stemMeta.color || '#8b5cf6',
            buffer,
            volume: 1,
          });
        } catch (decodeErr) {
          console.warn(`[WebStemPlayer] No se pudo decodificar: ${targetName}`, decodeErr);
        }

        setLoadProgress(70 + Math.round(((i + 1) / stemsMeta.length) * 28));
      }

      if (validStems.length === 0) throw new Error('No se pudo decodificar ningun stem del ZIP.');

      // Regla de oro: click y cues primero, luego agrupar por familia
      const sortedStems = sortStems(validStems);

      gainNodesRef.current = sortedStems.map(() => {
        const g = ctx.createGain();
        g.connect(ctx.destination);
        return g;
      });

      setStems(sortedStems);
      setDuration(Math.max(...sortedStems.map(s => s.buffer.duration)));
      setLoadProgress(100);
      setStatus('ready');
    } catch (e) {
      console.error('[WebStemPlayer]', e);
      setErrorMsg(e.message || 'Error cargando los stems.');
      setStatus('error');
    }
  };

  // ── Transport ─────────────────────────────────────────────
  const stopAll = useCallback(() => {
    sourcesRef.current.forEach(src => { try { src.stop(); } catch (_) {} });
    sourcesRef.current = [];
    isPlayingRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const startPlayback = useCallback(async (offset = 0) => {
    if (!audioCtxRef.current || stems.length === 0) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    stopAll();

    const anySolo = Object.values(soloMap).some(Boolean);
    sourcesRef.current = stems.map((stem, i) => {
      const src = ctx.createBufferSource();
      src.buffer = stem.buffer;
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
      unlockAudioContext();
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
      position: 'fixed', inset: 0, zIndex: 500000,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: '1100px',
        background: 'linear-gradient(160deg, #0d1117 0%, #0f172a 50%, #1a0f2e 100%)',
        border: '1px solid rgba(139,92,246,0.25)',
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
          background: 'rgba(139,92,246,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Headphones size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '0.55rem', fontWeight: '800', color: '#8b5cf6', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Sala de Previsualizacion
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: 'white' }}>{song?.title}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none',
            color: 'rgba(255,255,255,0.6)', width: '34px', height: '34px',
            borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

          {/* IDLE: tap para iniciar */}
          {status === 'idle' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}>
                <Headphones size={28} color="#8b5cf6" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Toca el boton para cargar los stems desde la nube.
              </p>
              <button onClick={handleStartLoad} style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                border: 'none', color: 'white', padding: '14px 32px',
                borderRadius: '14px', fontSize: '0.95rem', fontWeight: '800',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
              }}>
                <Play size={18} /> Cargar Secuencia
              </button>
            </div>
          )}

          {/* LOADING con barra de progreso */}
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Loader2 size={36} style={{ animation: 'wspin 1s linear infinite', marginBottom: '1rem', color: '#8b5cf6' }} />
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>{loadingMsg}</p>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '10px',
                  background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
                  width: `${loadProgress}%`, transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>{loadProgress}%</p>
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <AlertCircle size={44} />
              <p style={{ fontSize: '0.95rem', fontWeight: '700' }}>{errorMsg}</p>
              <button onClick={handleStartLoad} style={{
                background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                color: '#a78bfa', padding: '10px 24px', borderRadius: '12px',
                cursor: 'pointer', fontWeight: '700',
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
                style={{ flex: 1, accentColor: '#8b5cf6', cursor: 'pointer' }} />
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
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                border: 'none', color: 'white',
                width: '54px', height: '54px', borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(139,92,246,0.5)',
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
