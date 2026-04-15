import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

/**
 * useLiveAudio v3.8 - Operación Opción Nuclear
 * Sustitución dinámica de AudioContext e Intercepción de Errores Sistema.
 */
const useLiveAudio = (stems = [], bpm = 120) => {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [systemLogs, setSystemLogs] = useState([]);
  
  const [trackStates, setTrackStates] = useState({}); 
  const [trackStatus, setTrackStatus] = useState({}); 

  const playersRef = useRef({}); 
  const nodesRef = useRef({});   
  const initIdRef = useRef(0);
  const clockRef = useRef();

  // 1. INTERCEPTOR DE ERRORES GLOBALES
  useEffect(() => {
    const handleError = (e) => {
      const msg = e.message || "Error Desconocido";
      setSystemLogs(prev => [msg, ...prev].slice(0, 5));
      console.error("[SYSTEM ERROR]:", e);
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (e) => handleError(e.reason));
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  const translate = (name) => {
    const n = name.toLowerCase();
    if (n.includes('click')) return 'Metrónomo';
    if (n.includes('cue') || n.includes('guia')) return 'Cues';
    if (n.includes('bass') || n.includes('bajo')) return 'Bajo';
    if (n.includes('gtr') || n.includes('guitarra')) return 'Guitarra';
    if (n.includes('piano') || n.includes('teclado')) return 'Teclado';
    if (n.includes('vox') || n.includes('voz')) return 'Voces';
    if (n.includes('drums') || n.includes('bateria')) return 'Batería';
    return name;
  };

  const panic = useCallback(() => {
    Tone.getTransport().stop();
    Object.values(playersRef.current).forEach(p => { try { p.stop(); } catch(e) {} });
    setIsPlaying(false);
    setCurrentTime(0);
    Tone.getTransport().seconds = 0;
  }, []);

  /**
   * REANIMACIÓN NUCLEAR (ELIMINAR Y REEMPLAZAR CONTEXTO)
   */
  const awakeEngine = useCallback(async () => {
    setSystemLogs(prev => ["Iniciando Resurrección Nuclear...", ...prev]);
    try {
      // Si el contexto actual está suspendido y no responde, creamos uno nuevo
      if (Tone.context.state !== 'running') {
        const NewContext = window.AudioContext || window.webkitAudioContext;
        const nativeCtx = new NewContext();
        await nativeCtx.resume();
        
        // Inyectamos el nuevo contexto en Tone.js
        const toneCtx = new Tone.Context(nativeCtx);
        Tone.setContext(toneCtx);
        
        setSystemLogs(prev => ["¡NUEVO CONTEXTO CREADO!", ...prev]);
      }
      
      await Tone.start();
      await Tone.context.resume();
      
      setSystemLogs(prev => [`Estado Final: ${Tone.context.state}`, ...prev]);
      return Tone.context.state === 'running';
    } catch (e) {
      const errorMsg = `Fallo Nuclear: ${e.message}`;
      setSystemLogs(prev => [errorMsg, ...prev]);
      return false;
    }
  }, []);

  const togglePlay = useCallback(async () => {
    console.log("[AudioEngine] -> INTENTO DE REPRODUCCIÓN");
    
    if (Tone.context.state !== 'running') {
      const res = await awakeEngine();
      if (!res) return;
    }
    
    try {
      const transport = Tone.getTransport();
      if (transport.state === 'started') {
        transport.pause();
        setIsPlaying(false);
      } else {
        transport.start("+0.02");
        setIsPlaying(true);
      }
    } catch (e) {
      setSystemLogs(prev => [`Error Play: ${e.message}`, ...prev]);
      setIsPlaying(p => !p);
    }
  }, [awakeEngine]);

  const seek = useCallback((time) => {
    Tone.getTransport().seconds = time;
    setCurrentTime(time);
  }, []);

  const updateTrack = useCallback((idx, updates) => {
    setTrackStates(prev => {
      const current = prev[idx];
      if (!current) return prev;
      const next = { ...current, ...updates };
      const nodes = nodesRef.current[idx];
      if (nodes) {
        if (updates.volume !== undefined) nodes.gain.gain.rampTo(Tone.dbToGain(updates.volume), 0.1);
        if (updates.muted !== undefined) nodes.gain.mute = updates.muted;
      }
      return { ...prev, [idx]: next };
    });
  }, []);

  useEffect(() => {
    if (!stems || stems.length === 0) return;
    const currentInitId = ++initIdRef.current;

    const initEngine = async () => {
      setIsReady(false);
      setError(null);
      setDebugInfo({});
      setTrackStates({});
      setTrackStatus({});
      
      Object.values(playersRef.current).forEach(p => p.dispose());
      playersRef.current = {};
      nodesRef.current = {};

      try {
        const masterGain = new Tone.Gain(1).toDestination();

        for (let i = 0; i < stems.length; i++) {
          if (currentInitId !== initIdRef.current) return;
          const stem = stems[i];
          const trackKey = `track_${i}`;

          const stemName = translate(stem.instrument_label || stem.name || 'Instrumento');
          setTrackStatus(prev => ({ ...prev, [trackKey]: '⏳ Cargando' }));
          setDebugInfo(prev => ({ ...prev, [trackKey]: { name: stemName, status: 'Cargando', url: stem.playbackUrl } }));

          try {
            const player = new Tone.Player();
            await Promise.race([
              player.load(stem.playbackUrl),
              new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 12000))
            ]);

            if (currentInitId !== initIdRef.current) { player.dispose(); return; }

            player.sync().start(0);
            const gainNode = new Tone.Gain(1).connect(masterGain);
            const meterNode = new Tone.Meter();
            player.connect(gainNode);
            gainNode.connect(meterNode);

            playersRef.current[trackKey] = player;
            nodesRef.current[trackKey] = { player, gain: gainNode, meter: meterNode };

            const isPriority = stemName === 'Metrónomo' || stemName === 'Cues';
            setTrackStates(prev => ({
              ...prev,
              [trackKey]: {
                volume: 0, muted: false, soloed: false,
                isStereo: !isPriority, routingIndex: isPriority ? 1 : 0,
                isClickOrCue: isPriority, name: stemName,
                dbId: stem.id 
              }
            }));

            setTrackStatus(prev => ({ ...prev, [trackKey]: 'Listo' }));
            setDebugInfo(prev => ({ ...prev, [trackKey]: { ...prev[trackKey], status: 'Conectado' } }));
            setDuration(prev => Math.max(prev, player.buffer.duration || 0));
            
          } catch (err) {
            setTrackStatus(prev => ({ ...prev, [trackKey]: 'Fallo' }));
            setDebugInfo(prev => ({ ...prev, [trackKey]: { ...prev[trackKey], status: 'Error', error: err.message } }));
          }
        }
        setIsReady(true);
      } catch (err) {
        setError("Fallo estructural del motor.");
      }
    };

    initEngine();

    return () => {
      initIdRef.current++;
      Object.values(playersRef.current).forEach(p => p.dispose());
    };
  }, [stems]);

  // SISTEMA DE HEARTBEAT (LATIDO)
  useEffect(() => {
    const update = () => {
      const transport = Tone.getTransport();
      const state = transport.state;
      const seconds = transport.seconds;
      
      if (state === 'started') {
        setCurrentTime(seconds);
      }

      setDebugInfo(prev => ({
        ...prev,
        __heartbeat: {
          time: seconds.toFixed(2),
          state: state,
          context: Tone.context.state,
          ts: Date.now()
        }
      }));

      clockRef.current = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(clockRef.current);
  }, []);

  return {
    isReady,
    isPlaying,
    currentTime,
    duration,
    trackStates,
    trackStatus,
    meters: nodesRef.current,
    debugInfo,
    systemLogs,
    togglePlay,
    awakeEngine,
    panic,
    seek,
    updateTrack,
    error
  };
};

export default useLiveAudio;
