import React, { useState, useEffect, useCallback, useRef } from 'react';
import { isTauri, safeInvoke } from '../../utils/tauri';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Mapa de nota → nombre de archivo en el bundle Tauri (src-tauri/resources/audio/pads/)
const NOTE_TO_BUNDLE_FILE = {
  'C': 'C', 'C#': 'C#', 'D': 'D', 'D#': 'D#',
  'E': 'E', 'F': 'F', 'F#': 'F#', 'G': 'G',
  'G#': 'G#', 'A': 'A', 'A#': 'A#', 'B': 'B',
};

// Mapa de nota → nombre de archivo en src/assets (Vite, sin #)
const NOTE_TO_VITE_FILE = {
  'C': 'C', 'C#': 'Csharp', 'D': 'D', 'D#': 'Dsharp',
  'E': 'E', 'F': 'F', 'F#': 'Fsharp', 'G': 'G',
  'G#': 'Gsharp', 'A': 'A', 'A#': 'Asharp', 'B': 'B',
};

// pad_id que usa Rust internamente (sin # en el ID)
const noteToPadId = (note) => `bethel_pad_${note.replace('#', 'sharp').toLowerCase()}`;

// Fallback Web-Engine
let toneModule = null;
const getTone = async () => {
  if (!toneModule) toneModule = await import('tone');
  return toneModule;
};

