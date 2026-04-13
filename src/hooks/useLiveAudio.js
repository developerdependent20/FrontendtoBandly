import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

/**
 * useLiveAudio Pro - Motor de Audio Multicanal (32 ch)
 * Soporta ruteo dinámico, mono/stereo y buses independientes.
 */
export function useLiveAudio(stems = []) {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  // Estados de mezcla por track
  const [trackStates, setTrackStates] = useState({});

  const playersRef = useRef({}); // { stemId: Tone.Player }
  const nodesRef = useRef({});   // { stemId: { gain, panner, etc } }
  const mergerRef = useRef(null);
  const animFrameRef = useRef(null);

  // 1. Inicializar el motor con 32 canales
  useEffect(() => {
    if (!stems || stems.length === 0) return;

    const initEngine = async () => {
      setIsReady(false);
      setError(null);

      // Diccionario de traducción musical Pro
      const TRANSLATIONS = {
        'keys': 'Teclados',
        'pads': 'Pads',
        'bass': 'Bajo',
        'drums': 'Batería',
        'percussion': 'Percusión',
        'perc': 'Percusión',
        'electric guitar': 'Guit. Eléctrica',
        'gtr': 'Guitarra',
        'acoustic': 'Acústica',
        'vocals': 'Voces',
        'vox': 'Voces',
        'bgv': 'Coros',
        'click': 'Metrónomo',
        'guide': 'Guía',
        'cue': 'Cues',
        'strings': 'Cuerdas',
        'brass': 'Metales',
        'piano': 'Piano',
        'synth': 'Sinte'
      };

      const translate = (name) => {
        const lower = name.toLowerCase();
        for (const [key, value] of Object.entries(TRANSLATIONS)) {
          if (lower.includes(key)) return value;
        }
        return name;
      };

      try {
        await Tone.start();
        console.log('[LiveAudio] Tone.js iniciado');
        
        // Detectar canales máximos del hardware
        const maxHardwareChannels = Tone.getContext().rawContext.destination.maxChannelCount || 2;
        const targetChannels = Math.min(32, maxHardwareChannels);
        console.log(`[LiveAudio] Configurando matriz para ${targetChannels} canales (Hardware max: ${maxHardwareChannels})`);

        // Crear Merger dinámico usando la API nativa de Web Audio
        if (mergerRef.current) {
          try { mergerRef.current.disconnect(); } catch(e) {}
        }
        
        const rawCtx = Tone.getContext().rawContext;
        mergerRef.current = rawCtx.createChannelMerger(targetChannels);
        mergerRef.current.connect(rawCtx.destination);

        const newTrackStates = {};
        const newPlayers = {};
        const newNodes = {};

        for (const stem of stems) {
          const rawName = stem.instrument_label || stem.original_name || stem.name || 'Unknown Track';
          const stemName = translate(rawName);
          
          // Determinar si es Click/Cue por el nombre (convención pro)
          const isClickOrCue = rawName.toLowerCase().includes('click') || 
                              rawName.toLowerCase().includes('cue') || 
                              rawName.toLowerCase().includes('guia');

          // Estado inicial del track
          newTrackStates[stem.id] = {
            volume: 0,
            muted: false,
            soloed: false,
            isStereo: !isClickOrCue, // Click/Cues suelen ser mono
            routingIndex: isClickOrCue ? 1 : 0, // Click al 2 (index 1), el resto al 1 (index 0)
            isClickOrCue,
            name: stemName
          };

          // Crear Player
          const player = new Tone.Player({
            url: stem.playbackUrl,
            onload: () => {
              console.log(`[Audio] Cargado: ${stem.name}`);
              checkReady();
            },
            onerror: (err) => {
              console.error(`[Audio] Error cargando stem ${stem.name}:`, err);
              setError(`Error al descargar track: ${stem.name}`);
            }
          });

          // Nodo de ganancia para volumen/mute
          const gainNode = new Tone.Gain(1);
          player.connect(gainNode);

          newPlayers[stem.id] = player;
          newNodes[stem.id] = { player, gain: gainNode };
        }

        playersRef.current = newPlayers;
        nodesRef.current = newNodes;
        setTrackStates(newTrackStates);

      } catch (err) {
        console.error('[LiveAudio] Error Crítico:', err);
        setError(`Fallo de inicialización: ${err.message || 'Error desconocido en el motor de audio'}`);
      }
    };

    const checkReady = () => {
      const allLoaded = Object.values(playersRef.current).every(p => p.loaded);
      if (allLoaded) {
        let max = 0;
        Object.values(playersRef.current).forEach(p => {
          if (p.buffer.duration > max) max = p.buffer.duration;
        });
        setDuration(max);
        setIsReady(true);
        // Aplicar ruteo inicial
        applyRouting();
      }
    };

    initEngine();

    return () => {
      Object.values(playersRef.current).forEach(p => p.dispose());
      if (mergerRef.current) mergerRef.current.dispose();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stems]);

  // 2. Lógica de Ruteo Dinámico
  const applyRouting = useCallback(() => {
    if (!mergerRef.current) return;

    Object.keys(nodesRef.current).forEach(stemId => {
      const { gain } = nodesRef.current[stemId];
      const state = trackStates[stemId];
      if (!state) return;

      gain.disconnect();

      if (state.isStereo) {
        // Ruteo Estéreo: canal N y N+1
        gain.connect(mergerRef.current, 0, state.routingIndex);     // Left -> N
        gain.connect(mergerRef.current, 0, state.routingIndex + 1); // Right -> N+1
      } else {
        // Ruteo Mono: solo canal N
        gain.connect(mergerRef.current, 0, state.routingIndex);
      }
    });
  }, [trackStates]);

  // Actualizar ruteo cuando cambian los estados
  useEffect(() => {
    applyRouting();
  }, [trackStates, applyRouting]);

  // 3. Controles de Mezcla
  const updateTrack = (stemId, newState) => {
    setTrackStates(prev => {
      const newStates = { ...prev, [stemId]: { ...prev[stemId], ...newState } };
      
      // Aplicar volumen inmediatamente
      const node = nodesRef.current[stemId];
      if (node) {
        const vol = newStates[stemId].muted ? 0 : Tone.dbToGain(newStates[stemId].volume);
        node.gain.gain.rampTo(vol, 0.1);
      }

      return newStates;
    });
  };

  // 4. Transporte Sincronizado
  const togglePlay = useCallback(async () => {
    if (!isReady) return;

    if (isPlaying) {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      await Tone.start();
      Object.values(playersRef.current).forEach(p => p.sync().start(0));
      Tone.Transport.start();
      setIsPlaying(true);

      const updateProgress = () => {
        setCurrentTime(Tone.Transport.seconds);
        animFrameRef.current = requestAnimationFrame(updateProgress);
      };
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, isReady]);

  const panic = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Object.values(playersRef.current).forEach(p => {
      p.stop();
      p.unsync();
    });
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const seek = useCallback((time) => {
    Tone.Transport.seconds = time;
    setCurrentTime(time);
  }, []);

  return {
    isReady,
    isPlaying,
    currentTime,
    duration,
    trackStates,
    error,
    togglePlay,
    panic,
    seek,
    updateTrack
  };
}
