import React, { useState, useEffect, useCallback } from 'react';
import { resolveResource } from '@tauri-apps/api/path';
import { safeInvoke, isTauri } from '../../utils/tauri';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE NOTAS
// ─────────────────────────────────────────────────────────────────────────────
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PADBOARD (Versión Nativa Rust + Recursos Tauri)
// ─────────────────────────────────────────────────────────────────────────────
export default function PadBoard() {
  const [activeKey, setActiveKey] = useState(null);
  const [chordMode, setChordMode] = useState('MAJ');
  const [warmLevel, setWarmLevel] = useState(0.85); // Volumen Maestro Papds
  const [octave, setOctave] = useState(4);
  const [isAmbient, setIsAmbient] = useState(true);

  // 1. Carga de Samples usando resolveResource (Seguridad en Producción)
  useEffect(() => {
    if (!isTauri()) return;

    const loadPads = async () => {
      for (const note of NOTES) {
          try {
            const mp3Path = await resolveResource(`resources/audio/pads/${note}.mp3`);
            await safeInvoke('load_pad_sample', { padId: note, filePath: mp3Path });
          } catch (err) {
            console.warn(`[PadBoard] No se pudo cargar el pad ${note}:`, err);
          }
      }
    };

    loadPads();
  }, []);

  // 2. Control de Volumen en Tiempo Real
  useEffect(() => {
    if (isTauri()) {
      NOTES.forEach(note => {
        safeInvoke('set_pad_volume', { padId: note, volume: warmLevel });
      });
    }
  }, [warmLevel]);

  // 3. Disparador de Pads (Nativo)
  const handleKey = useCallback(async (note) => {
    if (!isTauri()) return;

    if (activeKey === note) {
      // Toggle OFF
      await safeInvoke('stop_pad', { padId: note });
      setActiveKey(null);
    } else {
      // Toggle ON (Apagamos el anterior si existe)
      if (activeKey) {
        await safeInvoke('stop_pad', { padId: activeKey });
      }

      await safeInvoke('trigger_pad', { padId: note, isLoop: isAmbient });
      setActiveKey(note);
    }
  }, [activeKey, isAmbient]);

  const releaseAll = async () => {
    if (!isTauri() || !activeKey) return;
    await safeInvoke('stop_pad', { padId: activeKey });
    setActiveKey(null);
  };

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
            background: activeKey ? '#22d3ee' : 'rgba(255,255,255,0.12)',
            boxShadow: activeKey ? '0 0 8px #22d3ee' : 'none',
            transition: 'all 0.3s',
          }} />
          <span style={{ fontSize:'0.62rem', fontWeight:'900', color:'rgba(255,255,255,0.45)', letterSpacing:'2px' }}>
            BETHEL PADS (NATIVO)
          </span>
        </div>

        {/* Controles */}
        <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
          <button 
            onClick={() => setIsAmbient(!isAmbient)}
            style={{
              padding:'3px 7px', fontSize:'0.58rem', fontWeight:'900',
              border:'none', borderRadius:'4px', cursor:'pointer',
              background: isAmbient ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.04)',
              color: isAmbient ? '#22d3ee' : 'rgba(255,255,255,0.35)',
              marginRight: '8px'
            }}
          >
            {isAmbient ? 'MODO LOOP: ON' : 'MODO DISPARO'}
          </button>
          
          {['MAJ','MIN','SUS2','SUS4'].map(m => (
            <button key={m} onClick={() => setChordMode(m)} style={{
              padding:'3px 7px', fontSize:'0.58rem', fontWeight:'900', letterSpacing:'0.5px',
              border:'none', borderRadius:'4px', cursor:'pointer',
              background: chordMode===m ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.04)',
              color: chordMode===m ? '#fff' : 'rgba(255,255,255,0.35)',
              boxShadow: chordMode===m ? '0 0 8px rgba(99,102,241,0.35)' : 'none',
              transition:'all 0.15s',
            }}>{m}</button>
          ))}
          <div style={{ width:'1px', height:'14px', background:'rgba(255,255,255,0.07)', margin:'0 3px' }} />
          <button onClick={() => setOctave(o => Math.max(3,o-1))} style={octBtn}>−</button>
          <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.45)', fontWeight:'700', minWidth:'22px', textAlign:'center' }}>
            C{octave}
          </span>
          <button onClick={() => setOctave(o => Math.min(5,o+1))} style={octBtn}>+</button>
        </div>
      </div>

      {/* Botones de Notas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gap:'4px', marginBottom:'10px' }}>
        {NOTES.map(note => {
          const on = activeKey === note;
          const sharp = note.includes('#') || note.includes('b');
          return (
            <button key={note} onClick={() => handleKey(note)} style={{
              padding:'10px 0',
              border:'1px solid',
              borderColor: on ? '#22d3ee' : sharp ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)',
              borderRadius:'6px',
              cursor:'pointer',
              fontFamily:'monospace', fontWeight:'900', fontSize:'0.72rem',
              transition:'all 0.14s',
              background: on
                ? 'linear-gradient(180deg, rgba(34,211,238,0.22) 0%, rgba(34,211,238,0.06) 100%)'
                : sharp ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.055)',
              color: on ? '#22d3ee' : sharp ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.65)',
              boxShadow: on ? '0 0 16px rgba(34,211,238,0.28), inset 0 0 8px rgba(34,211,238,0.04)' : 'none',
              transform: on ? 'translateY(-1px)' : 'none',
            }}>
              {note}
            </button>
          );
        })}
      </div>

      {/* Footer Sliders */}
      <div style={{ display:'flex', gap:'18px', alignItems:'center', marginTop:'4px' }}>
        <Slider label="VOL. PAD" color="#f97316" value={warmLevel} onChange={setWarmLevel} />
        {activeKey && (
          <button
            onClick={releaseAll}
            style={{
              marginLeft:'auto', padding:'4px 12px',
              fontSize:'0.62rem', fontWeight:'900', letterSpacing:'0.5px',
              border:'1px solid rgba(239,68,68,0.25)', borderRadius:'5px',
              background:'rgba(239,68,68,0.07)', color:'rgba(239,68,68,0.65)',
              cursor:'pointer', transition:'all 0.15s',
            }}
          >
            SOLTAR
          </button>
        )}
      </div>
    </div>
  );
}

const octBtn = {
  width:'19px', height:'19px', borderRadius:'4px', border:'none',
  background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.45)',
  cursor:'pointer', fontSize:'0.8rem', fontWeight:'700',
  display:'flex', alignItems:'center', justifyContent:'center',
};

function Slider({ label, color, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
      <span style={{ fontSize:'0.57rem', fontWeight:'900', color, letterSpacing:'1.5px', minWidth:'50px' }}>
        {label}
      </span>
      <input
        type="range" min="0" max="1" step="0.01" value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:'85px', height:'3px', accentColor: color }}
      />
      <span style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.28)', minWidth:'26px' }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
