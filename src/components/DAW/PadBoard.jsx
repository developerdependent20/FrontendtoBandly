import React, { useState, useEffect, useCallback, useRef } from 'react';
import { isTauri } from '../../utils/tauri';
import * as Tone from 'tone';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function PadBoard({ deviceChannels = 2, sampleRate = 44100 }) {
  const [activeKey, setActiveKey] = useState(null);
  const [loadedPads, setLoadedPads] = useState({});
  const [warmLevel, setWarmLevel] = useState(0.7); 
  const [isAmbient, setIsAmbient] = useState(true);
  
  // Referencias para el motor de audio
  const players = useRef({});
  const output = useRef(null);

  // 1. Inicializar Salida y Carga
  useEffect(() => {
    // Creamos un nodo de volumen maestro para los pads con un limitador suave
    output.current = new Tone.Volume(Tone.dbToGain(warmLevel)).toDestination();
    
    const loadAll = async () => {
      for (const note of NOTES) {
        try {
          const safeNote = note.replace('#', 'sharp');
          const url = new URL(`../../assets/audio/pads/${safeNote}.mp3`, import.meta.url).href;
          
          const player = new Tone.Player({
            url,
            loop: true,
            fadeIn: 1.5,
            fadeOut: 1.5,
            onload: () => setLoadedPads(prev => ({ ...prev, [note]: true })),
            onerror: (err) => console.error(`Error Tone.js en ${note}:`, err)
          }).connect(output.current);
          
          players.current[note] = player;
        } catch (e) {
          console.error(`Error preparando pad ${note}:`, e);
          setLoadedPads(prev => ({ ...prev, [note]: false }));
        }
      }
    };

    loadAll();

    return () => {
      // Limpieza al desmontar
      Object.values(players.current).forEach(p => p.dispose());
      if (output.current) output.current.dispose();
    };
  }, []);

  // 2. Sincronizar Volumen
  useEffect(() => {
    if (output.current) {
      output.current.volume.rampTo(Tone.gainToDb(warmLevel), 0.1);
    }
  }, [warmLevel]);

  // 3. Lógica de Disparo con Crossfade
  const handleKey = useCallback(async (note) => {
    if (Tone.context.state !== 'running') await Tone.start();

    if (activeKey === note) {
      // Detener actual
      players.current[note]?.stop();
      setActiveKey(null);
    } else {
      // Si hay una nota sonando, la detenemos con fadeOut (automático por el player)
      if (activeKey && players.current[activeKey]) {
        players.current[activeKey].stop(); 
      }
      
      // Iniciamos la nueva
      if (players.current[note]) {
        players.current[note].loop = isAmbient;
        players.current[note].start();
        setActiveKey(note);
      }
    }
  }, [activeKey, isAmbient]);

  const releaseAll = useCallback(() => {
    if (activeKey && players.current[activeKey]) {
      players.current[activeKey].stop();
      setActiveKey(null);
    }
  }, [activeKey]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.code === 'Escape') {
        releaseAll();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [releaseAll]);

  return (
    <div style={{
      background: 'linear-gradient(180deg, #080d1c 0%, #040810 100%)',
      borderTop: '1px solid rgba(34,211,238,0.10)',
      padding: '12px 20px 16px',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{
            width:'7px', height:'7px', borderRadius:'50%',
            background: activeKey ? '#a855f7' : 'rgba(255,255,255,0.12)',
            boxShadow: activeKey ? '0 0 12px #a855f7' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize:'0.62rem', fontWeight:'900', color:'rgba(255,255,255,0.6)', letterSpacing:'2px' }}>
            BETHEL PADS (WEB-ENGINE)
            <span style={{ 
              marginLeft: '10px', padding: '2px 6px', borderRadius: '4px', 
              background: 'rgba(255,255,255,0.05)', color: 'var(--daw-cyan)',
              fontSize: '0.5rem', border: '1px solid rgba(255,255,255,0.05)'
            }}>
              PITCH CORRECTED: {sampleRate / 1000}kHz
            </span>
          </span>
        </div>

        <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
          <button 
            onClick={() => setIsAmbient(!isAmbient)}
            style={{
              padding:'4px 10px', fontSize:'0.58rem', fontWeight:'900',
              border: isAmbient ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius:'4px', cursor:'pointer',
              background: 'rgba(255,255,255,0.05)',
              color: isAmbient ? '#ffffff' : 'rgba(255,255,255,0.3)',
              marginRight: '8px',
              textTransform: 'uppercase', letterSpacing: '1px'
            }}
          >
            {isAmbient ? 'MODO AMBIENTAL: ON' : 'MODO DISPARO'}
          </button>
          
          <span style={{ fontSize:'0.62rem', color:'var(--daw-cyan)', fontWeight:'700', minWidth:'40px', textAlign:'center', textShadow: '0 0 10px var(--daw-cyan)' }}>
            {activeKey || ''}
          </span>
        </div>
      </div>

      {/* Grid de Pads */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gap:'4px', marginBottom:'10px' }}>
        {NOTES.map(note => {
          const on = activeKey === note;
          const isLoaded = loadedPads[note];
          const sharp = note.includes('#');
          
          return (
            <button key={note} onClick={() => handleKey(note)} style={{
              padding:'12px 0',
              border:'1px solid',
              borderColor: on ? '#a855f7' : sharp ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)',
              borderRadius:'6px',
              cursor: isLoaded ? 'pointer' : 'wait',
              position: 'relative',
              fontFamily:'monospace', fontWeight:'900', fontSize:'0.75rem',
              transition:'all 0.14s',
              background: on
                ? 'linear-gradient(180deg, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0.1) 100%)'
                : sharp ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.055)',
              color: on ? '#ffffff' : sharp ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.65)',
              boxShadow: on ? '0 0 25px rgba(168,85,247,0.4)' : 'none',
              transform: on ? 'translateY(-1px)' : 'none',
              opacity: isLoaded ? 1 : 0.4
            }}>
              {note}
              {!isLoaded && <div className="loading-dot" style={{ position:'absolute', top:'3px', right:'3px', width:'4px', height:'4px', background:'#fbbf24', borderRadius:'50%' }} />}
            </button>
          );
        })}
      </div>

      <div style={{ display:'flex', gap:'18px', alignItems:'center', marginTop:'4px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
          <span style={{ fontSize:'0.57rem', fontWeight:'900', color:'#fff', letterSpacing:'1.5px', minWidth:'50px' }}>
            VOL. PAD
          </span>
          <input
            type="range" min="0" max="1" step="0.01" value={warmLevel}
            onChange={e => setWarmLevel(parseFloat(e.target.value))}
            style={{ width:'120px', height:'3px', accentColor: '#a855f7' }}
          />
        </div>
        
        {activeKey && (
          <button onClick={releaseAll} style={{
            marginLeft:'auto', padding:'4px 12px',
            fontSize:'0.62rem', fontWeight:'900', letterSpacing:'0.5px',
            border:'1px solid rgba(239,68,68,0.25)', borderRadius:'5px',
            background:'rgba(239,68,68,0.07)', color:'rgba(239,68,68,0.65)',
            cursor:'pointer'
          }}>
            SOLTAR TODO (ESC)
          </button>
        )}
      </div>
    </div>
  );
}
