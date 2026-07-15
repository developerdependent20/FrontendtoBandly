import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Upload, Trash2, Power } from 'lucide-react';
import localforage from 'localforage';
import AnalogKnob from './ui/AnalogKnob';
import { alertDialog } from '../utils/dialogService';

const DRUM_PADS = [
  { id: 'kick', label: 'Kick', color: '#ef4444', key: '1', file: 'kick.wav' },
  { id: 'snare', label: 'Snare', color: '#f59e0b', key: '2', file: 'snare.wav' },
  { id: 'hihat_c', label: 'Hi-Hat (C)', color: '#10b981', key: '3', file: 'hihat-closed.wav' },
  { id: 'hihat_o', label: 'Hi-Hat (O)', color: '#3b82f6', key: '4', file: 'hihat-open.wav' },
  { id: 'tom_l', label: 'Floor Tom', color: '#8b5cf6', key: 'q', file: 'tom-floor.wav' },
  { id: 'tom_h', label: 'Tom', color: '#d946ef', key: 'w', file: 'tom.wav' },
  { id: 'drop', label: 'Drop', color: '#a855f7', key: 'e', file: 'drop.wav' },
  { id: 'swell', label: 'Swell', color: '#ec4899', key: 'r', file: 'swell.wav' },
];

export default function PercussionPad() {
  const [ready, setReady] = useState(false);
  const [activePad, setActivePad] = useState(null);
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('bandly_drum_vol') || '0.8'));
  const [powerOn, setPowerOn] = useState(true);
  const [customPads, setCustomPads] = useState({});
  const [hoveredPad, setHoveredPad] = useState(null);

  const ToneRef = useRef(null);
  const synths = useRef({});
  const players = useRef({});
  const volNode = useRef(null);
  const fileInputRef = useRef(null);
  const currentEditPad = useRef(null);

  useEffect(() => {
    localStorage.setItem('bandly_drum_vol', volume);
    if (volNode.current && ToneRef.current && ready) {
      volNode.current.volume.rampTo(ToneRef.current.gainToDb(volume), 0.1);
    }
  }, [volume, ready]);

  useEffect(() => {
    let isMounted = true;
    import('tone').then(async (t) => {
      const Tone = t.default || t;
      ToneRef.current = Tone;

      // Optimización: Reducir la latencia de programación a cero para live drumming
      Tone.context.lookAhead = 0;

      // Volumen inicial leído directo de localStorage (no del estado `volume`):
      // los cambios en vivo de la perilla ya los aplica el efecto de arriba via
      // rampTo(). Si este efecto dependiera de `volume` reactivamente, cada
      // movimiento de la perilla destruiría y reconstruiría TODO el motor
      // (8 synths + recarga de samples personalizados) — glitches audibles y
      // fuga de memoria por los blob URLs nunca liberados.
      const initialVolume = parseFloat(localStorage.getItem('bandly_drum_vol') || '0.8');
      volNode.current = new Tone.Volume(Tone.gainToDb(initialVolume)).toDestination();

      // Synthetic Fallbacks (solo se usan si el sample real -por defecto o
      // personalizado- falla al cargar; en uso normal nunca suenan)
      synths.current = {
        kick: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4 }).connect(volNode.current),
        snare: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }).connect(volNode.current),
        hihat_c: new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).connect(volNode.current),
        hihat_o: new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 0.4, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).connect(volNode.current),
        tom_l: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 2 }).connect(volNode.current),
        tom_h: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 2 }).connect(volNode.current),
        drop: new Tone.MembraneSynth({ pitchDecay: 0.2, octaves: 6 }).connect(volNode.current),
        swell: new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.5, decay: 0.5, sustain: 0.3, release: 1.5 } }).connect(volNode.current)
      };

      // Cargar el audio real de cada pad: el sample personalizado del usuario
      // (localforage) tiene prioridad; si no hay uno, usamos el sample de
      // fábrica en /audio/drums. El synth de arriba solo entra si ambos fallan.
      const loadedCustoms = {};
      for (const pad of DRUM_PADS) {
        try {
          const customFile = await localforage.getItem(`bandly_pad_${pad.id}`);
          const isCustom = !!customFile;
          const url = isCustom ? URL.createObjectURL(customFile) : (pad.file ? `/audio/drums/${pad.file}` : null);
          if (!url) continue;

          await new Promise((resolve) => {
            const player = new Tone.Player({
              url,
              onload: () => {
                player.connect(volNode.current);
                players.current[pad.id] = player;
                if (isCustom) {
                  loadedCustoms[pad.id] = true;
                  URL.revokeObjectURL(url); // el buffer ya está decodificado en memoria, liberar el blob
                }
                resolve();
              },
              onerror: () => { if (isCustom) URL.revokeObjectURL(url); resolve(); }
            });
          });
        } catch (e) {
          console.error(`Error loading pad ${pad.id}`, e);
        }
      }

      if (isMounted) {
        setCustomPads(loadedCustoms);
        setReady(true);
      }
    });

    // Capturamos las referencias AQUÍ (mismos objetos que se siguen mutando en
    // vivo, nunca se reasignan) para satisfacer la regla de refs en cleanups.
    const synthsMap = synths.current;
    const playersMap = players.current;
    return () => {
      isMounted = false;
      Object.values(synthsMap).forEach(s => s.dispose());
      Object.values(playersMap).forEach(p => p.dispose());
      if (volNode.current) volNode.current.dispose();
    };
  }, []); // Solo al montar: ver comentario sobre initialVolume arriba

  const triggerPad = useCallback((id) => {
    if (!ready || !powerOn) return;
    
    if (ToneRef.current && ToneRef.current.context.state !== 'running') {
      ToneRef.current.start();
    }

    // Usamos immediate() para saltarnos el lookAhead y disparar en el instante exacto
    const now = ToneRef.current.immediate();

    if (players.current[id] && players.current[id].loaded) {
      // Reiniciamos el offset en caso de que se esté reproduciendo
      players.current[id].start(now, 0);
    } else {
      const s = synths.current[id];
      if (s) {
        if (id === 'kick') s.triggerAttackRelease('C1', '8n', now);
        else if (id === 'tom_l') s.triggerAttackRelease('G1', '8n', now);
        else if (id === 'tom_h') s.triggerAttackRelease('G2', '8n', now);
        else if (id === 'drop') s.triggerAttackRelease('C1', '2n', now);
        else if (id === 'swell') s.triggerAttackRelease('2n', now);
        else s.triggerAttackRelease('16n', now);
      }
    }

    setActivePad(id);
    setTimeout(() => setActivePad(null), 100);
  }, [ready, powerOn]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat || !powerOn) return;
      const pad = DRUM_PADS.find(p => p.key === e.key.toLowerCase());
      if (pad) triggerPad(pad.id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [powerOn, triggerPad]);

  const handleUploadClick = (e, padId) => {
    e.stopPropagation();
    currentEditPad.current = padId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentEditPad.current) return;
    const padId = currentEditPad.current;

    try {
      await localforage.setItem(`bandly_pad_${padId}`, file);
      const url = URL.createObjectURL(file);
      const Tone = ToneRef.current;
      
      if (players.current[padId]) {
        players.current[padId].dispose();
      }

      await new Promise((resolve) => {
        const player = new Tone.Player({
          url,
          onload: () => {
            player.connect(volNode.current);
            players.current[padId] = player;
            setCustomPads(prev => ({ ...prev, [padId]: true }));
            URL.revokeObjectURL(url);
            resolve();
          }
        });
      });
    } catch (err) {
      console.error("Error saving custom pad", err);
      alertDialog("Error al guardar el sonido.");
    }
    
    e.target.value = '';
    currentEditPad.current = null;
  };

  const handleRemoveCustom = async (e, padId) => {
    e.stopPropagation();
    await localforage.removeItem(`bandly_pad_${padId}`);
    if (players.current[padId]) {
      players.current[padId].dispose();
      delete players.current[padId];
    }
    setCustomPads(prev => {
      const copy = { ...prev };
      delete copy[padId];
      return copy;
    });

    // Al quitar el sample propio, volvemos al sample de fábrica (no al synth)
    const pad = DRUM_PADS.find(p => p.id === padId);
    if (pad?.file && ToneRef.current) {
      const player = new ToneRef.current.Player({
        url: `/audio/drums/${pad.file}`,
        onload: () => { player.connect(volNode.current); players.current[padId] = player; }
      });
    }
  };

  return (
    <div style={{ 
      background: 'linear-gradient(145deg, #1e293b, #0f172a)', 
      borderRadius: '24px', 
      padding: '2.5rem', 
      border: '1px solid rgba(255,255,255,0.05)',
      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.5)',
      position: 'relative'
    }}>
      <input 
        type="file" 
        accept="audio/*" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* Hardware Header */}
      <div className="drum-pad-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div 
            onClick={() => setPowerOn(!powerOn)}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: powerOn ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,0,0,0.5)',
              border: `2px solid ${powerOn ? '#ef4444' : '#333'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.3s',
              boxShadow: powerOn ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'inset 0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            <Power size={20} color={powerOn ? '#ef4444' : '#555'} />
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
              RHYTHM <span style={{ color: 'var(--primary)' }}>PRO</span>
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', letterSpacing: '2px' }}>
              CUSTOM DRUM MACHINE
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <AnalogKnob 
            value={volume} 
            onChange={setVolume} 
            label="MASTER VOL" 
            color="#ec4899"
          />
        </div>
      </div>

      {/* Pads Grid */}
      <div className="drum-pad-grid" style={{ 
        opacity: powerOn ? 1 : 0.4,
        pointerEvents: powerOn ? 'auto' : 'none'
      }}>
        {DRUM_PADS.map(pad => {
          const isActive = activePad === pad.id;
          const isCustom = customPads[pad.id];
          const isHovered = hoveredPad === pad.id;

          return (
            <div
              key={pad.id}
              onPointerDown={() => triggerPad(pad.id)}
              onMouseEnter={() => setHoveredPad(pad.id)}
              onMouseLeave={() => setHoveredPad(null)}
              style={{
                touchAction: 'none',
                aspectRatio: '1',
                background: isActive 
                  ? pad.color 
                  : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2))',
                border: '1px solid',
                borderColor: isActive ? pad.color : 'rgba(255,255,255,0.1)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.05s',
                transform: isActive ? 'scale(0.96) translateY(2px)' : 'scale(1) translateY(0)',
                boxShadow: isActive 
                  ? `0 0 30px ${pad.color}90, inset 0 0 10px rgba(255,255,255,0.5)` 
                  : 'inset 0 4px 6px rgba(255,255,255,0.05), 0 8px 15px rgba(0,0,0,0.4)',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* LED Strip */}
              <div style={{
                position: 'absolute', top: 0, left: '10%', width: '80%', height: '3px',
                background: isCustom ? pad.color : 'rgba(255,255,255,0.2)',
                boxShadow: isCustom ? `0 0 10px ${pad.color}` : 'none',
                borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px'
              }} />

              <span style={{ fontWeight: '900', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {pad.label}
              </span>
              <span style={{ 
                marginTop: '8px',
                fontSize: '0.75rem', 
                color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(0,0,0,0.3)',
                padding: '2px 8px', borderRadius: '4px'
              }}>
                KEY: {pad.key.toUpperCase()}
              </span>

              {/* Upload/Remove Controls (Visible on hover) */}
              <div style={{
                position: 'absolute', bottom: '8px', left: 0, right: 0,
                display: 'flex', justifyContent: 'center', gap: '10px',
                opacity: isHovered && !isActive ? 1 : 0,
                transition: 'opacity 0.2s',
                pointerEvents: isHovered && !isActive ? 'auto' : 'none'
              }}>
                <button 
                  onClick={(e) => handleUploadClick(e, pad.id)}
                  title="Subir Sample Personalizado"
                  style={{ background: 'rgba(0,0,0,0.6)', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', color: 'white' }}
                >
                  <Upload size={14} />
                </button>
                {isCustom && (
                  <button 
                    onClick={(e) => handleRemoveCustom(e, pad.id)}
                    title="Restaurar Synth"
                    style={{ background: 'rgba(239, 68, 68, 0.6)', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', color: 'white' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {!ready && (
        <div style={{ 
          position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '24px', zIndex: 10 
        }}>
          <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', animation: 'pulse 1s infinite' }}>
            INICIALIZANDO MOTOR DE AUDIO...
          </div>
        </div>
      )}
    </div>
  );
}