export default function PadBoard({ deviceChannels = 2, sampleRate = 44100 }) {
  const [activeKey, setActiveKey] = useState(null);
  const [loadedPads, setLoadedPads] = useState({});
  const [warmLevel, setWarmLevel] = useState(() => parseFloat(localStorage.getItem('bandly_pad_volume') || '0.7'));
  const [isAmbient, setIsAmbient] = useState(true);
  const [padOutput, setPadOutput] = useState(() => parseInt(localStorage.getItem('bandly_pad_output') || '0'));
  const [engineMode, setEngineMode] = useState('loading'); // 'rust' | 'web'
  const [statusMsg, setStatusMsg] = useState('Inicializando...');

  const webPlayers = useRef({});
  const webOutput = useRef(null);

  // ─── Inicialización ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isTauri()) {
      setEngineMode('rust');
      loadRustPads();
    } else {
      setEngineMode('web');
      loadWebPads();
    }
    return () => {
      Object.values(webPlayers.current).forEach(p => { try { p.dispose(); } catch(e){} });
      if (webOutput.current) { try { webOutput.current.dispose(); } catch(e){} }
    };
  }, []);

  // ─── RUST ENGINE ─────────────────────────────────────────────────────────────
  // Flujo:
  //  1. Rust intenta copiar el pad desde el bundle (resource_dir) → app_local_data_dir/pads/
  //  2. Si no encuentra en el bundle, usa la URL que le pasa JS (asset:// de Vite) como fallback HTTP
  //  3. Siempre devuelve la ruta local desde donde symphonia puede leer
  // ─── RUST ENGINE ─────────────────────────────────────────────────────────────
  const loadRustPads = async () => {
    setStatusMsg('Cargando pads...');
    try {
      const loadedIds = await safeInvoke('load_pads_from_assets');
      
      const results = {};
      NOTES.forEach(note => {
        const padId = noteToPadId(note);
        results[note] = (loadedIds || []).includes(padId);
      });

      setLoadedPads(results);
      const count = (loadedIds || []).length;
      setStatusMsg(count > 0 ? `RUST ENGINE · ${count}/12 ✓` : 'Error: No se encontraron archivos');
    } catch (err) {
      console.error('[PadBoard/Rust] Error:', err);
      setStatusMsg('Error de conexión con el motor');
      setEngineMode('web'); // Fallback si Rust falla totalmente
      loadWebPads();
    }
  };

  // ─── WEB ENGINE: Fallback con Tone.js (solo en desarrollo/browser) ───────────
  const loadWebPads = async () => {
    setStatusMsg('Cargando pads (Web)...');
    const Tone = await getTone();
    webOutput.current = new Tone.Volume(Tone.gainToDb(warmLevel)).toDestination();
    let loaded = 0;
    for (const note of NOTES) {
      try {
        const safeNote = note.replace('#', 'sharp');
        const url = new URL(`../../assets/audio/pads/${safeNote}.mp3`, import.meta.url).href;
        await new Promise((resolve) => {
          const player = new Tone.Player({
            url, loop: true, fadeIn: 1.5, fadeOut: 1.5,
            onload: () => {
              setLoadedPads(prev => ({ ...prev, [note]: true }));
              loaded++;
              resolve();
            },
            onerror: () => {
              setLoadedPads(prev => ({ ...prev, [note]: false }));
              resolve();
            }
          }).connect(webOutput.current);
          webPlayers.current[note] = player;
        });
      } catch(e) {
        setLoadedPads(prev => ({ ...prev, [note]: false }));
      }
    }
    setStatusMsg(`WEB ENGINE · ${loaded}/12 pads`);
  };

  // ─── Sincronizar volumen ─────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('bandly_pad_volume', warmLevel);
    if (engineMode === 'rust') {
      NOTES.forEach(note => {
        safeInvoke('set_pad_volume', { padId: noteToPadId(note), volume: warmLevel }).catch(() => {});
      });
    } else if (engineMode === 'web' && webOutput.current) {
      getTone().then(Tone => webOutput.current.volume.rampTo(Tone.gainToDb(warmLevel), 0.1));
    }
  }, [warmLevel, engineMode]);

  // ─── Sincronizar salida de pads al motor Rust ────────────────────────────────
  useEffect(() => {
    localStorage.setItem('bandly_pad_output', padOutput);
    if (engineMode === 'rust') {
      NOTES.forEach(note => {
        safeInvoke('set_pad_output', { padId: noteToPadId(note), outputIdx: padOutput }).catch(() => {});
      });
    }
  }, [padOutput, engineMode]);

  // ─── Disparo ─────────────────────────────────────────────────────────────────
  const handleKey = useCallback(async (note) => {
    const padId = noteToPadId(note);

    if (engineMode === 'rust') {
      if (activeKey === note) {
        await safeInvoke('stop_pad', { padId }).catch(() => {});
        setActiveKey(null);
      } else {
        if (activeKey) {
          await safeInvoke('stop_pad', { padId: noteToPadId(activeKey) }).catch(() => {});
        }
        await safeInvoke('trigger_pad', { padId, isLoop: isAmbient }).catch(() => {});
        setActiveKey(note);
      }
    } else {
      const Tone = await getTone();
      if (Tone.context.state !== 'running') await Tone.start();
      if (activeKey === note) {
        webPlayers.current[note]?.stop();
        setActiveKey(null);
      } else {
        if (activeKey && webPlayers.current[activeKey]) webPlayers.current[activeKey].stop();
        if (webPlayers.current[note]) {
          webPlayers.current[note].loop = isAmbient;
          webPlayers.current[note].start();
          setActiveKey(note);
        }
      }
    }
  }, [activeKey, isAmbient, engineMode]);

  const releaseAll = useCallback(async () => {
    if (activeKey) {
      if (engineMode === 'rust') {
        await safeInvoke('stop_pad', { padId: noteToPadId(activeKey) }).catch(() => {});
      } else if (webPlayers.current[activeKey]) {
        webPlayers.current[activeKey].stop();
      }
      setActiveKey(null);
    }
  }, [activeKey, engineMode]);

  useEffect(() => {
    const down = (e) => { if (e.code === 'Escape') releaseAll(); };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [releaseAll]);

  const isRust = engineMode === 'rust';

  return (
    <div style={{ background: 'linear-gradient(180deg, #080d1c 0%, #040810 100%)', borderTop: '1px solid rgba(34,211,238,0.10)', padding: '12px 20px 16px', userSelect: 'none', flexShrink: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: activeKey ? '#a855f7' : 'rgba(255,255,255,0.12)', boxShadow: activeKey ? '0 0 12px #a855f7' : 'none', transition: 'all 0.3s' }} />
          <span style={{ fontSize: '0.62rem', fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px' }}>
            BETHEL PADS
            <span style={{ marginLeft: '10px', padding: '2px 6px', borderRadius: '4px', background: isRust ? 'rgba(34,211,238,0.08)' : 'rgba(251,191,36,0.08)', color: isRust ? 'var(--daw-cyan)' : '#fbbf24', fontSize: '0.5rem', border: `1px solid ${isRust ? 'rgba(34,211,238,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
              {statusMsg}
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <button onClick={() => setIsAmbient(!isAmbient)} style={{ padding: '4px 10px', fontSize: '0.58rem', fontWeight: '900', border: isAmbient ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: isAmbient ? '#ffffff' : 'rgba(255,255,255,0.3)', marginRight: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isAmbient ? 'AMBIENTAL: ON' : 'MODO DISPARO'}
          </button>
          <span style={{ fontSize: '0.62rem', color: 'var(--daw-cyan)', fontWeight: '700', minWidth: '40px', textAlign: 'center', textShadow: '0 0 10px var(--daw-cyan)' }}>{activeKey || ''}</span>
        </div>
      </div>

      {/* Pads */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4px', marginBottom: '10px' }}>
        {NOTES.map(note => {
          const on = activeKey === note;
          const sharp = note.includes('#');
          const isLoaded = loadedPads[note];
          return (
            <button key={note} onClick={() => handleKey(note)} style={{ padding: '12px 0', border: '1px solid', borderColor: on ? '#a855f7' : sharp ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)', borderRadius: '6px', cursor: 'pointer', position: 'relative', fontFamily: 'monospace', fontWeight: '900', fontSize: '0.75rem', transition: 'all 0.14s', background: on ? 'linear-gradient(180deg, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0.1) 100%)' : sharp ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.055)', color: on ? '#ffffff' : sharp ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.65)', boxShadow: on ? '0 0 25px rgba(168,85,247,0.4)' : 'none', transform: on ? 'translateY(-1px)' : 'none', opacity: isLoaded === false ? 0.35 : 1 }}>
              {note}
              {isLoaded === false && <div style={{ position: 'absolute', top: '3px', right: '3px', width: '4px', height: '4px', background: '#ef4444', borderRadius: '50%' }} />}
              {isLoaded === undefined && <div style={{ position: 'absolute', top: '3px', right: '3px', width: '4px', height: '4px', background: '#fbbf24', borderRadius: '50%', animation: 'pulse 1s infinite' }} />}
            </button>
          );
        })}
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '0.57rem', fontWeight: '900', color: '#fff', letterSpacing: '1.5px', minWidth: '50px' }}>VOL. PAD</span>
          <input type="range" min="0" max="1" step="0.01" value={warmLevel} onChange={e => setWarmLevel(parseFloat(e.target.value))} style={{ width: '120px', height: '3px', accentColor: '#a855f7' }} />
        </div>

        {activeKey && (
          <button onClick={releaseAll} style={{ padding: '4px 12px', fontSize: '0.62rem', fontWeight: '900', letterSpacing: '0.5px', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '5px', background: 'rgba(239,68,68,0.07)', color: 'rgba(239,68,68,0.65)', cursor: 'pointer' }}>
            SOLTAR (ESC)
          </button>
        )}

        {/* Selector de salida: siempre visible, activo solo en RUST mode */}
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'auto', minWidth: '80px' }}>
          <span style={{ fontSize: '0.45rem', fontWeight: '900', color: isRust ? 'var(--daw-cyan)' : 'rgba(255,255,255,0.25)', letterSpacing: '1px' }}>OUT PADS</span>
          <select
            title="Salida Física de Pads"
            value={padOutput}
            disabled={!isRust}
            onChange={e => setPadOutput(parseInt(e.target.value))}
            style={{ background: 'transparent', border: 'none', color: isRust ? 'white' : 'rgba(255,255,255,0.25)', fontWeight: '900', fontSize: '0.7rem', outline: 'none', cursor: isRust ? 'pointer' : 'not-allowed', padding: 0 }}
          >
            {[...Array(Math.max(1, Math.floor(deviceChannels / 2)))].map((_, i) => (
              <option key={i} value={i} style={{ background: '#0f172a', color: 'white' }}>OUT {i * 2 + 1}/{i * 2 + 2}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
